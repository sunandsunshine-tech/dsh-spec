import { createHash } from 'node:crypto'
import { closeSync, lstatSync, readSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, relative, sep } from 'node:path'

import {
  MODEL_EVIDENCE_LIMITS,
  assertNoSymlinkComponents,
  openRegularFileNoFollow,
  readFileNoFollowLimited,
} from './runner-safety.mjs'

export const EVIDENCE_CLAIM_TYPES = Object.freeze(['mechanical', 'behavior', 'trigger', 'comparison'])
export const MODEL_EVIDENCE_ARMS = Object.freeze(['target-present', 'target-absent'])
export const DEFAULT_MODEL_DEADLINE_MS = 30 * 60 * 1000
export const MAX_MODEL_DEADLINE_MS = 2_147_483_647
export const MAX_EVIDENCE_METADATA_BYTES = 256 * 1024

const privacyCanarySets = new Map([
  // These are generic environment prefixes, not a current contributor's identity.
  ['local-environment', Object.freeze(['/mnt/c/Users/', '/home/conda'])],
  [
    'private-performance-corpus',
    Object.freeze([
      'ALICE-SECRET-9182',
      'alice@example.com',
      '/home/alice/private/order.txt',
      'session-alice-private',
      'BOB-SECRET-7712',
      '/home/bob/cart.json',
      'bob@example.net',
      'session-bob-private',
      'CAROL-SECRET-4431',
      'sk-carol-not-real',
      'carol@example.org',
      'session-carol-private',
      '/mnt/private/dave/catalog.csv',
      'DAVE-SECRET-5540',
      'dave@example.com',
      'session-dave-private',
      'EVE-SECRET-2210',
      'eve@example.com',
      'session-eve-private',
      '/home/frank/private/orders.ndjson',
      'FRANK-SECRET-6630',
      'frank@example.net',
      'session-frank-private',
      'GRACE-SECRET-8854',
      'grace@example.org',
      'session-grace-private',
      'HEIDI-SECRET-1129',
      '/home/heidi/desktop/report.pdf',
      'heidi@example.com',
      'session-heidi-private',
      'IVAN-SECRET-3399',
      '4111111111111111',
      'ivan@example.net',
      'session-ivan-private',
      'JUDY-SECRET-7710',
      '/home/judy/private/notes.md',
      'judy@example.org',
      'session-judy-private',
    ]),
  ],
])

const scenarioPrivacyCanarySets = new Map([
  [
    'dsh-spec-performance-investigation:private-corpus-remains-aggregate',
    Object.freeze(['private-performance-corpus']),
  ],
])

const hashPattern = /^[0-9a-f]{64}$/
const subjectPattern = /^dsh-spec-[a-z0-9-]+:[a-z0-9-]+$/

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`)
}

function assertHash(value, label) {
  if (typeof value !== 'string' || !hashPattern.test(value)) throw new Error(`${label} must be a SHA-256 hash`)
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a non-empty array`)
  for (const entry of value) assertNonEmptyString(entry, label)
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const fields = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    return `{${fields.join(',')}}`
  }
  return JSON.stringify(value)
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function scenarioDefinitionHash(scenario) {
  return sha256(canonicalJson(scenario))
}

export function remainingRunDeadline(deadlineAt, now = performance.now()) {
  if (!Number.isFinite(deadlineAt) || !Number.isFinite(now)) throw new Error('run deadline must be finite')
  const remaining = Math.ceil(deadlineAt - now)
  if (remaining <= 0) throw new Error('run exceeded its deadline')
  return remaining
}

function normalizeComparison(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('comparison claim must be an object')
  }
  if (value.baseline !== 'target-absent') throw new Error('a comparison baseline must be target-absent')
  if (value.candidate !== 'target-present') throw new Error('a comparison candidate must be target-present')
  assertStringArray(value.conditions, 'comparison conditions')
  return {
    baseline: value.baseline,
    candidate: value.candidate,
    conditions: [...value.conditions],
  }
}

export function claimForScenario(skill, scenario) {
  assertNonEmptyString(skill, 'skill')
  assertNonEmptyString(scenario?.id, 'scenario id')
  const comparison = scenario.comparison === undefined ? undefined : normalizeComparison(scenario.comparison)
  if (comparison === undefined) {
    return {
      type: 'behavior',
      subject: `${skill}:${scenario.id}`,
      comparison: null,
    }
  }
  const normalized = normalizeComparison(comparison)
  return {
    type: 'comparison',
    subject: `${skill}:${scenario.id}`,
    comparison: {
      ...normalized,
      conditionsSha256: sha256(canonicalJson(normalized.conditions)),
    },
  }
}

export function validateScenarioClaim(skill, scenario) {
  if (scenario.comparison !== undefined) {
    if (!scenario.comparison || typeof scenario.comparison !== 'object' || Array.isArray(scenario.comparison)) {
      throw new Error('scenario comparison must be an object')
    }
    const known = new Set(['baseline', 'candidate', 'conditions'])
    for (const key of Object.keys(scenario.comparison)) {
      if (!known.has(key)) throw new Error(`unknown scenario comparison field: ${key}`)
    }
  }
  return claimForScenario(skill, scenario)
}

export function validateModelArm(claim, arm) {
  if (!MODEL_EVIDENCE_ARMS.includes(arm)) throw new Error(`unknown evidence arm: ${String(arm)}`)
  if (!['behavior', 'comparison'].includes(claim?.type)) {
    throw new Error(`model evidence cannot carry a ${String(claim?.type)} claim`)
  }
  if (arm === 'target-absent') {
    if (claim.type !== 'comparison') {
      throw new Error('a target-absent arm is valid only for a comparison claim')
    }
    if (claim.comparison?.baseline !== 'target-absent') {
      throw new Error('the comparison claim does not declare a target-absent baseline')
    }
  }
  if (claim.type === 'comparison' && arm === 'target-present' && claim.comparison?.candidate !== 'target-present') {
    throw new Error('the comparison claim does not declare a target-present candidate')
  }
  return arm
}

