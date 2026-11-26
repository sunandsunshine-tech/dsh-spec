import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const policy = (await import('./skill-evals/evidence-policy.mjs' as string)) as {
  DEFAULT_MODEL_DEADLINE_MS: number
  allPrivacyCanaries(options?: { currentHome?: string }): Array<{ set: string; value: string }>
  assertNoPrivacyCanariesInText(label: string, text: string, canaries: Array<{ set: string; value: string }>): void
  assertComparableEvidenceArms(
    candidate: EvidenceMetadata,
    baseline: EvidenceMetadata,
    options?: {
      scenario: { id: string; prompt: string; comparison?: Comparison }
      candidateEvidenceSha256: string
      baselineEvidenceSha256: string
    },
  ): {
    candidate: EvidenceMetadata
    baseline: EvidenceMetadata
  }
  assertRetainedRunPolicy(options: {
    root: string
    metadata: EvidenceMetadata
    observed: Record<string, string | null>
    provenance?: Record<string, string | null>
    canaries: Array<{ set: string; value: string }>
    extraPaths?: string[]
    currentHome?: string
  }): EvidenceMetadata
  claimForScenario(skill: string, scenario: { id: string; comparison?: Comparison }): Claim
  compareEvidenceCurrentness(
    metadata: EvidenceMetadata,
    observed: Record<string, string | null>,
  ): { current: boolean; reasons: string[] }
  compareEvidenceProvenance(
    metadata: EvidenceMetadata,
    observed: Record<string, string | null>,
  ): { same: boolean; reasons: string[] }
  createModelEvidenceMetadata(options: {
    skill: string
    scenario: { id: string; prompt: string; comparison?: Comparison }
    arm: 'target-present' | 'target-absent'
    scenarioSha256: string
    inputManifestSha256: string
    targetSkillTreeSha256: string | null
    dependencySkillTreeSha256: string
    prompt: string
    armInstruction?: string
    promptGuard?: string
    currentHome?: string
    privacyCanaries?: Array<{ set: string; value: string }>
    counterpartEvidenceSha256?: string | null
    execution: ExecutionProfile
    deadlineMs?: number
  }): EvidenceMetadata
  createTriggerEvidenceMetadata(options: {
    skill: string
    triggerSurfaceSha256: string
    triggerCorpusSha256: string
    currentHome?: string
    privacyCanaries?: Array<{ set: string; value: string }>
    execution: ExecutionProfile
    deadlineMs?: number
  }): EvidenceMetadata
  privacyScopeSha256(canaries: Array<{ set: string; value: string }>): string
  privacyCanariesFor(
    skill: string,
    scenarioId: string,
    options?: { includeCurrentHome?: boolean; currentHome?: string },
  ): Array<{ set: string; value: string }>
  hashEvidenceMetadata(root: string, canaries?: Array<{ set: string; value: string }>): string
  readEvidenceMetadata(root: string, canaries?: Array<{ set: string; value: string }>): unknown
  readEvidenceMetadataRecord(
    root: string,
    canaries?: Array<{ set: string; value: string }>,
  ): { metadata: unknown; sha256: string }
  inspectRetainedRun(
    root: string,
    metadata: EvidenceMetadata,
  ): {
    scenario: { id: string; prompt: string; comparison?: Comparison }
    currentness: Record<string, string | null>
    provenance: { target_skill_tree_sha256: string | null; dependency_skill_tree_sha256: string }
  }
  inspectRetainedTriggerRun(
    root: string,
    metadata: EvidenceMetadata,
    canaries: Array<{ set: string; value: string }>,
  ): {
    query: {
      id: string
      query: string
      should_trigger: boolean
      agent_file: string
      currentness: { trigger_surface_sha256: string; trigger_corpus_sha256: string }
    }
    currentness: Record<string, string | null>
  }
  finalAgentMessageFromTrace(trace: string): string | undefined
  modelPromptComponents(
    skill: string,
    scenario: { id: string; prompt: string; comparison?: Comparison; allow_subagents?: boolean },
    arm: 'target-present' | 'target-absent',
  ): { scenarioPrompt: string; armInstruction: string; promptGuard: string; renderedPrompt: string }
  readRetainedTrace(root: string, canaries?: Array<{ set: string; value: string }>): string
  retainedSurfacesSha256(
    root: string,
    canaries: Array<{ set: string; value: string }>,
    options?: { extraPaths?: string[]; skip?: (relativePath: string, entryName: string) => boolean },
  ): string
  retainedSurfacesSnapshot(
    root: string,
    canaries: Array<{ set: string; value: string }>,
    options?: { extraPaths?: string[]; skip?: (relativePath: string, entryName: string) => boolean },
  ): { files: number; snapshotSha256: string; fileSha256: Map<string, string> }
  scenarioDefinitionHash(value: unknown): string
  remainingRunDeadline(deadlineAt: number, now?: number): number
  scanRetainedSurfaces(
    root: string,
    canaries: Array<{ set: string; value: string }>,
    options?: { extraPaths?: string[]; skip?: (relativePath: string, entryName: string) => boolean },
  ): { files: number }
  sha256(value: string): string
  terminalTurnEvent(trace: string): { type: string }
  triggerCorpusSha256(options: {
    corpus: string | Buffer
    agentFile: string
    agent: string | Buffer
    files?: Array<{ path: string; bytes: string | Buffer; mode: string }>
  }): string
  triggerSurfaceSha256(skillText: string): string
  validateEvidenceMetadata(metadata: EvidenceMetadata): EvidenceMetadata
  validateModelArm(claim: Claim, arm: string): string
  validateScenarioClaim(skill: string, scenario: { id: string; comparison?: unknown }): Claim
}

const safety = (await import('./skill-evals/runner-safety.mjs' as string)) as {
  runInterruptible(
    command: string,
    args: string[],
    options: Record<string, unknown>,
    onSpawn?: (child: unknown) => void,
    optionsWithDeadline?: { deadlineMs: number },
  ): Promise<{
    status: number | null
    signal: string | null
    stdout: string
    stderr: string
    interrupted?: string
    timedOut: boolean
  }>
}

const sha256 = (value: string): string => policy.sha256(value)

interface Comparison {
  baseline: string
  candidate: string
  conditions: string[]
}

interface Claim {
  type: string
  subject: string
  comparison: (Comparison & { conditionsSha256: string }) | null
}

interface EvidenceMetadata {
  schema_version: 1
  claim: { type: string; subject: string }
  arm: string | null
  comparison: {
    baseline: string
    candidate: string
    conditions_sha256: string
    counterpart_evidence_sha256: string | null
    pair_status: string
  } | null
  evidence: { kind: string; currentness: Record<string, string | null> }
  provenance?: {
    target_skill_tree_sha256: string | null
    dependency_skill_tree_sha256: string
  }
  execution: ExecutionProfile
  deadline_ms: number
  privacy: { canary_sets: string[]; scope_sha256: string; surfaces: string }
}

interface ExecutionProfile {
  auth: string
  browser: boolean
  media: boolean
  model_config_sha256: string
  model_runtime_sha256: string
  sandbox: string
  subagents: boolean
}

const hashA = 'a'.repeat(64)
const hashB = 'b'.repeat(64)
const hashC = 'c'.repeat(64)
const hashD = 'd'.repeat(64)
const hashE = 'e'.repeat(64)
const retainedCandidateHash = '1'.repeat(64)
const retainedBaselineHash = '2'.repeat(64)
const execution: ExecutionProfile = {
  auth: 'host-proxy',
  browser: false,
  media: false,
  model_config_sha256: hashD,
  model_runtime_sha256: hashE,
  sandbox: 'workspace-write',
  subagents: false,
}

function behaviorMetadata(
  privacyCanaries?: Array<{ set: string; value: string }>,
  currentHome?: string,
): EvidenceMetadata {
  return policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario: { id: 'example-behavior', prompt: 'Behavior scenario prompt.' },
    arm: 'target-present',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: hashC,
    dependencySkillTreeSha256: sha256(''),
    prompt: 'Behavior scenario prompt.\n\nUse the installed skill. Work only inside the current project.',
    armInstruction: 'Use the installed skill. ',
    promptGuard: 'Work only inside the current project.',
    currentHome,
    privacyCanaries,
    execution,
  })
}

function scopeCanaries(currentHome = '/home/test') {
  return policy.privacyCanariesFor('dsh-spec-example', 'compare', {
    includeCurrentHome: true,
    currentHome,
  })
}

function comparisonLinkOptions(scenario: { id: string; prompt: string; comparison?: Comparison }) {
  return {
    scenario,
    candidateEvidenceSha256: retainedCandidateHash,
    baselineEvidenceSha256: retainedBaselineHash,
  }
}

test('claim typing distinguishes behavior, trigger and comparative evidence', () => {
  assert.equal(policy.claimForScenario('dsh-spec-example', { id: 'behavior' }).type, 'behavior')
  const comparison = policy.claimForScenario('dsh-spec-example', {
    id: 'compare',
    comparison: {
      baseline: 'target-absent',
      candidate: 'target-present',
      conditions: ['same fixture', 'same deadline'],
    },
  })
  assert.equal(comparison.type, 'comparison')
  assert.match(comparison.comparison?.conditionsSha256 ?? '', /^[0-9a-f]{64}$/)
  assert.equal(
    policy.claimForScenario('dsh-spec-performance-investigation', {
      id: 'backend-budgetless-latency',
      comparison: {
        baseline: 'target-absent',
        candidate: 'target-present',
        conditions: ['same fixture'],
      },
    }).type,
    'comparison',
  )
})

test('trigger evidence binds the catalog surface and complete trigger corpus resources', () => {
  const skill = [
    '---',
    'name: dsh-spec-example',
    'description: "Select the example trigger. 用于示例。"',
    '---',
    '# Example',
    'First body.',
    '',
  ].join('\n')
  const surface = policy.triggerSurfaceSha256(skill)
  assert.equal(policy.triggerSurfaceSha256(skill.replace('First body.', 'Different body.')), surface)
  assert.notEqual(
    policy.triggerSurfaceSha256(skill.replace('Select the example trigger.', 'Select changed work.')),
    surface,
  )

  const corpus = '{"queries":[]}\n'
  const agent = 'Select only from the installed catalog.\n'
  const corpusIdentity = policy.triggerCorpusSha256({
    corpus,
    agentFile: 'trigger-fixtures/AGENTS.md',
    agent,
    files: [{ path: 'trigger-fixtures/case/input.txt', bytes: 'input\n', mode: '0644' }],
  })
  assert.equal(
    policy.triggerCorpusSha256({
      corpus,
      agentFile: 'trigger-fixtures/AGENTS.md',
      agent,
      files: [{ path: 'trigger-fixtures/case/input.txt', bytes: 'input\n', mode: '0644' }],
    }),
    corpusIdentity,
  )
  assert.notEqual(
    policy.triggerCorpusSha256({
      corpus,
      agentFile: 'trigger-fixtures/AGENTS.md',
      agent: `${agent}Changed instruction.\n`,
      files: [{ path: 'trigger-fixtures/case/input.txt', bytes: 'input\n', mode: '0644' }],
    }),
    corpusIdentity,
  )
  assert.notEqual(
    policy.triggerCorpusSha256({
      corpus,
      agentFile: 'trigger-fixtures/AGENTS.md',
      agent,
      files: [{ path: 'trigger-fixtures/case/input.txt', bytes: 'changed\n', mode: '0644' }],
    }),
    corpusIdentity,
  )
  assert.notEqual(
    policy.triggerCorpusSha256({
      corpus,
      agentFile: 'trigger-fixtures/AGENTS.md',
      agent,
      files: [{ path: 'trigger-fixtures/case/input.txt', bytes: 'input\n', mode: '0755' }],
    }),
    corpusIdentity,
  )
  assert.equal(
    policy.triggerCorpusSha256({
      corpus,
      agentFile: 'trigger-fixtures/AGENTS.md',
      agent,
      files: [
        { path: 'trigger-fixtures/z.txt', bytes: 'z\n', mode: '0644' },
        { path: 'trigger-fixtures/a.txt', bytes: 'a\n', mode: '0644' },
      ],
    }),
    policy.triggerCorpusSha256({
      corpus,
      agentFile: 'trigger-fixtures/AGENTS.md',
      agent,
      files: [
        { path: 'trigger-fixtures/a.txt', bytes: 'a\n', mode: '0644' },
        { path: 'trigger-fixtures/z.txt', bytes: 'z\n', mode: '0644' },
      ],
    }),
  )

  const triggerExecution = { ...execution, sandbox: 'read-only' }
  const canaries = policy.privacyCanariesFor('dsh-spec-example', 'trigger', {
    includeCurrentHome: true,
    currentHome: '/home/test',
  })
  const metadata = policy.createTriggerEvidenceMetadata({
    skill: 'dsh-spec-example',
    triggerSurfaceSha256: surface,
    triggerCorpusSha256: corpusIdentity,
    currentHome: '/home/test',
    privacyCanaries: canaries,
    execution: triggerExecution,
  })
  assert.deepEqual(metadata.claim, { type: 'trigger', subject: 'dsh-spec-example:trigger' })
  assert.equal(metadata.arm, null)
  assert.equal(metadata.comparison, null)
  assert.deepEqual(metadata.evidence.currentness, {
    trigger_surface_sha256: surface,
    trigger_corpus_sha256: corpusIdentity,
  })
  assert.deepEqual(policy.compareEvidenceCurrentness(metadata, metadata.evidence.currentness), {
    current: true,
    reasons: [],
  })
  for (const executionProfile of [
    { ...triggerExecution, sandbox: 'workspace-write' },
    { ...triggerExecution, subagents: true },
    { ...triggerExecution, browser: true },
    { ...triggerExecution, media: true },
  ]) {
    assert.throws(
      () =>
        policy.createTriggerEvidenceMetadata({
          skill: 'dsh-spec-example',
          triggerSurfaceSha256: surface,
          triggerCorpusSha256: corpusIdentity,
          currentHome: '/home/test',
          privacyCanaries: canaries,
          execution: executionProfile,
        }),
      /read-only execution without browser, media or subagents/,
    )
  }
  for (const executionProfile of [
    { ...metadata.execution, sandbox: 'workspace-write' },
    { ...metadata.execution, subagents: true },
    { ...metadata.execution, browser: true },
    { ...metadata.execution, media: true },
  ]) {
    assert.throws(
      () =>
        policy.validateEvidenceMetadata({
          ...metadata,
          execution: executionProfile,
        }),
      /read-only execution without browser, media or subagents/,
    )
  }
})