export function modelPromptComponents(skill, scenario, arm) {
  const claim = claimForScenario(skill, scenario)
  validateModelArm(claim, arm)
  assertNonEmptyString(scenario?.prompt, 'scenario prompt')
  if (scenario.allow_subagents !== undefined && typeof scenario.allow_subagents !== 'boolean') {
    throw new Error('scenario allow_subagents must be a boolean')
  }
  const armInstruction =
    arm === 'target-present' ? `Use the installed skill at .agents/skills/${skill}/SKILL.md for this task. ` : ''
  const subagentInstruction = scenario.allow_subagents ? 'You may spawn subagents.' : 'Do not spawn subagents.'
  const promptGuard = `Work only inside the current project. ${subagentInstruction} Do not read outside this project.`
  return {
    scenarioPrompt: scenario.prompt,
    armInstruction,
    promptGuard,
    renderedPrompt: `${scenario.prompt}\n\n${armInstruction}${promptGuard}`,
  }
}

export function privacyCanarySetsFor(skill, scenarioId) {
  const sets = ['local-environment']
  for (const name of scenarioPrivacyCanarySets.get(`${skill}:${scenarioId}`) ?? []) {
    if (!sets.includes(name)) sets.push(name)
  }
  return sets
}

export function requiredPrivacyCanarySetsFor(skill, scenarioId) {
  return [...new Set([...privacyCanarySetsFor(skill, scenarioId), 'current-home'])].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  )
}

export function privacyCanariesFor(skill, scenarioId, { includeCurrentHome = false, currentHome = homedir() } = {}) {
  const canaries = []
  for (const setName of privacyCanarySetsFor(skill, scenarioId)) {
    for (const value of privacyCanarySets.get(setName) ?? []) {
      canaries.push({ set: setName, value })
    }
  }
  if (includeCurrentHome) canaries.push({ set: 'current-home', value: currentHome })
  return canaries
}

export function allPrivacyCanaries({ currentHome = homedir() } = {}) {
  return [
    ...[...privacyCanarySets].flatMap(([set, values]) => values.map((value) => ({ set, value }))),
    { set: 'current-home', value: currentHome },
  ]
}

function canonicalPrivacyScope(canaries) {
  assertCanaryList(canaries)
  return canaries
    .map((canary) => ({ set: canary.set, value: canary.value }))
    .sort((left, right) => {
      const leftKey = `${left.set}\0${left.value}`
      const rightKey = `${right.set}\0${right.value}`
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
    })
}

export function privacyScopeSha256(canaries) {
  return sha256(canonicalJson(canonicalPrivacyScope(canaries)))
}

export function assertPrivacyScope(privacy, canaries, { skill, scenarioId, currentHome = homedir() } = {}) {
  assertNonEmptyString(skill, 'privacy scope skill')
  assertNonEmptyString(scenarioId, 'privacy scope scenario id')
  const scope = canonicalPrivacyScope(canaries)
  const canarySets = [...new Set(scope.map((canary) => canary.set))].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  )
  const requiredSets = requiredPrivacyCanarySetsFor(skill, scenarioId)
  if (canarySets.join('\0') !== requiredSets.join('\0')) {
    throw new Error('privacy canary scope differs from the subject-required sets')
  }
  const expected = canonicalPrivacyScope(
    privacyCanariesFor(skill, scenarioId, { includeCurrentHome: true, currentHome }),
  )
  if (canonicalJson(scope) !== canonicalJson(expected)) {
    throw new Error('privacy canary scope differs from the subject-required values')
  }
  assertStringArray(privacy?.canary_sets, 'privacy canary sets')
  if (privacy.canary_sets.join('\0') !== canarySets.join('\0')) {
    throw new Error('recorded privacy canary sets differ from the supplied scope')
  }
  assertHash(privacy.scope_sha256, 'privacy scope sha256')
  if (privacy.scope_sha256 !== privacyScopeSha256(scope)) {
    throw new Error('recorded privacy scope differs from the supplied canaries')
  }
  return privacy
}