test('scenario comparison typing rejects missing roles, empty conditions and unknown fields', () => {
  const valid = {
    baseline: 'target-absent',
    candidate: 'target-present',
    conditions: ['same fixture'],
  }
  assert.equal(
    policy.validateScenarioClaim('dsh-spec-example', {
      id: 'compare',
      comparison: valid,
    }).type,
    'comparison',
  )
  for (const comparison of [
    { ...valid, baseline: 'target-present' },
    { ...valid, candidate: 'target-absent' },
    { ...valid, conditions: [] },
    { ...valid, extra: true },
    null,
  ]) {
    assert.throws(() => policy.validateScenarioClaim('dsh-spec-example', { id: 'compare', comparison }))
  }
})

test('target-absent arms are rejected outside comparative claims', () => {
  const behavior = policy.claimForScenario('dsh-spec-example', { id: 'behavior' })
  assert.throws(() => policy.validateModelArm(behavior, 'target-absent'), /only for a comparison claim/)
  const comparison = policy.claimForScenario('dsh-spec-example', {
    id: 'compare',
    comparison: {
      baseline: 'target-absent',
      candidate: 'target-present',
      conditions: ['same fixture'],
    },
  })
  assert.equal(policy.validateModelArm(comparison, 'target-absent'), 'target-absent')
  const metadata = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario: {
      id: 'compare',
      prompt: 'Shared scenario prompt.',
      comparison: comparison.comparison
        ? {
            baseline: comparison.comparison.baseline,
            candidate: comparison.comparison.candidate,
            conditions: comparison.comparison.conditions,
          }
        : undefined,
    },
    arm: 'target-absent',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: null,
    dependencySkillTreeSha256: sha256(''),
    prompt: 'Shared scenario prompt.\n\nWork only inside the current project.',
    counterpartEvidenceSha256: retainedCandidateHash,
    execution,
  })
  assert.equal(metadata.arm, 'target-absent')
  assert.equal(metadata.provenance?.target_skill_tree_sha256, null)
})

test('currentness is selective by claim inputs', () => {
  const behavior = behaviorMetadata()
  assert.deepEqual(
    policy.compareEvidenceCurrentness(behavior, {
      scenario_sha256: hashA,
      input_manifest_sha256: hashB,
      scenario_prompt_sha256: sha256('Behavior scenario prompt.'),
      arm_instruction_sha256: sha256('Use the installed skill. '),
      prompt_guard_sha256: sha256('Work only inside the current project.'),
      rendered_prompt_sha256: sha256(
        'Behavior scenario prompt.\n\nUse the installed skill. Work only inside the current project.',
      ),
      execution_sha256: behavior.evidence.currentness.execution_sha256,
    }),
    { current: true, reasons: [] },
  )
  assert.deepEqual(
    policy.compareEvidenceCurrentness(behavior, {
      scenario_sha256: hashA,
      input_manifest_sha256: hashB,
      scenario_prompt_sha256: sha256('Behavior scenario prompt.'),
      arm_instruction_sha256: sha256('Use the installed skill. '),
      prompt_guard_sha256: sha256('Work only inside the current project.'),
      rendered_prompt_sha256: sha256(
        'Behavior scenario prompt.\n\nUse the installed skill. Work only inside the current project.',
      ),
      execution_sha256: behavior.evidence.currentness.execution_sha256,
    }),
    { current: true, reasons: [] },
  )
  assert.deepEqual(
    policy.compareEvidenceProvenance(behavior, {
      target_skill_tree_sha256: 'd'.repeat(64),
      dependency_skill_tree_sha256: sha256('changed sibling'),
    }),
    { same: false, reasons: ['dependency_skill_tree_sha256', 'target_skill_tree_sha256'] },
  )
  assert.deepEqual(
    policy.compareEvidenceCurrentness(behavior, {
      scenario_sha256: 'd'.repeat(64),
      input_manifest_sha256: hashB,
      scenario_prompt_sha256: sha256('Behavior scenario prompt.'),
      arm_instruction_sha256: sha256('Use the installed skill. '),
      prompt_guard_sha256: sha256('Work only inside the current project.'),
      rendered_prompt_sha256: sha256(
        'Behavior scenario prompt.\n\nUse the installed skill. Work only inside the current project.',
      ),
      execution_sha256: behavior.evidence.currentness.execution_sha256,
    }),
    { current: false, reasons: ['scenario_sha256'] },
  )

  const triggerCanaries = policy.privacyCanariesFor('dsh-spec-example', 'trigger', {
    includeCurrentHome: true,
    currentHome: '/home/test',
  })
  const trigger: EvidenceMetadata = {
    schema_version: 1,
    claim: { type: 'trigger', subject: 'dsh-spec-example:trigger' },
    arm: null,
    comparison: null,
    evidence: {
      kind: 'model',
      currentness: {
        trigger_surface_sha256: hashA,
        trigger_corpus_sha256: hashB,
      },
    },
    execution: { ...execution, sandbox: 'read-only' },
    deadline_ms: policy.DEFAULT_MODEL_DEADLINE_MS,
    privacy: {
      canary_sets: ['current-home', 'local-environment'],
      scope_sha256: policy.privacyScopeSha256(triggerCanaries),
      surfaces: 'all-retained-files',
    },
  }
  assert.equal(
    policy.compareEvidenceCurrentness(trigger, {
      trigger_surface_sha256: hashA,
      trigger_corpus_sha256: hashB,
      target_skill_tree_sha256: hashC,
      execution_sha256: trigger.evidence.currentness.execution_sha256,
    }).current,
    true,
  )
  assert.equal(
    policy.compareEvidenceCurrentness(trigger, {
      trigger_surface_sha256: 'd'.repeat(64),
      trigger_corpus_sha256: hashB,
      execution_sha256: trigger.evidence.currentness.execution_sha256,
    }).current,
    false,
  )
})

test('comparative currentness requires the declared arm and comparable inputs', () => {
  const comparison = {
    baseline: 'target-absent',
    candidate: 'target-present',
    conditions: ['same fixture', 'same deadline'],
  }
  const metadata = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario: { id: 'compare', prompt: 'Shared scenario prompt.', comparison },
    arm: 'target-absent',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: null,
    dependencySkillTreeSha256: sha256(''),
    prompt: 'Shared scenario prompt.\n\nWork only inside the current project.',
    counterpartEvidenceSha256: retainedCandidateHash,
    execution,
    deadlineMs: 60_000,
  })
  const conditionsSha256 = metadata.comparison?.conditions_sha256
  assert.ok(conditionsSha256)
  assert.deepEqual(
    policy.compareEvidenceCurrentness(metadata, {
      scenario_sha256: hashA,
      input_manifest_sha256: hashB,
      scenario_prompt_sha256: sha256('Shared scenario prompt.'),
      arm_instruction_sha256: sha256(''),
      prompt_guard_sha256: sha256('Work only inside the current project.'),
      rendered_prompt_sha256: sha256('Shared scenario prompt.\n\nWork only inside the current project.'),
      comparison_conditions_sha256: conditionsSha256,
      execution_sha256: metadata.evidence.currentness.execution_sha256,
    }),
    { current: true, reasons: [] },
  )
  assert.deepEqual(
    policy.compareEvidenceCurrentness(metadata, {
      scenario_sha256: hashA,
      input_manifest_sha256: 'd'.repeat(64),
      scenario_prompt_sha256: sha256('Shared scenario prompt.'),
      arm_instruction_sha256: sha256(''),
      prompt_guard_sha256: sha256('Work only inside the current project.'),
      rendered_prompt_sha256: sha256('Shared scenario prompt.\n\nWork only inside the current project.'),
      comparison_conditions_sha256: conditionsSha256,
      execution_sha256: metadata.evidence.currentness.execution_sha256,
    }),
    { current: false, reasons: ['input_manifest_sha256'] },
  )
})