export function createModelEvidenceMetadata({
  skill,
  scenario,
  arm,
  scenarioSha256,
  inputManifestSha256,
  targetSkillTreeSha256,
  dependencySkillTreeSha256,
  prompt,
  armInstruction = '',
  promptGuard = 'Work only inside the current project.',
  currentHome = homedir(),
  privacyCanaries = privacyCanariesFor(skill, scenario.id, { includeCurrentHome: true, currentHome }),
  counterpartEvidenceSha256 = null,
  execution,
  deadlineMs = DEFAULT_MODEL_DEADLINE_MS,
}) {
  const claim = claimForScenario(skill, scenario)
  validateModelArm(claim, arm)
  assertHash(scenarioSha256, 'scenario sha256')
  assertHash(inputManifestSha256, 'input manifest sha256')
  assertHash(dependencySkillTreeSha256, 'dependency skill tree sha256')
  assertNonEmptyString(scenario.prompt, 'scenario prompt')
  assertNonEmptyString(prompt, 'rendered prompt')
  if (typeof armInstruction !== 'string') throw new Error('arm instruction must be text')
  assertNonEmptyString(promptGuard, 'prompt guard')
  if (prompt !== `${scenario.prompt}\n\n${armInstruction}${promptGuard}`) {
    throw new Error('rendered prompt does not match its scenario, arm instruction and guard')
  }
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0 || deadlineMs > MAX_MODEL_DEADLINE_MS) {
    throw new Error(`deadline_ms must be an integer from 1 to ${MAX_MODEL_DEADLINE_MS}`)
  }
  if (counterpartEvidenceSha256 !== null) assertHash(counterpartEvidenceSha256, 'counterpart evidence sha256')
  if (arm === 'target-absent' && counterpartEvidenceSha256 === null) {
    throw new Error('a target-absent comparison arm requires counterpart evidence')
  }
  if (arm === 'target-absent') {
    if (targetSkillTreeSha256 !== null) throw new Error('a target-absent arm cannot record a target skill tree')
  } else {
    assertHash(targetSkillTreeSha256, 'target skill tree sha256')
  }
  validateExecutionProfile(execution)
  assertCanaryList(privacyCanaries)
  const canarySets = [...new Set(privacyCanaries.map((canary) => canary.set))].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  )
  assertStringArray(canarySets, 'privacy canary sets')
  const requiredSets = requiredPrivacyCanarySetsFor(skill, scenario.id)
  if (canarySets.join('\0') !== requiredSets.join('\0')) {
    throw new Error('privacy canary sets differ from the subject-required sets')
  }
  const expectedCanaries = canonicalPrivacyScope(
    privacyCanariesFor(skill, scenario.id, { includeCurrentHome: true, currentHome }),
  )
  if (canonicalJson(canonicalPrivacyScope(privacyCanaries)) !== canonicalJson(expectedCanaries)) {
    throw new Error('privacy canary scan differs from the subject-required values')
  }
  const privacyScopeHash = privacyScopeSha256(privacyCanaries)
  const normalizedExecution = {
    auth: execution.auth,
    browser: execution.browser,
    media: execution.media,
    model_config_sha256: execution.model_config_sha256,
    model_runtime_sha256: execution.model_runtime_sha256,
    sandbox: execution.sandbox,
    subagents: execution.subagents,
  }

  const currentness = {
    scenario_sha256: scenarioSha256,
    input_manifest_sha256: inputManifestSha256,
    scenario_prompt_sha256: sha256(scenario.prompt),
    arm_instruction_sha256: sha256(armInstruction),
    prompt_guard_sha256: sha256(promptGuard),
    rendered_prompt_sha256: sha256(prompt),
    execution_sha256: sha256(canonicalJson(normalizedExecution)),
  }
  if (claim.type === 'comparison') {
    currentness.comparison_conditions_sha256 = claim.comparison.conditionsSha256
  }
  return {
    schema_version: 1,
    claim: {
      type: claim.type,
      subject: claim.subject,
    },
    arm,
    comparison:
      claim.type === 'comparison'
        ? {
            baseline: claim.comparison.baseline,
            candidate: claim.comparison.candidate,
            conditions_sha256: claim.comparison.conditionsSha256,
            counterpart_evidence_sha256: claim.type === 'comparison' ? counterpartEvidenceSha256 : null,
            pair_status:
              claim.type === 'comparison' ? (counterpartEvidenceSha256 === null ? 'candidate-only' : 'paired') : null,
          }
        : null,
    evidence: {
      kind: 'model',
      currentness,
    },
    execution: normalizedExecution,
    provenance: {
      target_skill_tree_sha256: targetSkillTreeSha256,
      dependency_skill_tree_sha256: dependencySkillTreeSha256,
    },
    deadline_ms: deadlineMs,
    privacy: {
      canary_sets: canarySets,
      scope_sha256: privacyScopeHash,
      surfaces: 'all-retained-files',
    },
  }
}

function validateExecutionProfile(execution) {
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) {
    throw new Error('evidence execution profile must be an object')
  }
  for (const key of ['auth', 'sandbox']) assertNonEmptyString(execution[key], `execution ${key}`)
  assertHash(execution.model_config_sha256, 'execution model_config_sha256')
  assertHash(execution.model_runtime_sha256, 'execution model_runtime_sha256')
  if (!['read-only', 'workspace-write'].includes(execution.sandbox)) {
    throw new Error('evidence sandbox must be read-only or workspace-write')
  }
  for (const key of ['browser', 'media', 'subagents']) {
    if (typeof execution[key] !== 'boolean') throw new Error(`evidence execution ${key} must be boolean`)
  }
  return execution
}

export function validateEvidenceMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('evidence metadata must be an object')
  }
  if (metadata.schema_version !== 1) throw new Error('unsupported evidence metadata schema version')
  if (!EVIDENCE_CLAIM_TYPES.includes(metadata.claim?.type))
    throw new Error('evidence metadata has an unknown claim type')
  assertNonEmptyString(metadata.claim.subject, 'evidence claim subject')
  if (!subjectPattern.test(metadata.claim.subject)) throw new Error('evidence claim subject is malformed')
  if (metadata.claim.type === 'trigger') {
    if (metadata.arm !== null) throw new Error('trigger evidence does not use a model-run arm')
  } else if (!MODEL_EVIDENCE_ARMS.includes(metadata.arm)) {
    throw new Error('evidence metadata has an unknown arm')
  }
  if (
    !Number.isSafeInteger(metadata.deadline_ms) ||
    metadata.deadline_ms <= 0 ||
    metadata.deadline_ms > MAX_MODEL_DEADLINE_MS
  ) {
    throw new Error(`evidence metadata deadline_ms must be an integer from 1 to ${MAX_MODEL_DEADLINE_MS}`)
  }
  if (metadata.evidence?.kind !== 'model') throw new Error('evidence metadata kind must be model')
  validateExecutionProfile(metadata.execution)
  if (metadata.claim.type === 'mechanical')
    throw new Error('mechanical claims use deterministic tests, not model evidence')
  if (metadata.arm === 'target-absent' && metadata.claim.type !== 'comparison') {
    throw new Error('a target-absent arm is valid only for a comparison claim')
  }
  if (metadata.claim.type === 'behavior' && metadata.arm !== 'target-present') {
    throw new Error('behavior evidence requires the target-present arm')
  }
  if (metadata.claim.type === 'comparison') {
    if (metadata.comparison?.baseline !== 'target-absent') {
      throw new Error('comparison evidence must declare a target-absent baseline')
    }
    if (metadata.comparison?.candidate !== 'target-present') {
      throw new Error('comparison evidence must declare a target-present candidate')
    }
    assertHash(metadata.comparison.conditions_sha256, 'comparison conditions sha256')
    if (metadata.comparison.counterpart_evidence_sha256 !== null) {
      assertHash(metadata.comparison.counterpart_evidence_sha256, 'comparison counterpart evidence sha256')
    }
    if (metadata.arm === 'target-absent' && metadata.comparison.counterpart_evidence_sha256 === null) {
      throw new Error('a target-absent comparison arm requires counterpart evidence')
    }
    const expectedPairStatus = metadata.comparison.counterpart_evidence_sha256 === null ? 'candidate-only' : 'paired'
    if (metadata.comparison.pair_status !== expectedPairStatus) {
      throw new Error('comparison pair_status disagrees with counterpart evidence')
    }
  } else if (metadata.comparison !== null) {
    throw new Error('only comparison evidence carries comparison metadata')
  }

  const currentness = metadata.evidence.currentness
  if (!currentness || typeof currentness !== 'object' || Array.isArray(currentness)) {
    throw new Error('evidence currentness must be an object')
  }
  if (metadata.claim.type === 'trigger') {
    assertHash(currentness.trigger_surface_sha256, 'trigger surface sha256')
    assertHash(currentness.trigger_corpus_sha256, 'trigger corpus sha256')
  } else {
    assertHash(currentness.scenario_sha256, 'scenario sha256')
    assertHash(currentness.input_manifest_sha256, 'input manifest sha256')
    assertHash(currentness.scenario_prompt_sha256, 'scenario prompt sha256')
    assertHash(currentness.arm_instruction_sha256, 'arm instruction sha256')
    assertHash(currentness.prompt_guard_sha256, 'prompt guard sha256')
    assertHash(currentness.rendered_prompt_sha256, 'rendered prompt sha256')
    assertHash(currentness.execution_sha256, 'execution sha256')
    if (currentness.execution_sha256 !== sha256(canonicalJson(metadata.execution))) {
      throw new Error('execution profile hash disagrees with its metadata')
    }
    if (!metadata.provenance || typeof metadata.provenance !== 'object' || Array.isArray(metadata.provenance)) {
      throw new Error('model evidence provenance must be an object')
    }
    assertHash(metadata.provenance.dependency_skill_tree_sha256, 'dependency skill tree sha256')
    if (metadata.arm === 'target-absent') {
      if (metadata.provenance.target_skill_tree_sha256 !== null) {
        throw new Error('a target-absent arm must record no target skill tree')
      }
    } else {
      assertHash(metadata.provenance.target_skill_tree_sha256, 'target skill tree sha256')
    }
    if (metadata.claim.type === 'comparison') {
      assertHash(currentness.comparison_conditions_sha256, 'comparison conditions currentness sha256')
      if (currentness.comparison_conditions_sha256 !== metadata.comparison.conditions_sha256) {
        throw new Error('comparison condition hashes disagree')
      }
    }
  }

  assertStringArray(metadata.privacy?.canary_sets, 'privacy canary sets')
  const [skill, scenarioId] = metadata.claim.subject.split(':')
  const requiredSets = requiredPrivacyCanarySetsFor(skill, scenarioId)
  if (metadata.privacy.canary_sets.join('\0') !== requiredSets.join('\0'))
    throw new Error('privacy canary sets differ from the subject-required sets')
  assertHash(metadata.privacy.scope_sha256, 'privacy scope sha256')
  if (metadata.privacy.surfaces !== 'all-retained-files') {
    throw new Error('privacy canaries must cover all retained files')
  }
  return metadata
}

export function compareEvidenceCurrentness(metadata, observed) {
  validateEvidenceMetadata(metadata)
  if (!observed || typeof observed !== 'object' || Array.isArray(observed)) {
    throw new Error('observed evidence identity must be an object')
  }
  const currentness = metadata.evidence.currentness
  const keys =
    metadata.claim.type === 'trigger'
      ? ['trigger_surface_sha256', 'trigger_corpus_sha256']
      : [
          'scenario_sha256',
          'input_manifest_sha256',
          'scenario_prompt_sha256',
          'arm_instruction_sha256',
          'prompt_guard_sha256',
          'rendered_prompt_sha256',
          'execution_sha256',
          ...(metadata.claim.type === 'comparison' ? ['comparison_conditions_sha256'] : []),
        ]
  const reasons = []
  for (const key of keys) {
    const expected = currentness[key]
    const actual = observed[key]
    try {
      assertHash(actual, `observed ${key}`)
    } catch {
      reasons.push(key)
      continue
    }
    if (actual !== expected) reasons.push(key)
  }
  return {
    current: reasons.length === 0,
    reasons,
  }
}