test('comparison arms must share prompt, inputs, execution, deadline and privacy scope', () => {
  const comparison = {
    baseline: 'target-absent',
    candidate: 'target-present',
    conditions: ['same fixture', 'same deadline'],
  }
  const scenario = { id: 'compare', prompt: 'Shared scenario prompt.', comparison }
  const baselinePrompt = policy.modelPromptComponents('dsh-spec-example', scenario, 'target-absent')
  const candidatePrompt = policy.modelPromptComponents('dsh-spec-example', scenario, 'target-present')
  const baseline = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-absent',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: null,
    dependencySkillTreeSha256: sha256(''),
    prompt: baselinePrompt.renderedPrompt,
    promptGuard: baselinePrompt.promptGuard,
    counterpartEvidenceSha256: retainedCandidateHash,
    execution,
    deadlineMs: 60_000,
  })
  const candidate = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-present',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: hashC,
    dependencySkillTreeSha256: sha256(''),
    prompt: candidatePrompt.renderedPrompt,
    armInstruction: candidatePrompt.armInstruction,
    promptGuard: candidatePrompt.promptGuard,
    execution,
    deadlineMs: 60_000,
  })
  assert.deepEqual(policy.assertComparableEvidenceArms(candidate, baseline, comparisonLinkOptions(scenario)), {
    candidate,
    baseline,
  })
  const staleBaseline = {
    ...baseline,
    comparison: { ...baseline.comparison!, counterpart_evidence_sha256: '0'.repeat(64) },
  } as EvidenceMetadata
  assert.throws(
    () => policy.assertComparableEvidenceArms(candidate, staleBaseline, comparisonLinkOptions(scenario)),
    /baseline counterpart evidence hash differs/,
  )
  const pairedCandidate = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-present',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: hashC,
    dependencySkillTreeSha256: sha256(''),
    prompt: candidatePrompt.renderedPrompt,
    armInstruction: candidatePrompt.armInstruction,
    promptGuard: candidatePrompt.promptGuard,
    counterpartEvidenceSha256: retainedBaselineHash,
    execution,
    deadlineMs: 60_000,
  })
  assert.doesNotThrow(() =>
    policy.assertComparableEvidenceArms(pairedCandidate, baseline, comparisonLinkOptions(scenario)),
  )
  const staleCandidate = {
    ...pairedCandidate,
    comparison: { ...pairedCandidate.comparison!, counterpart_evidence_sha256: '3'.repeat(64) },
  } as EvidenceMetadata
  assert.throws(
    () => policy.assertComparableEvidenceArms(staleCandidate, baseline, comparisonLinkOptions(scenario)),
    /candidate counterpart evidence hash differs/,
  )
  const differentDeadline = { ...baseline, deadline_ms: 60_001 }
  assert.throws(
    () => policy.assertComparableEvidenceArms(candidate, differentDeadline, comparisonLinkOptions(scenario)),
    /disagree on deadline_ms/,
  )
  const differentExecution = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-absent',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: null,
    dependencySkillTreeSha256: sha256(''),
    prompt: baselinePrompt.renderedPrompt,
    promptGuard: baselinePrompt.promptGuard,
    counterpartEvidenceSha256: retainedCandidateHash,
    execution: { ...execution, browser: true },
    deadlineMs: 60_000,
  })
  assert.throws(
    () => policy.assertComparableEvidenceArms(candidate, differentExecution, comparisonLinkOptions(scenario)),
    /disagree on execution_sha256/,
  )
  const differentPrivacyScope = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-absent',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: null,
    dependencySkillTreeSha256: sha256(''),
    prompt: baselinePrompt.renderedPrompt,
    promptGuard: baselinePrompt.promptGuard,
    privacyCanaries: scopeCanaries('/home/a'),
    currentHome: '/home/a',
    counterpartEvidenceSha256: retainedCandidateHash,
    execution,
    deadlineMs: 60_000,
  })
  const candidatePrivacyScope = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-present',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: hashC,
    dependencySkillTreeSha256: sha256(''),
    prompt: candidatePrompt.renderedPrompt,
    armInstruction: candidatePrompt.armInstruction,
    promptGuard: candidatePrompt.promptGuard,
    privacyCanaries: scopeCanaries('/home/b'),
    currentHome: '/home/b',
    execution,
    deadlineMs: 60_000,
  })
  assert.doesNotThrow(() =>
    policy.assertComparableEvidenceArms(candidatePrivacyScope, differentPrivacyScope, comparisonLinkOptions(scenario)),
  )
  const unrelatedPrivacyScope = {
    ...differentPrivacyScope,
    privacy: { ...differentPrivacyScope.privacy, scope_sha256: 'e'.repeat(64) },
  }
  assert.throws(
    () =>
      policy.assertComparableEvidenceArms(
        candidatePrivacyScope,
        unrelatedPrivacyScope,
        comparisonLinkOptions(scenario),
      ),
    /disagree on privacy scope/,
  )
})

test('comparison prompt hashes must reconstruct the exact scenario and target treatment', () => {
  const comparison = {
    baseline: 'target-absent',
    candidate: 'target-present',
    conditions: ['same fixture'],
  }
  const scenario = { id: 'compare', prompt: 'Shared scenario prompt.', comparison }
  const baselinePrompt = policy.modelPromptComponents('dsh-spec-example', scenario, 'target-absent')
  const candidatePrompt = policy.modelPromptComponents('dsh-spec-example', scenario, 'target-present')
  const baseline = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-absent',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: null,
    dependencySkillTreeSha256: sha256(''),
    prompt: baselinePrompt.renderedPrompt,
    promptGuard: baselinePrompt.promptGuard,
    counterpartEvidenceSha256: retainedCandidateHash,
    execution,
    deadlineMs: 60_000,
  })
  const candidate = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-present',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: hashC,
    dependencySkillTreeSha256: sha256(''),
    prompt: candidatePrompt.renderedPrompt,
    armInstruction: candidatePrompt.armInstruction,
    promptGuard: candidatePrompt.promptGuard,
    execution,
    deadlineMs: 60_000,
  })
  assert.doesNotThrow(() => policy.assertComparableEvidenceArms(candidate, baseline, comparisonLinkOptions(scenario)))

  const arbitraryBaseline = {
    ...baseline,
    evidence: {
      ...baseline.evidence,
      currentness: {
        ...baseline.evidence.currentness,
        rendered_prompt_sha256: sha256('arbitrary baseline prompt'),
      },
    },
  }
  assert.throws(
    () => policy.assertComparableEvidenceArms(candidate, arbitraryBaseline, comparisonLinkOptions(scenario)),
    /target-absent rendered_prompt_sha256/,
  )

  const arbitraryCandidate = policy.createModelEvidenceMetadata({
    skill: 'dsh-spec-example',
    scenario,
    arm: 'target-present',
    scenarioSha256: hashA,
    inputManifestSha256: hashB,
    targetSkillTreeSha256: hashC,
    dependencySkillTreeSha256: sha256(''),
    prompt: `Shared scenario prompt.\n\nUse an arbitrary treatment. ${candidatePrompt.promptGuard}`,
    armInstruction: 'Use an arbitrary treatment. ',
    promptGuard: candidatePrompt.promptGuard,
    execution,
    deadlineMs: 60_000,
  })
  assert.throws(
    () => policy.assertComparableEvidenceArms(arbitraryCandidate, baseline, comparisonLinkOptions(scenario)),
    /target-present arm_instruction_sha256/,
  )
  assert.throws(() => policy.assertComparableEvidenceArms(candidate, baseline), /requires the current scenario/)
})

test('retained-run validation reconstructs currentness and provenance from recorded files', () => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-retained-observation-'))
  const skill = 'dsh-spec-example'
  const sibling = 'dsh-spec-example-peer'
  const scenario = {
    id: 'compare',
    prompt: 'Shared retained scenario prompt.',
    expected_output: 'A recorded output.',
    assertions: ['The retained output matches.'],
    files: ['evals/files/input.txt'],
    install: [sibling],
    comparison: {
      baseline: 'target-absent',
      candidate: 'target-present',
      conditions: ['same retained fixture'],
    },
  }
  const canaries = policy.privacyCanariesFor(skill, scenario.id, {
    includeCurrentHome: true,
    currentHome: '/home/test',
  })
  const targetLine = `${hashC}  skills/${skill}/SKILL.md  mode=0644`
  const siblingLine = `${hashD}  skills/${sibling}/SKILL.md  mode=0644`
  const inputManifest = `${hashB}  ${scenario.files[0]}  mode=0644\n`
  const prompt = policy.modelPromptComponents(skill, scenario, 'target-present')
  const metadata = policy.createModelEvidenceMetadata({
    skill,
    scenario,
    arm: 'target-present',
    scenarioSha256: policy.scenarioDefinitionHash(scenario),
    inputManifestSha256: sha256(inputManifest),
    targetSkillTreeSha256: sha256(targetLine),
    dependencySkillTreeSha256: sha256(siblingLine),
    prompt: prompt.renderedPrompt,
    armInstruction: prompt.armInstruction,
    promptGuard: prompt.promptGuard,
    privacyCanaries: canaries,
    currentHome: '/home/test',
    execution,
    deadlineMs: 60_000,
  })
  try {
    writeFileSync(join(root, 'scenario-definition.json'), `${JSON.stringify(scenario, null, 2)}\n`)
    writeFileSync(
      join(root, 'scenario-definition.sha256'),
      `${policy.scenarioDefinitionHash(scenario)}  ${skill}:${scenario.id}\n`,
    )
    writeFileSync(join(root, 'input-manifest.sha256'), inputManifest)
    writeFileSync(join(root, 'skill-hashes.txt'), `${targetLine}\n${siblingLine}\n`)
    writeFileSync(
      join(root, 'capabilities.json'),
      `${JSON.stringify({
        auth: execution.auth,
        browser: execution.browser,
        media: execution.media,
        sandbox: execution.sandbox,
        subagents: execution.subagents,
      })}\n`,
    )
    writeFileSync(join(root, 'execution.json'), `${JSON.stringify(execution)}\n`)
    const evidenceText = `${JSON.stringify(metadata, null, 2)}\n`
    writeFileSync(join(root, 'evidence.json'), evidenceText)
    writeFileSync(join(root, 'trace.jsonl'), `${JSON.stringify({ type: 'turn.completed' })}\n`)

    const observation = policy.inspectRetainedRun(root, metadata)
    assert.equal(policy.hashEvidenceMetadata(root), sha256(evidenceText))
    const sourceSnapshot = policy.retainedSurfacesSnapshot(root, canaries)
    const metadataRecord = policy.readEvidenceMetadataRecord(root)
    assert.equal(metadataRecord.sha256, sourceSnapshot.fileSha256.get('evidence.json'))
    writeFileSync(
      join(root, 'evidence.json'),
      `${JSON.stringify({ ...metadata, deadline_ms: metadata.deadline_ms + 1 }, null, 2)}\n`,
    )
    const transientRecord = policy.readEvidenceMetadataRecord(root)
    writeFileSync(join(root, 'evidence.json'), evidenceText)
    assert.equal(policy.retainedSurfacesSnapshot(root, canaries).snapshotSha256, sourceSnapshot.snapshotSha256)
    assert.notEqual(
      transientRecord.sha256,
      policy.retainedSurfacesSnapshot(root, canaries).fileSha256.get('evidence.json'),
    )
    assert.deepEqual(observation.currentness, metadata.evidence.currentness)
    assert.deepEqual(observation.provenance, metadata.provenance)
    assert.equal(
      policy.assertRetainedRunPolicy({
        root,
        metadata,
        observed: observation.currentness,
        provenance: observation.provenance,
        canaries,
        currentHome: '/home/test',
      }),
      metadata,
    )
    rmSync(join(root, 'execution.json'))
    assert.throws(() => policy.inspectRetainedRun(root, metadata), /execution profile does not exist/)
    writeFileSync(join(root, 'execution.json'), `${JSON.stringify(execution)}\n`)

    const forgedCurrentness = {
      ...metadata,
      evidence: {
        ...metadata.evidence,
        currentness: { ...metadata.evidence.currentness, scenario_prompt_sha256: sha256('forged prompt') },
      },
    }
    assert.throws(() => policy.inspectRetainedRun(root, forgedCurrentness), /currentness/)
    const forgedProvenance = {
      ...metadata,
      provenance: { ...metadata.provenance, dependency_skill_tree_sha256: 'f'.repeat(64) },
    } as EvidenceMetadata
    assert.throws(() => policy.inspectRetainedRun(root, forgedProvenance), /provenance/)

    const emptySiblingScenario = {
      id: 'empty-sibling',
      prompt: scenario.prompt,
      expected_output: scenario.expected_output,
      assertions: scenario.assertions,
      files: scenario.files,
      comparison: scenario.comparison,
    }
    const emptySiblingPrompt = policy.modelPromptComponents(skill, emptySiblingScenario, 'target-absent')
    const emptySiblingMetadata = policy.createModelEvidenceMetadata({
      skill,
      scenario: emptySiblingScenario,
      arm: 'target-absent',
      scenarioSha256: policy.scenarioDefinitionHash(emptySiblingScenario),
      inputManifestSha256: sha256(inputManifest),
      targetSkillTreeSha256: null,
      dependencySkillTreeSha256: sha256(''),
      prompt: emptySiblingPrompt.renderedPrompt,
      promptGuard: emptySiblingPrompt.promptGuard,
      privacyCanaries: canaries,
      currentHome: '/home/test',
      counterpartEvidenceSha256: retainedCandidateHash,
      execution,
      deadlineMs: 60_000,
    })
    writeFileSync(join(root, 'scenario-definition.json'), `${JSON.stringify(emptySiblingScenario, null, 2)}\n`)
    writeFileSync(
      join(root, 'scenario-definition.sha256'),
      `${policy.scenarioDefinitionHash(emptySiblingScenario)}  ${skill}:${emptySiblingScenario.id}\n`,
    )
    writeFileSync(join(root, 'skill-hashes.txt'), '\n')
    writeFileSync(join(root, 'evidence.json'), `${JSON.stringify(emptySiblingMetadata, null, 2)}\n`)
    const emptySiblingObservation = policy.inspectRetainedRun(root, emptySiblingMetadata)
    assert.equal(emptySiblingObservation.provenance.target_skill_tree_sha256, null)
    assert.equal(emptySiblingObservation.provenance.dependency_skill_tree_sha256, sha256(''))

    const snapshotBeforeStatus = policy.retainedSurfacesSha256(root, canaries)
    writeFileSync(join(root, 'status.txt'), 'status: changed after validation\n')
    assert.notEqual(policy.retainedSurfacesSha256(root, canaries), snapshotBeforeStatus)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('terminal trace validation rejects missing, duplicate, failed and non-final events', () => {
  const item = JSON.stringify({ type: 'item.completed' })
  const completed = JSON.stringify({ type: 'turn.completed', usage: {} })
  assert.deepEqual(policy.terminalTurnEvent(`${item}\n${completed}\n`), { type: 'turn.completed', usage: {} })
  assert.throws(() => policy.terminalTurnEvent(`${item}\n`), /exactly one terminal turn event/)
  assert.throws(() => policy.terminalTurnEvent(`${completed}\n${completed}\n`), /exactly one terminal turn event/)
  assert.throws(() => policy.terminalTurnEvent(`${JSON.stringify({ type: 'turn.failed' })}\n`), /failed turn/)
  assert.throws(() => policy.terminalTurnEvent(`${completed}\n${item}\n`), /must be the final/)
  assert.throws(() => policy.terminalTurnEvent('{not json}\n'), /not JSON/)
})

test('retained trace reading rejects links and special files before parsing', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-trace-'))
  try {
    writeFileSync(join(root, 'safe.jsonl'), `${JSON.stringify({ type: 'turn.completed' })}\n`)
    symlinkSync(join(root, 'safe.jsonl'), join(root, 'trace.jsonl'))
    assert.throws(() => policy.readRetainedTrace(root), /symbolic link/)
    rmSync(join(root, 'trace.jsonl'), { force: true })
    writeFileSync(join(root, 'trace.jsonl'), 'safe\n')
    assert.equal(policy.readRetainedTrace(root), 'safe\n')
    truncateSync(join(root, 'trace.jsonl'), 128 * 1024 * 1024 + 1)
    assert.throws(() => policy.readRetainedTrace(root), /exceeds/)
    rmSync(join(root, 'trace.jsonl'), { force: true })
    if (process.platform === 'win32') return
    const fifo = join(root, 'trace.jsonl')
    const madeFifo = spawnSync('mkfifo', [fifo], { encoding: 'utf8' })
    if (madeFifo.status !== 0) {
      t.skip(`mkfifo is unavailable: ${madeFifo.stderr}`)
      return
    }
    const moduleUrl = new URL('./skill-evals/evidence-policy.mjs', import.meta.url).href
    const script = `const p = await import(${JSON.stringify(moduleUrl)}); try { p.readRetainedTrace(${JSON.stringify(root)}) } catch (error) { console.error(error.message); process.exit(2) }`
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      timeout: 3_000,
    })
    assert.notEqual(result.status, 0)
    assert.equal(result.signal, null, 'trace validation blocked on a FIFO')
    assert.match(String(result.stderr), /not a regular file/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('retained metadata uses the safe regular-file boundary and redacts absolute paths', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-metadata-'))
  try {
    writeFileSync(join(root, 'safe.json'), '{}\n')
    symlinkSync(join(root, 'safe.json'), join(root, 'evidence.json'))
    assert.throws(() => policy.readEvidenceMetadata(root), /symbolic link/)
    rmSync(join(root, 'evidence.json'), { force: true })
    writeFileSync(join(root, 'evidence.json'), '{}\n')
    assert.deepEqual(policy.readEvidenceMetadata(root), {})
    truncateSync(join(root, 'evidence.json'), 300 * 1024)
    assert.throws(() => policy.readEvidenceMetadata(root), /exceeds/)
    rmSync(join(root, 'evidence.json'), { force: true })
    if (process.platform === 'win32') return
    const fifo = join(root, 'evidence.json')
    const madeFifo = spawnSync('mkfifo', [fifo], { encoding: 'utf8' })
    if (madeFifo.status !== 0) {
      t.skip(`mkfifo is unavailable: ${madeFifo.stderr}`)
      return
    }
    const moduleUrl = new URL('./skill-evals/evidence-policy.mjs', import.meta.url).href
    const script = `const p = await import(${JSON.stringify(moduleUrl)}); try { p.readEvidenceMetadata(${JSON.stringify(root)}) } catch (error) { console.error(error.message); process.exit(2) }`
    const fifoResult = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      timeout: 3_000,
    })
    assert.notEqual(fifoResult.status, 0)
    assert.equal(fifoResult.signal, null, 'metadata validation blocked on a FIFO')
    assert.match(String(fifoResult.stderr), /not a regular file/)
    rmSync(fifo, { force: true })
    if (process.getuid?.() === 0) return
    const unsafeRoot = join(tmpdir(), 'PRIVACY_CANARY_7f6c1d-root')
    try {
      mkdirSync(unsafeRoot, { recursive: true })
      const metadataPath = join(unsafeRoot, 'evidence.json')
      writeFileSync(metadataPath, '{}\n')
      chmodSync(metadataPath, 0o000)
      assert.throws(
        () => policy.readEvidenceMetadata(unsafeRoot),
        (error: unknown) => {
          assert.ok(error instanceof Error)
          assert.doesNotMatch(error.message, /PRIVACY_CANARY_7f6c1d/)
          return true
        },
      )
      assert.throws(
        () => policy.hashEvidenceMetadata(unsafeRoot),
        (error: unknown) => {
          assert.ok(error instanceof Error)
          assert.doesNotMatch(error.message, /PRIVACY_CANARY_7f6c1d/)
          return true
        },
      )
      chmodSync(metadataPath, 0o600)
    } finally {
      rmSync(unsafeRoot, { recursive: true, force: true })
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('retained root and directory inspection errors redact canary-bearing paths', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('permission denial cannot be produced for this process')
    return
  }
  const canary = 'PRIVACY_CANARY_7f6c1d'
  const inaccessibleParent = join(tmpdir(), `${canary}-parent`)
  const unavailableRoot = join(inaccessibleParent, 'run')
  const unreadableRoot = join(tmpdir(), `${canary}-root`)
  const lockedDirectory = join(unreadableRoot, 'locked')
  mkdirSync(unavailableRoot, { recursive: true })
  mkdirSync(lockedDirectory, { recursive: true })
  writeFileSync(join(unreadableRoot, 'safe.txt'), 'safe\n')
  const assertRedacted = (operation: () => unknown) => {
    assert.throws(operation, (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /safe inspection/)
      assert.doesNotMatch(error.message, new RegExp(canary))
      return true
    })
  }
  try {
    chmodSync(inaccessibleParent, 0o000)
    assertRedacted(() => policy.readEvidenceMetadata(unavailableRoot))
    assertRedacted(() => policy.hashEvidenceMetadata(unavailableRoot))
    assertRedacted(() => policy.scanRetainedSurfaces(unavailableRoot, [{ set: 'fixture', value: canary }]))
    chmodSync(inaccessibleParent, 0o700)

    chmodSync(unreadableRoot, 0o000)
    assertRedacted(() => policy.scanRetainedSurfaces(unreadableRoot, [{ set: 'fixture', value: canary }]))
    chmodSync(unreadableRoot, 0o700)

    chmodSync(lockedDirectory, 0o000)
    assertRedacted(() => policy.scanRetainedSurfaces(unreadableRoot, [{ set: 'fixture', value: canary }]))
    chmodSync(lockedDirectory, 0o700)
  } finally {
    chmodSync(inaccessibleParent, 0o700)
    chmodSync(unreadableRoot, 0o700)
    chmodSync(lockedDirectory, 0o700)
    rmSync(inaccessibleParent, { recursive: true, force: true })
    rmSync(unreadableRoot, { recursive: true, force: true })
  }
})

test('retained-surface canary scanning covers text, logs, JSONL and binary artifacts', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-privacy-'))
  const canaries = [{ set: 'fixture', value: 'PRIVACY_CANARY_7f6c1d' }]
  try {
    mkdirSync(join(root, 'artifact'))
    writeFileSync(join(root, 'final.md'), 'safe\n')
    writeFileSync(join(root, 'trace.jsonl'), '{"type":"item.completed"}\n')
    writeFileSync(join(root, 'stderr.log'), 'safe\n')
    writeFileSync(join(root, 'artifact/data.bin'), Buffer.from([0, 1, 2, 3]))
    assert.deepEqual(policy.scanRetainedSurfaces(root, canaries), { files: 4 })
    for (const surface of ['final.md', 'trace.jsonl', 'stderr.log', 'artifact/data.bin']) {
      writeFileSync(join(root, surface), Buffer.from(`prefix ${canaries[0]?.value} suffix`))
      assert.throws(() => policy.scanRetainedSurfaces(root, canaries), new RegExp(surface))
      writeFileSync(join(root, surface), 'safe\n')
    }
    symlinkSync(join(root, 'final.md'), join(root, 'linked.md'))
    assert.throws(() => policy.scanRetainedSurfaces(root, canaries), /symbolic link/)
    rmSync(join(root, 'linked.md'), { force: true })
    if (process.platform === 'win32') return
    const fifo = join(root, 'neutral-pipe')
    const madeFifo = spawnSync('mkfifo', [fifo], { encoding: 'utf8' })
    if (madeFifo.status !== 0) {
      t.skip(`mkfifo is unavailable: ${madeFifo.stderr}`)
      return
    }
    const moduleUrl = new URL('./skill-evals/evidence-policy.mjs', import.meta.url).href
    const script = `const p = await import(${JSON.stringify(moduleUrl)}); try { p.scanRetainedSurfaces(${JSON.stringify(root)}, ${JSON.stringify(canaries)}) } catch (error) { console.error(error.message); process.exit(2) }`
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      timeout: 3_000,
    })
    assert.notEqual(result.status, 0)
    assert.equal(result.signal, null, 'canary scanning blocked on a FIFO')
    assert.match(String(result.stderr), /non-regular entry/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('canary scanning covers retained paths and matches across stream chunk boundaries', () => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-privacy-boundary-'))
  const canaries = [{ set: 'fixture', value: 'PRIVACY_CANARY_7f6c1d' }]
  try {
    writeFileSync(join(root, 'safe.txt'), 'safe\n')
    assert.throws(
      () => policy.scanRetainedSurfaces(root, canaries, { extraPaths: ['evidence/PRIVACY_CANARY_7f6c1d'] }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /retained path/)
        assert.doesNotMatch(error.message, /PRIVACY_CANARY_7f6c1d/)
        return true
      },
    )
    const unsafeDirectory = join(root, canaries[0]?.value ?? '')
    mkdirSync(unsafeDirectory)
    writeFileSync(join(unsafeDirectory, 'safe.txt'), 'safe\n')
    assert.throws(
      () => policy.scanRetainedSurfaces(root, canaries),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /retained path/)
        assert.doesNotMatch(error.message, /PRIVACY_CANARY_7f6c1d/)
        return true
      },
    )
    rmSync(unsafeDirectory, { recursive: true, force: true })
    const unsafeLink = join(root, `${canaries[0]?.value ?? ''}-link`)
    symlinkSync(join(root, 'safe.txt'), unsafeLink)
    assert.throws(
      () => policy.scanRetainedSurfaces(root, canaries),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /retained path/)
        assert.doesNotMatch(error.message, /PRIVACY_CANARY_7f6c1d/)
        return true
      },
    )
    rmSync(unsafeLink, { force: true })
    if (process.platform !== 'win32') {
      const unsafePipe = join(root, `${canaries[0]?.value ?? ''}-pipe`)
      const madePipe = spawnSync('mkfifo', [unsafePipe], { encoding: 'utf8' })
      assert.equal(madePipe.status, 0, madePipe.stderr)
      assert.throws(
        () => policy.scanRetainedSurfaces(root, canaries),
        (error: unknown) => {
          assert.ok(error instanceof Error)
          assert.match(error.message, /retained path/)
          assert.doesNotMatch(error.message, /PRIVACY_CANARY_7f6c1d/)
          return true
        },
      )
      rmSync(unsafePipe, { force: true })
    }
    const prefix = Buffer.alloc(64 * 1024 - 5, 0x61)
    writeFileSync(join(root, 'boundary.bin'), Buffer.concat([prefix, Buffer.from(canaries[0]?.value ?? '')]))
    assert.throws(() => policy.scanRetainedSurfaces(root, canaries), /boundary\.bin/)
    writeFileSync(join(root, 'boundary.bin'), 'safe\n')
    assert.throws(() => policy.scanRetainedSurfaces(root, []), /non-empty/)
    assert.throws(() => policy.assertNoPrivacyCanariesInText('final', canaries[0]?.value ?? '', canaries), /final/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('common retained-run validation rejects stale evidence and leaked canaries', () => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-policy-run-'))
  const canaries = scopeCanaries()
  const metadata = behaviorMetadata(canaries, '/home/test')
  const observed = {
    scenario_sha256: hashA,
    input_manifest_sha256: hashB,
    scenario_prompt_sha256: sha256('Behavior scenario prompt.'),
    arm_instruction_sha256: sha256('Use the installed skill. '),
    prompt_guard_sha256: sha256('Work only inside the current project.'),
    rendered_prompt_sha256: sha256(
      'Behavior scenario prompt.\n\nUse the installed skill. Work only inside the current project.',
    ),
    execution_sha256: metadata.evidence.currentness.execution_sha256,
  }
  const provenance = {
    target_skill_tree_sha256: hashC,
    dependency_skill_tree_sha256: sha256(''),
  }
  try {
    writeFileSync(join(root, 'trace.jsonl'), `${JSON.stringify({ type: 'turn.completed', usage: {} })}\n`)
    assert.equal(
      policy.assertRetainedRunPolicy({ root, metadata, observed, provenance, canaries, currentHome: '/home/test' }),
      metadata,
    )
    writeFileSync(join(root, 'final.md'), canaries[0]?.value)
    assert.throws(
      () =>
        policy.assertRetainedRunPolicy({
          root,
          metadata,
          observed,
          provenance,
          canaries,
          currentHome: '/home/test',
        }),
      /canary/,
    )
    writeFileSync(join(root, 'final.md'), 'safe\n')
    assert.throws(
      () =>
        policy.assertRetainedRunPolicy({
          root,
          metadata,
          observed,
          provenance: { ...provenance, target_skill_tree_sha256: 'd'.repeat(64) },
          canaries,
          currentHome: '/home/test',
        }),
      /provenance differs/,
    )
    assert.equal(
      policy.assertRetainedRunPolicy({
        root,
        metadata,
        observed,
        provenance,
        canaries: scopeCanaries('/home/other'),
      }),
      metadata,
    )
    assert.throws(
      () =>
        policy.assertRetainedRunPolicy({
          root,
          metadata: {
            ...metadata,
            privacy: { ...metadata.privacy, scope_sha256: 'e'.repeat(64) },
          },
          observed,
          provenance,
          canaries,
          currentHome: '/home/test',
        }),
      /supplied canaries/,
    )
    assert.throws(
      () =>
        policy.createModelEvidenceMetadata({
          skill: 'dsh-spec-example',
          scenario: { id: 'example-behavior', prompt: 'Behavior scenario prompt.' },
          arm: 'target-present',
          scenarioSha256: hashA,
          inputManifestSha256: hashB,
          targetSkillTreeSha256: hashC,
          dependencySkillTreeSha256: sha256(''),
          prompt: 'Behavior scenario prompt.\n\nUse the installed skill. Work only inside the current project.',
          armInstruction: 'Use the installed skill. ',
          promptGuard: 'Work only inside the current project.',
          privacyCanaries: [{ set: 'fixture', value: 'PRIVACY_CANARY_7f6c1d' }],
          execution,
        }),
      /subject-required/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('model evidence requires every subject-selected privacy set and a portable current-home identity', () => {
  const create = (privacyCanaries: Array<{ set: string; value: string }>, currentHome = '/home/test') =>
    policy.createModelEvidenceMetadata({
      skill: 'dsh-spec-performance-investigation',
      scenario: {
        id: 'private-corpus-remains-aggregate',
        prompt: 'Private corpus prompt.',
      },
      arm: 'target-present',
      scenarioSha256: hashA,
      inputManifestSha256: hashB,
      targetSkillTreeSha256: hashC,
      dependencySkillTreeSha256: sha256(''),
      prompt: 'Private corpus prompt.\n\nUse the installed skill. Work only inside the current project.',
      armInstruction: 'Use the installed skill. ',
      promptGuard: 'Work only inside the current project.',
      privacyCanaries,
      currentHome,
      execution,
    })
  const valid = policy.privacyCanariesFor('dsh-spec-performance-investigation', 'private-corpus-remains-aggregate', {
    includeCurrentHome: true,
    currentHome: '/home/test',
  })
  assert.doesNotThrow(() => create(valid))
  assert.throws(() => create(valid.filter((canary) => canary.set !== 'current-home')), /subject-required/)
  assert.throws(() => create(valid.filter((canary) => canary.set !== 'private-performance-corpus')), /subject-required/)
  assert.throws(() => create([...valid, { set: 'extra', value: 'extra' }]), /subject-required/)
  assert.doesNotThrow(() =>
    create(valid.map((canary) => (canary.set === 'current-home' ? { ...canary, value: '/home/other' } : canary))),
  )
  assert.throws(() => create([...valid, { set: 'local-environment', value: '/extra' }]), /subject-required values/)
})

test('recorded privacy scope is location-independent while live scanning uses the verifier home', () => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-policy-portable-privacy-'))
  try {
    const authorHome = '/home/author'
    const verifierHome = '/home/verifier'
    const authorCanaries = policy.privacyCanariesFor('dsh-spec-example', 'example-behavior', {
      includeCurrentHome: true,
      currentHome: authorHome,
    })
    const verifierCanaries = policy.privacyCanariesFor('dsh-spec-example', 'example-behavior', {
      includeCurrentHome: true,
      currentHome: verifierHome,
    })
    assert.equal(policy.privacyScopeSha256(authorCanaries), policy.privacyScopeSha256(verifierCanaries))
    const metadata = behaviorMetadata(authorCanaries, authorHome)
    const observed = {
      scenario_sha256: hashA,
      input_manifest_sha256: hashB,
      scenario_prompt_sha256: sha256('Behavior scenario prompt.'),
      arm_instruction_sha256: sha256('Use the installed skill. '),
      prompt_guard_sha256: sha256('Work only inside the current project.'),
      rendered_prompt_sha256: sha256(
        'Behavior scenario prompt.\n\nUse the installed skill. Work only inside the current project.',
      ),
      execution_sha256: metadata.evidence.currentness.execution_sha256,
    }
    const provenance = {
      target_skill_tree_sha256: hashC,
      dependency_skill_tree_sha256: sha256(''),
    }
    writeFileSync(join(root, 'trace.jsonl'), `${JSON.stringify({ type: 'turn.completed', usage: {} })}\n`)
    writeFileSync(join(root, 'final.md'), `safe\n${verifierHome}\n`)
    assert.throws(
      () =>
        policy.assertRetainedRunPolicy({
          root,
          metadata,
          observed,
          provenance,
          canaries: verifierCanaries,
        }),
      /canary/,
    )
    writeFileSync(join(root, 'final.md'), 'safe\n')
    assert.doesNotThrow(() =>
      policy.assertRetainedRunPolicy({
        root,
        metadata,
        observed,
        provenance,
        canaries: verifierCanaries,
      }),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('privacy canaries derive current-home and do not embed a contributor home', () => {
  const source = readFileSync(join(import.meta.dirname, 'skill-evals', 'evidence-policy.mjs'), 'utf8')
  assert.doesNotMatch(source, /\/home\/dreamstar/)
  const currentHome = '/synthetic/current-home'
  const subjectCanaries = policy.privacyCanariesFor('dsh-spec-example', 'example-behavior', {
    includeCurrentHome: true,
    currentHome,
  })
  assert.deepEqual(
    subjectCanaries.filter((canary) => canary.set === 'current-home'),
    [{ set: 'current-home', value: currentHome }],
  )
  assert.deepEqual(
    subjectCanaries.filter((canary) => canary.set === 'local-environment').map((canary) => canary.value),
    ['/mnt/c/Users/', '/home/conda'],
  )
  assert.ok(policy.allPrivacyCanaries({ currentHome }).some((canary) => canary.value === currentHome))
})

test('committed evidence has no configured privacy canary on any retained surface', () => {
  const result = policy.scanRetainedSurfaces(
    join(import.meta.dirname, 'skill-evals', 'evidence'),
    policy.allPrivacyCanaries(),
    {
      skip: (relativePath) => {
        const components = relativePath.split('/')
        return (
          components[0]?.startsWith('2099-') === true ||
          components.some((component) => component.startsWith('.run-') || component.endsWith('.lock'))
        )
      },
    },
  )
  assert.ok(result.files > 1000, 'the canary scan covered no meaningful evidence corpus')
})

test('the privacy canary set covers every high-confidence value in the private fixture', () => {
  const telemetry = readFileSync(
    join(
      import.meta.dirname,
      'skill-evals',
      'dsh-spec-performance-investigation',
      'evals',
      'files',
      'private-corpus',
      'telemetry.jsonl',
    ),
    'utf8',
  )
  const configured = new Set(policy.allPrivacyCanaries().map((canary) => canary.value))
  const sensitive = [
    ...telemetry.matchAll(
      /\b[A-Z]+-SECRET-\d+\b|[\w.+-]+@[\w.-]+\.\w+|\/(?:home|mnt\/private)\/[^"\s]+|session-[a-z]+-private|sk-[a-z0-9-]+|\b4\d{15}\b/g,
    ),
  ].map((match) => match[0])
  assert.ok(sensitive.length >= 35, 'the private fixture exposed too few distinctive values')
  for (const value of sensitive) assert.ok(configured.has(value), `missing privacy canary for ${value}`)
})

test('a child that exceeds the run deadline is terminated', async () => {
  const started = performance.now()
  const result = await safety.runInterruptible(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
    undefined,
    { deadlineMs: 100 },
  )
  assert.equal(result.timedOut, true)
  assert.ok(result.signal !== null || result.status !== 0)
  assert.ok(performance.now() - started < 5_000, 'deadline cleanup did not settle promptly')
})

test('host-side processing cannot promote after the run deadline', () => {
  assert.equal(policy.remainingRunDeadline(1_500, 1_000), 500)
  assert.throws(() => policy.remainingRunDeadline(1_000, 1_000), /exceeded its deadline/)
})