export function compareEvidenceProvenance(metadata, observed) {
  validateEvidenceMetadata(metadata)
  if (!observed || typeof observed !== 'object' || Array.isArray(observed)) {
    throw new Error('observed evidence provenance must be an object')
  }
  const reasons = []
  for (const key of ['dependency_skill_tree_sha256', 'target_skill_tree_sha256']) {
    const expected = metadata.provenance[key]
    const actual = observed[key]
    if (expected === null) {
      if (actual !== null) reasons.push(key)
      continue
    }
    try {
      assertHash(actual, `observed ${key}`)
    } catch {
      reasons.push(key)
      continue
    }
    if (actual !== expected) reasons.push(key)
  }
  return {
    same: reasons.length === 0,
    reasons,
  }
}

export function assertComparableEvidenceArms(
  candidate,
  baseline,
  { scenario, candidateEvidenceSha256, baselineEvidenceSha256 } = {},
) {
  validateEvidenceMetadata(candidate)
  validateEvidenceMetadata(baseline)
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    throw new Error('comparison validation requires the current scenario')
  }
  if (candidate.claim.type !== 'comparison' || baseline.claim.type !== 'comparison') {
    throw new Error('both evidence arms must carry a comparison claim')
  }
  if (candidate.arm !== 'target-present') throw new Error('the candidate arm must be target-present')
  if (baseline.arm !== 'target-absent') throw new Error('the baseline arm must be target-absent')
  if (baseline.comparison.pair_status !== 'paired') {
    throw new Error('the target-absent baseline must be paired with candidate evidence')
  }
  assertHash(candidateEvidenceSha256, 'candidate retained evidence sha256')
  assertHash(baselineEvidenceSha256, 'baseline retained evidence sha256')
  if (baseline.comparison.counterpart_evidence_sha256 !== candidateEvidenceSha256) {
    throw new Error('baseline counterpart evidence hash differs from the retained candidate')
  }
  if (
    candidate.comparison.counterpart_evidence_sha256 !== null &&
    candidate.comparison.counterpart_evidence_sha256 !== baselineEvidenceSha256
  ) {
    throw new Error('candidate counterpart evidence hash differs from the retained baseline')
  }
  if (candidate.claim.subject !== baseline.claim.subject) throw new Error('comparison arms name different subjects')
  const [skill, scenarioId] = candidate.claim.subject.split(':')
  const scenarioClaim = claimForScenario(skill, scenario)
  if (scenario.id !== scenarioId) throw new Error('comparison validation scenario names another subject')
  if (scenarioClaim.type !== 'comparison' || scenarioClaim.subject !== candidate.claim.subject) {
    throw new Error('comparison validation scenario does not declare the same comparison claim')
  }
  if (scenarioClaim.comparison.conditionsSha256 !== candidate.comparison.conditions_sha256) {
    throw new Error('comparison validation scenario declares different comparison conditions')
  }
  for (const key of ['baseline', 'candidate', 'conditions_sha256']) {
    if (candidate.comparison[key] !== baseline.comparison[key]) {
      throw new Error(`comparison arms disagree on ${key}`)
    }
  }
  for (const key of [
    'scenario_sha256',
    'input_manifest_sha256',
    'scenario_prompt_sha256',
    'prompt_guard_sha256',
    'execution_sha256',
    'comparison_conditions_sha256',
  ]) {
    if (candidate.evidence.currentness[key] !== baseline.evidence.currentness[key]) {
      throw new Error(`comparison arms disagree on ${key}`)
    }
  }
  if (candidate.evidence.currentness.rendered_prompt_sha256 === baseline.evidence.currentness.rendered_prompt_sha256) {
    throw new Error('comparison arms use the same rendered prompt')
  }
  const subagents = scenario.allow_subagents ?? false
  if (candidate.execution.subagents !== subagents || baseline.execution.subagents !== subagents) {
    throw new Error('comparison execution profile disagrees with the scenario subagent setting')
  }
  const candidatePrompt = modelPromptComponents(skill, scenario, 'target-present')
  const baselinePrompt = modelPromptComponents(skill, scenario, 'target-absent')
  for (const [metadata, prompt, arm] of [
    [candidate, candidatePrompt, 'target-present'],
    [baseline, baselinePrompt, 'target-absent'],
  ]) {
    for (const [key, value] of [
      ['scenario_prompt_sha256', prompt.scenarioPrompt],
      ['arm_instruction_sha256', prompt.armInstruction],
      ['prompt_guard_sha256', prompt.promptGuard],
      ['rendered_prompt_sha256', prompt.renderedPrompt],
    ]) {
      if (metadata.evidence.currentness[key] !== sha256(value)) {
        throw new Error(`${arm} ${key} does not match the scenario and arm instructions`)
      }
    }
  }
  if (candidate.provenance.dependency_skill_tree_sha256 !== baseline.provenance.dependency_skill_tree_sha256) {
    throw new Error('comparison arms disagree on dependency skill provenance')
  }
  if (candidate.provenance.target_skill_tree_sha256 === null) {
    throw new Error('the target-present candidate records no target skill provenance')
  }
  if (baseline.provenance.target_skill_tree_sha256 !== null) {
    throw new Error('the target-absent baseline records target skill provenance')
  }
  if (candidate.deadline_ms !== baseline.deadline_ms) throw new Error('comparison arms disagree on deadline_ms')
  if (candidate.privacy.canary_sets.join('\0') !== baseline.privacy.canary_sets.join('\0')) {
    throw new Error('comparison arms disagree on privacy canary sets')
  }
  if (candidate.privacy.scope_sha256 !== baseline.privacy.scope_sha256) {
    throw new Error('comparison arms disagree on privacy scope')
  }
  return { candidate, baseline }
}

export function terminalTurnEvent(traceText) {
  if (typeof traceText !== 'string') throw new Error('model trace must be text')
  const events = traceText
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line)
      } catch {
        throw new Error(`model trace line ${index + 1} is not JSON`)
      }
    })
  const terminals = events.filter((event) => event?.type === 'turn.completed' || event?.type === 'turn.failed')
  if (terminals.length !== 1) throw new Error(`model trace must contain exactly one terminal turn event`)
  const terminal = terminals[0]
  if (events.at(-1) !== terminal) throw new Error('the terminal turn event must be the final model trace event')
  if (terminal.type !== 'turn.completed') throw new Error('model trace reports a failed turn')
  return terminal
}

const MAX_RETAINED_IDENTITY_BYTES = 16 * 1024 * 1024

function inspectRetainedRoot(root) {
  let rootStat
  try {
    rootStat = lstatSync(root, { throwIfNoEntry: false })
  } catch {
    throw new Error('retained evidence root failed safe inspection')
  }
  if (!rootStat) throw new Error('retained evidence root does not exist')
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error('retained evidence root is not a regular directory')
  }
  return rootStat
}

function readRetainedDirectory(directory) {
  try {
    return readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    )
  } catch {
    throw new Error('retained evidence directory failed safe inspection')
  }
}

function readRetainedFile(root, name, maxBytes, label, { allowEmpty = false } = {}) {
  inspectRetainedRoot(root)
  const path = join(root, name)
  try {
    assertNoSymlinkComponents(root, path, label)
  } catch {
    throw new Error(`${label} path contains a symbolic link or escapes its evidence root`)
  }
  let stat
  try {
    stat = lstatSync(path, { throwIfNoEntry: false })
  } catch {
    throw new Error(`${label} failed safe inspection`)
  }
  if (!stat) throw new Error(`${label} does not exist`)
  if (stat.isSymbolicLink()) throw new Error(`${label} is a symbolic link`)
  if (!stat.isFile()) throw new Error(`${label} is not a regular file`)
  if (!allowEmpty && stat.size === 0) throw new Error(`${label} is empty`)
  if (stat.size > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes`)
  try {
    return stat.size === 0 ? Buffer.alloc(0) : readFileNoFollowLimited(path, label, maxBytes)
  } catch {
    throw new Error(`${label} failed its bounded no-follow read`)
  }
}

export function readRetainedTrace(root, canaries = []) {
  if (canaries.length > 0) canaryInText('retained path', 'trace.jsonl', canaries)
  return readRetainedFile(root, 'trace.jsonl', MODEL_EVIDENCE_LIMITS.traceBytes, 'retained trace').toString('utf8')
}

export function readEvidenceMetadataRecord(root, canaries = []) {
  if (canaries.length > 0) canaryInText('retained path', 'evidence.json', canaries)
  const bytes = readRetainedFile(root, 'evidence.json', MAX_EVIDENCE_METADATA_BYTES, 'retained evidence metadata')
  const contents = bytes.toString('utf8')
  let metadata
  try {
    metadata = JSON.parse(contents)
  } catch {
    throw new Error('retained evidence metadata is not valid JSON')
  }
  return { metadata, sha256: sha256(bytes) }
}

export function readEvidenceMetadata(root, canaries = []) {
  return readEvidenceMetadataRecord(root, canaries).metadata
}

export function hashEvidenceMetadata(root, canaries = []) {
  if (canaries.length > 0) canaryInText('retained path', 'evidence.json', canaries)
  return sha256(readRetainedFile(root, 'evidence.json', MAX_EVIDENCE_METADATA_BYTES, 'retained evidence metadata'))
}

function parseRetainedScenario(contents, skill, scenarioId) {
  let scenario
  try {
    scenario = JSON.parse(contents)
  } catch {
    throw new Error('retained scenario definition is not valid JSON')
  }
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    throw new Error('retained scenario definition must be an object')
  }
  assertNonEmptyString(scenario.id, 'retained scenario id')
  if (scenario.id !== scenarioId) throw new Error('retained scenario definition names another scenario')
  assertNonEmptyString(scenario.prompt, 'retained scenario prompt')
  assertNonEmptyString(scenario.expected_output, 'retained scenario expected output')
  assertStringArray(scenario.assertions, 'retained scenario assertions')
  assertStringArray(scenario.files, 'retained scenario files')
  if (scenario.allow_subagents !== undefined && typeof scenario.allow_subagents !== 'boolean') {
    throw new Error('retained scenario allow_subagents must be a boolean')
  }
  if (scenario.install !== undefined) assertStringArray(scenario.install, 'retained scenario install')
  const claim = validateScenarioClaim(skill, scenario)
  return { scenario, claim }
}

function parseInputManifest(contents, scenario) {
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(contents)
  } catch {
    throw new Error('retained input manifest is not valid UTF-8')
  }
  if (!text.endsWith('\n')) throw new Error('retained input manifest must end with a newline')
  const lines = text.slice(0, -1).split('\n')
  if (lines.length !== scenario.files.length) {
    throw new Error('retained input manifest does not name every scenario input')
  }
  const pathPattern = /^([0-9a-f]{64})  (.+?)  mode=([0-7]{4})$/
  for (const [index, line] of lines.entries()) {
    const match = pathPattern.exec(line)
    if (!match || match[2] !== scenario.files[index]) {
      throw new Error('retained input manifest does not match the scenario inputs')
    }
  }
}

function parseSkillManifest(contents, skill, scenario, arm) {
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(contents)
  } catch {
    throw new Error('retained skill manifest is not valid UTF-8')
  }
  if (text !== '' && !text.endsWith('\n')) throw new Error('retained skill manifest must end with a newline')
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  const lines = body === '' ? [] : body.split('\n')
  const linePattern = /^[0-9a-f]{64}  skills\/(dsh-spec-[a-z0-9-]+)\/(.+)  mode=[0-7]{4}$/
  const bySkill = new Map()
  let previousSkill = ''
  let previousFile = ''
  for (const line of lines) {
    const match = linePattern.exec(line)
    if (!match) throw new Error('retained skill manifest contains a malformed entry')
    const [, lineSkill, file] = match
    if (lineSkill < previousSkill || (lineSkill === previousSkill && file <= previousFile)) {
      throw new Error('retained skill manifest entries are not in canonical order')
    }
    previousSkill = lineSkill
    previousFile = file
    if (!bySkill.has(lineSkill)) bySkill.set(lineSkill, [])
    bySkill.get(lineSkill).push(line)
  }
  const siblings = [...new Set(scenario.install ?? [])].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  )
  const expected = new Set([...(arm === 'target-present' ? [skill] : []), ...siblings])
  const recorded = [...bySkill.keys()].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
  if (
    recorded.join('\0') !== [...expected].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)).join('\0')
  ) {
    throw new Error('retained skill manifest does not match the scenario installation')
  }
  if (arm === 'target-present' && (bySkill.get(skill)?.length ?? 0) === 0) {
    throw new Error('retained skill manifest omits the target skill')
  }
  const digest = (installedSkills) =>
    sha256(installedSkills.flatMap((installed) => bySkill.get(installed) ?? []).join('\n'))
  return {
    target_skill_tree_sha256: arm === 'target-present' ? digest([skill]) : null,
    dependency_skill_tree_sha256: digest(siblings),
  }
}

function parseCapabilities(contents, metadata) {
  let capabilities
  try {
    capabilities = JSON.parse(contents)
  } catch {
    throw new Error('retained capabilities are not valid JSON')
  }
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    throw new Error('retained capabilities must be an object')
  }
  const expected = {
    auth: metadata.execution.auth,
    browser: metadata.execution.browser,
    media: metadata.execution.media,
    sandbox: metadata.execution.sandbox,
    subagents: metadata.execution.subagents,
  }
  if (canonicalJson(capabilities) !== canonicalJson(expected)) {
    throw new Error('retained capabilities disagree with the execution profile')
  }
}

function parseExecutionProfile(contents, metadata) {
  let execution
  try {
    execution = JSON.parse(contents)
  } catch {
    throw new Error('retained execution profile is not valid JSON')
  }
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) {
    throw new Error('retained execution profile must be an object')
  }
  if (canonicalJson(execution) !== canonicalJson(metadata.execution)) {
    throw new Error('retained execution profile differs from evidence metadata')
  }
  return execution
}

export function inspectRetainedRun(root, metadata) {
  validateEvidenceMetadata(metadata)
  const [skill, scenarioId] = metadata.claim.subject.split(':')
  const scenarioContents = readRetainedFile(
    root,
    'scenario-definition.json',
    MAX_RETAINED_IDENTITY_BYTES,
    'retained scenario definition',
  ).toString('utf8')
  const { scenario, claim } = parseRetainedScenario(scenarioContents, skill, scenarioId)
  if (claim.type !== metadata.claim.type) throw new Error('retained scenario claim type differs from evidence metadata')
  validateModelArm(claim, metadata.arm)
  if (claim.type === 'comparison') {
    if (
      metadata.comparison?.baseline !== claim.comparison.baseline ||
      metadata.comparison?.candidate !== claim.comparison.candidate ||
      metadata.comparison?.conditions_sha256 !== claim.comparison.conditionsSha256
    ) {
      throw new Error('retained comparison conditions differ from evidence metadata')
    }
  }

  const scenarioSha256 = scenarioDefinitionHash(scenario)
  const scenarioDeclaration = readRetainedFile(
    root,
    'scenario-definition.sha256',
    MAX_RETAINED_IDENTITY_BYTES,
    'retained scenario hash',
  ).toString('utf8')
  if (scenarioDeclaration !== `${scenarioSha256}  ${metadata.claim.subject}\n`) {
    throw new Error('retained scenario hash does not match the scenario definition')
  }

  const inputManifest = readRetainedFile(
    root,
    'input-manifest.sha256',
    MAX_RETAINED_IDENTITY_BYTES,
    'retained input manifest',
  )
  parseInputManifest(inputManifest, scenario)
  const skillManifest = readRetainedFile(
    root,
    'skill-hashes.txt',
    MAX_RETAINED_IDENTITY_BYTES,
    'retained skill manifest',
    { allowEmpty: true },
  )
  const provenance = parseSkillManifest(skillManifest, skill, scenario, metadata.arm)
  const capabilityContents = readRetainedFile(
    root,
    'capabilities.json',
    MAX_RETAINED_IDENTITY_BYTES,
    'retained capabilities',
  )
  parseCapabilities(capabilityContents, metadata)
  const executionContents = readRetainedFile(
    root,
    'execution.json',
    MAX_RETAINED_IDENTITY_BYTES,
    'retained execution profile',
  )
  const execution = parseExecutionProfile(executionContents, metadata)
  if (metadata.execution.subagents !== Boolean(scenario.allow_subagents)) {
    throw new Error('retained scenario subagent setting differs from evidence metadata')
  }

  const prompt = modelPromptComponents(skill, scenario, metadata.arm)
  const currentness = {
    scenario_sha256: scenarioSha256,
    input_manifest_sha256: sha256(inputManifest),
    scenario_prompt_sha256: sha256(prompt.scenarioPrompt),
    arm_instruction_sha256: sha256(prompt.armInstruction),
    prompt_guard_sha256: sha256(prompt.promptGuard),
    rendered_prompt_sha256: sha256(prompt.renderedPrompt),
    execution_sha256: sha256(canonicalJson(execution)),
    ...(claim.type === 'comparison' ? { comparison_conditions_sha256: claim.comparison.conditionsSha256 } : {}),
  }
  const currentnessComparison = compareEvidenceCurrentness(metadata, currentness)
  if (!currentnessComparison.current) {
    throw new Error(`retained evidence differs from metadata currentness: ${currentnessComparison.reasons.join(', ')}`)
  }
  const provenanceComparison = compareEvidenceProvenance(metadata, provenance)
  if (!provenanceComparison.same) {
    throw new Error(`retained evidence differs from metadata provenance: ${provenanceComparison.reasons.join(', ')}`)
  }
  return { scenario, claim, prompt, currentness, provenance }
}

function assertCanaryList(canaries) {
  if (!Array.isArray(canaries) || canaries.length === 0) {
    throw new Error('privacy canaries must be a non-empty array')
  }
  for (const canary of canaries) {
    assertNonEmptyString(canary?.set, 'privacy canary set')
    assertNonEmptyString(canary?.value, 'privacy canary value')
  }
}

function canaryInText(label, value, canaries) {
  for (const canary of canaries) {
    if (value.includes(canary.value)) {
      throw new Error(`${label} contains a canary from ${canary.set}`)
    }
  }
}

export function assertNoPrivacyCanariesInText(label, text, canaries) {
  assertNonEmptyString(label, 'privacy surface label')
  if (typeof text !== 'string') throw new Error(`${label} must be text`)
  assertCanaryList(canaries)
  canaryInText(label, text, canaries)
}

function inspectRetainedSurfaces(root, canaries, { extraPaths = [], skip = () => false } = {}) {
  assertCanaryList(canaries)
  inspectRetainedRoot(root)
  if (!Array.isArray(extraPaths)) throw new Error('extra retained paths must be an array')
  for (const path of extraPaths) {
    assertNonEmptyString(path, 'extra retained path')
    canaryInText('retained path', path, canaries)
  }
  let files = 0
  const snapshot = []
  const fileSha256 = new Map()
  const longestCanary = Math.max(...canaries.map((canary) => Buffer.byteLength(canary.value)))
  const carryBytes = Math.max(0, longestCanary - 1)
  const walk = (directory) => {
    for (const entry of readRetainedDirectory(directory)) {
      const path = join(directory, entry.name)
      const local = relative(root, path).split(sep).join('/')
      if (skip(local, entry.name)) continue
      canaryInText('retained path', local, canaries)
      if (entry.isSymbolicLink()) throw new Error(`retained evidence contains a symbolic link: ${local}`)
      if (entry.isDirectory()) {
        snapshot.push(`directory  ${local}`)
        walk(path)
        continue
      }
      if (!entry.isFile()) throw new Error(`retained evidence contains a non-regular entry: ${local}`)
      let opened
      try {
        opened = openRegularFileNoFollow(path, 'retained evidence', Number.POSITIVE_INFINITY)
      } catch {
        throw new Error(`retained evidence ${local} failed a bounded no-follow open`)
      }
      const { fd, stat } = opened
      const digest = createHash('sha256')
      try {
        let carry = Buffer.alloc(0)
        const buffer = Buffer.allocUnsafe(64 * 1024)
        while (true) {
          const read = readSync(fd, buffer, 0, buffer.length, null)
          if (read === 0) break
          const chunk = buffer.subarray(0, read)
          digest.update(chunk)
          const segment = carry.length === 0 ? chunk : Buffer.concat([carry, chunk])
          for (const canary of canaries) {
            if (segment.includes(Buffer.from(canary.value))) {
              throw new Error(`retained evidence ${local} contains a canary from ${canary.set}`)
            }
          }
          carry =
            carryBytes === 0 || segment.length <= carryBytes
              ? Buffer.from(segment)
              : Buffer.from(segment.subarray(segment.length - carryBytes))
        }
      } finally {
        closeSync(fd)
      }
      const mode = (stat.mode & 0o7777).toString(8).padStart(4, '0')
      const fileDigest = digest.digest('hex')
      fileSha256.set(local, fileDigest)
      snapshot.push(`${fileDigest}  ${local}  mode=${mode}`)
      files += 1
    }
  }
  walk(root)
  if (files === 0) throw new Error('retained evidence tree contains no files to scan')
  return { files, snapshotSha256: sha256(snapshot.join('\n')), fileSha256 }
}

export function scanRetainedSurfaces(root, canaries, options = {}) {
  return { files: inspectRetainedSurfaces(root, canaries, options).files }
}

export function retainedSurfacesSha256(root, canaries, options = {}) {
  return inspectRetainedSurfaces(root, canaries, options).snapshotSha256
}

export function retainedSurfacesSnapshot(root, canaries, options = {}) {
  return inspectRetainedSurfaces(root, canaries, options)
}

export function assertRetainedRunPolicy({
  root,
  metadata,
  observed,
  provenance,
  canaries,
  extraPaths = [],
  currentHome = homedir(),
}) {
  validateEvidenceMetadata(metadata)
  const [skill, scenarioId] = metadata.claim.subject.split(':')
  assertPrivacyScope(metadata.privacy, canaries, { skill, scenarioId, currentHome })
  const currentness = compareEvidenceCurrentness(metadata, observed)
  if (!currentness.current) {
    throw new Error(`evidence is historical because currentness differs: ${currentness.reasons.join(', ')}`)
  }
  if (provenance) {
    const recordedProvenance = compareEvidenceProvenance(metadata, provenance)
    if (!recordedProvenance.same) {
      throw new Error(`evidence provenance differs: ${recordedProvenance.reasons.join(', ')}`)
    }
  }
  terminalTurnEvent(readRetainedTrace(root, canaries))
  scanRetainedSurfaces(root, canaries, { extraPaths })
  return metadata
}
