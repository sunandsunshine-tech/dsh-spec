/**
 * Development-side model scenarios for isolated-context capabilities, Agent Notes companion
 * defaults, Translate Docs scoped authorization, the forge's capability conclusions and
 * error-contract judgment.
 *
 * The source corpus lives under tests/ because skills/ is a distribution artifact. The tests stage
 * a temporary skill copy with the corpus at the official evals/ path. They validate the scenario
 * contract, not a model run.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { test } from 'node:test'

import { REPO_ROOT } from './helpers/fixtures.ts'

interface Scenario {
  id: string
  prompt: string
  expected_output: string
  assertions: string[]
  files?: string[]
}

interface ScenarioCorpus {
  skill_name: string
  evals: Scenario[]
}

interface StagedSkill {
  temporaryRoot: string
  skillRoot: string
}

interface RequiredProfile {
  skill: string
  ids: string[]
  noIsolationIds: string[]
  isolatedIds: string[]
  handoffIds: string[]
}

const REQUIRED: RequiredProfile[] = [
  {
    skill: 'dsh-spec-translate-docs',
    ids: [
      'no-isolation-local-update-completes',
      'no-isolation-whole-document-handoff',
      'isolated-context-whole-document',
      'owner-authorizes-one-source-scope',
      'ambiguous-target-grants-no-default-pair',
      'explicit-multiple-targets-create-pairs',
      'progressive-target-addition-single-source',
      'target-removal-active-scope',
      'range-operation-does-not-create-missing-target',
    ],
    noIsolationIds: ['no-isolation-local-update-completes', 'no-isolation-whole-document-handoff'],
    isolatedIds: ['isolated-context-whole-document'],
    handoffIds: ['no-isolation-whole-document-handoff'],
  },
  {
    skill: 'dsh-spec-find-simplifications',
    ids: [
      'no-isolation-broad-audit-runs-in-separate-passes',
      'no-isolation-boundary-handoff',
      'isolated-context-fanout',
    ],
    noIsolationIds: ['no-isolation-broad-audit-runs-in-separate-passes', 'no-isolation-boundary-handoff'],
    isolatedIds: ['isolated-context-fanout'],
    handoffIds: ['no-isolation-boundary-handoff'],
  },
]

const FORGE_REQUIRED: RequiredProfile = {
  skill: 'dsh-spec-skill-forge',
  ids: ['capability-dependent-fallback-design'],
  noIsolationIds: [],
  isolatedIds: [],
  handoffIds: [],
}

interface GeneralRequirement {
  id: string
  signature: RegExp[]
  expectedOutput?: RegExp[]
  assertions: RegExp[]
}

interface GeneralProfile {
  skill: string
  scenarios: GeneralRequirement[]
}

const GENERAL_REQUIRED: GeneralProfile[] = [
  {
    skill: 'dsh-spec-error-handling',
    scenarios: [
      {
        id: 'message-only-failure-gets-machine-identity',
        signature: [/stable machine-readable discriminant/i, /without parsing its message/i],
        expectedOutput: [/stable machine-readable discriminant/i, /exact identity and resulting state/i],
        assertions: [
          /machine-readable failure identity/i,
          /consumer action/i,
          /not used for machine routing/i,
          /exact identity and resulting state/i,
        ],
      },
      {
        id: 'worker-boundary-preserves-failure-identity',
        signature: [/worker boundary/i, /serializes only the message/i],
        expectedOutput: [
          /portable machine identity/i,
          /equivalent owning failure/i,
          /cause or equivalent structured detail/i,
        ],
        assertions: [
          /portable machine identity cross/i,
          /equivalent owning failure/i,
          /cause or equivalent structured detail/i,
          /boundary test/i,
        ],
      },
      {
        id: 'silent-handler-covers-one-safe-failure',
        signature: [/cleanup, commit, and notification/i, /discards every failure/i],
        expectedOutput: [/narrowed to the expected cleanup failure/i, /lets commit and notification failures surface/i],
        assertions: [
          /silent scope contains one operation/i,
          /stable discriminant/i,
          /reason states why discarding.*state valid/i,
          /unexpected failures/i,
        ],
      },
      {
        id: 'existing-project-identity-remains-authoritative',
        signature: [/existing machine identity/i, /Project.*kind/i],
        expectedOutput: [/does not add `name` or `code`/i, /exact `kind` and resulting state/i],
        assertions: [
          /kind.*machine identity/i,
          /No competing.*name.*code/i,
          /exact.*kind.*resulting state/i,
          /message is not used for machine routing/i,
        ],
      },
      {
        id: 'numeric-exit-identity-survives-without-cause-chain',
        signature: [/no cause chain/i, /numeric failure identity/i],
        expectedOutput: [
          /exact numeric exit status/i,
          /stderr in structured diagnostics/i,
          /does not replace the numeric identity with a string code/i,
        ],
        assertions: [
          /exact numeric exit status/i,
          /different consumer actions/i,
          /stderr in structured diagnostics/i,
          /No string code replaces the numeric identity/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-agent-notes',
    scenarios: [
      {
        id: 'enabled-translation-defaults-bilingual',
        signature: [/Chinese counterpart/i, /consistency record/i, /project instructions select Chinese/i],
        assertions: [/counterpart and consistency record/i, /AGENTS\.md/i],
      },
      {
        id: 'no-translation-defaults-english-only',
        signature: [/no translation mechanism/i, /English-only/i],
        assertions: [/English-only/i, /No translation companion/i],
      },
      {
        id: 'user-selects-english-only',
        signature: [/explicit English-only request/i, /overrides/i],
        assertions: [/current request.*wins/i, /No counterpart/i],
      },
      {
        id: 'project-override-bounds-language-and-scope',
        signature: [/project override/i, /Japanese/i, /notes\/proposed/i],
        assertions: [/Japanese.*implemented public note/i, /proposed.*English-only/i, /exclusions/i],
      },
      {
        id: 'translation-failure-stays-incomplete',
        signature: [/Japanese terminology table is invalid/i, /unfinished unit/i],
        assertions: [/source, target, failed step/i, /not sealed/i],
      },
      {
        id: 'installed-skill-is-not-enabled',
        signature: [/skill is installed/i, /not enable/i],
        assertions: [/Installed skill text is not treated as a project override/i, /English-only/i],
      },
      {
        id: 'no-peer-uses-user-language',
        signature: [/no complete peer pair/i, /user language is Japanese/i],
        assertions: [/Japanese/i, /does not choose Chinese/i],
      },
      {
        id: 'unavailable-translation-defaults-english-only',
        signature: [/translation workflow is unavailable/i, /English-only/i],
        assertions: [/unavailable translation capability/i, /No counterpart/i],
      },
      {
        id: 'existing-note-first-archive-uses-ladder',
        signature: [/Git checkout/i, /Translate Docs/i, /seal plan/i, /readiness/i],
        assertions: [/before moving/i, /readiness.*seal/i, /complete selected unit/i],
      },
      {
        id: 'non-translation-companion-survives',
        signature: [/non-translation/i, /\.metadata\.yaml/i],
        assertions: [/English-only removes only a translation companion/i, /metadata companion remains/i],
      },
      {
        id: 'existing-notes-are-not-backfilled',
        signature: [/new implemented process decision/i, /unchanged/i],
        assertions: [/new note follows/i, /No existing active note is backfilled/i, /sealed unit remains unchanged/i],
      },
      {
        id: 'explicit-multiple-targets',
        signature: [/Chinese and Japanese/i, /one note unit/i],
        assertions: [/each target.*counterpart/i, /common consistency record/i],
      },
      {
        id: 'same-class-targets-inferred',
        signature: [/same class/i, /complete (?:note )?pair/i, /user language is English/i],
        assertions: [/Chinese and Japanese/i, /before.*user.language/i],
      },
      {
        id: 'source-language-user-language-no-pair',
        signature: [/user language is English/i, /source.*English/i],
        assertions: [/does not create an English counterpart/i, /free of a redundant translation companion/i],
      },
      {
        id: 'conflicting-peer-targets-no-arbitrary-default',
        signature: [/peer pairs.*different target sets/i, /without asking/i],
        assertions: [/does not choose Chinese or Japanese arbitrarily/i, /No counterpart/i],
      },
      {
        id: 'progressive-target-addition',
        signature: [/policy now adds Japanese/i, /modify only/i],
        assertions: [/modified note.*Japanese/i, /untouched note.*unchanged/i, /new note.*both/i],
      },
      {
        id: 'target-removal-active-only',
        signature: [/removes Japanese/i, /active scope/i, /sealed.*unchanged/i],
        assertions: [/every eligible active unit.*Japanese/i, /sealed unit.*unchanged/i],
      },
      {
        id: 'archive-readiness-required',
        signature: [/prepare/i, /readiness check fails/i],
        assertions: [/does not seal/i, /manifest.*unchanged/i, /failed step/i],
      },
      {
        id: 'external-companion-mechanism',
        signature: [/without the repository's Translate Docs skill/i, /review-companion mechanism/i],
        assertions: [/--member path mapping/i, /different-stem nested review companion/i],
      },
    ],
  },
]

const ALL_REQUIRED = [...REQUIRED, FORGE_REQUIRED, ...GENERAL_REQUIRED]

const EVAL_SOURCE_ROOT = join(REPO_ROOT, 'tests', 'skill-evals')

function scenarioPath(skill: string): string {
  return join(EVAL_SOURCE_ROOT, skill, 'evals', 'evals.json')
}

function readCorpus(skill: string): ScenarioCorpus {
  return JSON.parse(readFileSync(scenarioPath(skill), 'utf8')) as ScenarioCorpus
}

function stageSkillWithEvals(skill: string): StagedSkill {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'skill-evals-'))
  const skillRoot = join(temporaryRoot, skill)
  cpSync(join(REPO_ROOT, 'skills', skill), skillRoot, { recursive: true })
  cpSync(join(EVAL_SOURCE_ROOT, skill, 'evals'), join(skillRoot, 'evals'), { recursive: true })
  for (const scenario of readCorpus(skill).evals) {
    for (const file of scenario.files ?? []) {
      const match = /\/\.agents\/skills\/([^/]+)\//.exec(file)
      if (match?.[1] === undefined || match[1] === skill) continue
      const sibling = match[1]
      const siblingSource = join(REPO_ROOT, 'skills', sibling)
      if (!existsSync(siblingSource)) continue
      const projectRoot = join(skillRoot, file.slice(0, match.index))
      cpSync(siblingSource, join(projectRoot, '.agents', 'skills', sibling), {
        recursive: true,
        force: true,
      })
    }
  }
  return { temporaryRoot, skillRoot }
}

function assertInputFile(skillRoot: string, file: string, label: string): void {
  assert.ok(file.startsWith('evals/files/'), label + ' names an input outside evals/files/')
  const absolute = join(skillRoot, file)
  assert.ok(existsSync(absolute), label + ' input does not exist: ' + file)
  const resolved = realpathSync(absolute)
  const inputRoot = realpathSync(join(skillRoot, 'evals', 'files')) + sep
  assert.ok(resolved.startsWith(inputRoot), label + ' input escapes evals/files: ' + file)
  const stat = statSync(resolved)
  assert.ok(stat.isFile(), label + ' input is not a regular file: ' + file)
  assert.ok(stat.size > 0, label + ' input is empty: ' + file)
}

function validateCorpus(corpus: ScenarioCorpus, required: RequiredProfile): void {
  assert.equal(corpus.skill_name, required.skill)
  assert.ok(corpus.evals.length > 0, 'an empty eval corpus is not a passing corpus')
  const byId = new Map(corpus.evals.map((scenario) => [scenario.id, scenario]))
  assert.equal(byId.size, corpus.evals.length, 'eval ids must be unique')
  for (const id of required.ids) assert.ok(byId.has(id), required.skill + ' must include ' + id)

  for (const id of required.noIsolationIds) {
    const scenario = byId.get(id)
    assert.ok(scenario)
    assert.match(scenario.prompt, /no subagents?|no isolated contexts?|no parallel execution/i)
    assertNonEmptyStrings(scenario.assertions, id + ' assertions')
  }
  for (const id of required.isolatedIds) {
    const scenario = byId.get(id)
    assert.ok(scenario)
    assert.match(scenario.prompt, /isolated subagents?|isolated contexts?/i)
    assertNonEmptyStrings(scenario.assertions, id + ' assertions')
  }
  for (const id of required.handoffIds) {
    const scenario = byId.get(id)
    assert.ok(scenario)
    assert.match(
      scenario.prompt,
      /no clean-context|no staged independent|no .*verification mechanism/i,
      id + ' must exclude the documented fallback mechanisms',
    )
    assert.match(scenario.expected_output, /hands? off|handoff|stops? before claiming completion/i)
    assert.ok(
      scenario.assertions.some((assertion) => /hand off|handoff|pending work|next step/i.test(assertion)),
      id + ' must define resumable handoff evidence',
    )
  }

  for (const scenario of corpus.evals) {
    assertNonEmptyString(scenario.id, 'eval id')
    assertNonEmptyString(scenario.prompt, scenario.id + ' prompt')
    assertNonEmptyString(scenario.expected_output, scenario.id + ' expected output')
    assertNonEmptyStrings(scenario.assertions, scenario.id + ' assertions')
    assert.ok((scenario.files?.length ?? 0) > 0, scenario.id + ' must ship its input files')
    assertNonEmptyStrings(scenario.files, scenario.id + ' files')
    const skillRoot = join(EVAL_SOURCE_ROOT, required.skill)
    for (const file of scenario.files ?? []) {
      assertInputFile(skillRoot, file, scenario.id)
    }
  }
}

function validateGeneralCorpus(corpus: ScenarioCorpus, required: GeneralProfile): void {
  assert.equal(corpus.skill_name, required.skill)
  assert.ok(corpus.evals.length > 0, 'an empty eval corpus is not a passing corpus')
  const byId = new Map(corpus.evals.map((scenario) => [scenario.id, scenario]))
  assert.equal(byId.size, corpus.evals.length, 'eval ids must be unique')
  for (const requirement of required.scenarios) {
    assert.ok(byId.has(requirement.id), required.skill + ' must include ' + requirement.id)
  }

  for (const scenario of corpus.evals) {
    assertNonEmptyString(scenario.id, 'eval id')
    assertNonEmptyString(scenario.prompt, scenario.id + ' prompt')
    assertNonEmptyString(scenario.expected_output, scenario.id + ' expected output')
    assertNonEmptyStrings(scenario.assertions, scenario.id + ' assertions')
    assert.ok((scenario.files?.length ?? 0) > 0, scenario.id + ' must ship its input files')
    assertNonEmptyStrings(scenario.files, scenario.id + ' files')
    const skillRoot = join(EVAL_SOURCE_ROOT, required.skill)
    for (const file of scenario.files ?? []) {
      assertInputFile(skillRoot, file, scenario.id)
    }
  }

  for (const requirement of required.scenarios) {
    const scenario = byId.get(requirement.id)
    assert.ok(scenario)
    const text = JSON.stringify(scenario)
    for (const pattern of requirement.signature) {
      assert.match(text, pattern, requirement.id + ' must preserve the scenario semantics ' + pattern)
    }
    for (const pattern of requirement.expectedOutput ?? []) {
      assert.match(scenario.expected_output, pattern, requirement.id + ' must preserve the expected output ' + pattern)
    }
    if (requirement.expectedOutput === undefined) {
      const assertions = scenario.assertions.join('\n')
      for (const pattern of requirement.assertions) {
        assert.match(assertions, pattern, requirement.id + ' must preserve the assertion ' + pattern)
      }
    } else {
      assert.equal(
        scenario.assertions.length,
        requirement.assertions.length,
        requirement.id + ' must preserve every assertion',
      )
      for (const [index, pattern] of requirement.assertions.entries()) {
        assert.match(
          scenario.assertions[index] as string,
          pattern,
          requirement.id + ' must preserve assertion ' + index + ' ' + pattern,
        )
      }
    }
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === 'string', label + ' must be a string')
  assert.ok(value.trim().length > 0, label + ' must not be blank')
}

function assertNonEmptyStrings(values: readonly unknown[] | undefined, label: string): asserts values is string[] {
  assert.ok(Array.isArray(values), label + ' must be an array')
  assert.ok(values.length > 0, label + ' must not be empty')
  for (const value of values) assertNonEmptyString(value, label)
}

test('the capability scenario corpus covers absent and available isolated execution', () => {
  for (const required of REQUIRED) validateCorpus(readCorpus(required.skill), required)
  validateCorpus(readCorpus(FORGE_REQUIRED.skill), FORGE_REQUIRED)
})

test('the companion scenario corpus covers the default ladder and bounded authorization', () => {
  for (const required of GENERAL_REQUIRED) validateGeneralCorpus(readCorpus(required.skill), required)
})

test('translation target migration scenarios keep concrete policy semantics', () => {
  const corpus = readCorpus('dsh-spec-translate-docs')
  const byId = new Map(corpus.evals.map((scenario) => [scenario.id, scenario]))
  const requirements = [
    {
      id: 'explicit-multiple-targets-create-pairs',
      signature: /explicitly selects Chinese and Japanese/i,
      assertion: /one aggregate record.*both targets/i,
    },
    {
      id: 'progressive-target-addition-single-source',
      signature: /Update .*first\.md.*target-addition policy.*docs\/new\.md/i,
      assertion: /untouched source remains unchanged/i,
    },
    {
      id: 'target-removal-active-scope',
      signature: /eligible active docs/i,
      assertion: /archived Japanese document remains unchanged/i,
    },
    {
      id: 'range-operation-does-not-create-missing-target',
      signature: /ordinary range check and record commands/i,
      assertion: /No missing Japanese counterpart is created/i,
    },
  ]
  for (const requirement of requirements) {
    const scenario = byId.get(requirement.id)
    assert.ok(scenario, 'missing translation migration scenario ' + requirement.id)
    assert.match(JSON.stringify(scenario), requirement.signature)
    assert.match(scenario.assertions.join('\n'), requirement.assertion)
  }
})

test('the companion scenario corpus fails closed when evidence is missing', () => {
  const required = GENERAL_REQUIRED[0]
  assert.throws(() => validateGeneralCorpus({ skill_name: required.skill, evals: [] }, required), /empty eval corpus/)
  const evidenceFree = readCorpus(required.skill)
  evidenceFree.evals[0].assertions = []
  assert.throws(() => validateGeneralCorpus(evidenceFree, required), /assertions must not be empty/)
  const meaningless = readCorpus(required.skill)
  meaningless.evals[0].prompt = 'Do something useful.'
  meaningless.evals[0].expected_output = 'The task succeeded.'
  meaningless.evals[0].assertions = ['The result looks good.']
  assert.throws(() => validateGeneralCorpus(meaningless, required), /must preserve/)
})

test('completion evidence and handoff evidence are both present for absent capabilities', () => {
  for (const required of REQUIRED) {
    const corpus = readCorpus(required.skill)
    const noIsolation = corpus.evals.filter((scenario) => required.noIsolationIds.includes(scenario.id))
    assert.ok(
      noIsolation.some((scenario) =>
        scenario.assertions.some((assertion) => /complete|completes|success|validation|check/i.test(assertion)),
      ),
      required.skill + ' needs a no-isolation completion path',
    )
    assert.ok(
      noIsolation.some((scenario) => required.handoffIds.includes(scenario.id)),
      required.skill + ' needs a no-isolation handoff path',
    )
  }
})

test('development eval corpora stage into a temporary skill with the official layout', (t) => {
  for (const required of ALL_REQUIRED) {
    const { temporaryRoot, skillRoot } = stageSkillWithEvals(required.skill)
    t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }))
    assert.equal(skillRoot.split(sep).at(-1), required.skill)
    assert.equal(
      readFileSync(join(skillRoot, 'evals', 'evals.json'), 'utf8'),
      readFileSync(scenarioPath(required.skill), 'utf8'),
      required.skill + ' staged a different corpus',
    )
    const corpus = readCorpus(required.skill)
    for (const scenario of corpus.evals) {
      for (const file of scenario.files ?? []) {
        assertInputFile(skillRoot, file, scenario.id)
        const sibling = /\/\.agents\/skills\/([^/]+)\/scripts\/[^/]+$/.exec(file)?.[1]
        if (sibling !== undefined) {
          assert.ok(
            existsSync(
              join(skillRoot, file.slice(0, file.indexOf('/.agents/skills/')), '.agents/skills', sibling, 'scripts'),
            ),
            scenario.id + ' stages an incomplete ' + sibling + ' installation',
          )
        }
      }
    }
    assert.equal(existsSync(join(REPO_ROOT, 'skills', required.skill, 'evals')), false, required.skill + ' ships evals')
    assert.equal(
      existsSync(join(REPO_ROOT, '.agents', 'skills', required.skill, 'evals')),
      false,
      required.skill + ' installs evals',
    )
    const gate = spawnSync(
      process.execPath,
      [join(REPO_ROOT, 'skills', 'dsh-spec-skill-forge', 'scripts', 'verify-skill-spec.mjs'), skillRoot],
      { encoding: 'utf8' },
    )
    assert.equal(gate.status, 0, (gate.stdout ?? '') + (gate.stderr ?? ''))
  }
})

test('the translation fixture starts as a consistent existing pair', (t) => {
  const { temporaryRoot, skillRoot } = stageSkillWithEvals('dsh-spec-translate-docs')
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }))
  const script = join(skillRoot, 'scripts/translate-pair.mjs')
  const result = spawnSync(
    process.execPath,
    [script, 'check', 'docs/guide.md', '--target', 'zh=中文', '--root', 'evals/files/vendor'],
    {
      cwd: skillRoot,
      encoding: 'utf8',
    },
  )
  assert.equal(result.status, 0, (result.stdout ?? '') + (result.stderr ?? ''))
  assert.match(result.stdout ?? '', /1 pair\(s\) consistent/)
})

test('an empty or evidence-free capability corpus fails closed', () => {
  const required = REQUIRED[0]
  assert.throws(() => validateCorpus({ skill_name: required.skill, evals: [] }, required), /empty eval corpus/)
  const evidenceFree = readCorpus(required.skill)
  evidenceFree.evals[0].assertions = []
  assert.throws(() => validateCorpus(evidenceFree, required), /assertions must not be empty/)
  const blankEvidence = readCorpus(required.skill)
  blankEvidence.evals[0].assertions = ['   ']
  assert.throws(() => validateCorpus(blankEvidence, required), /assertions must not be blank/)
  const nonArrayEvidence = readCorpus(required.skill)
  const malformedScenario = nonArrayEvidence.evals[0] as { assertions: unknown }
  malformedScenario.assertions = 'not an array'
  assert.throws(() => validateCorpus(nonArrayEvidence, required), /assertions must be an array/)
})

test('the forge requires selective evaluation coverage', () => {
  const forge = readFileSync(join(REPO_ROOT, 'skills', 'dsh-spec-skill-forge', 'SKILL.md'), 'utf8')
  assert.match(forge, /A natural-language requirement central to the forged skill carries a development eval scenario/)
  assert.match(forge, /Model evals run when the owned behavior changes and remain outside the delivered skill/)
})

test('the forge eval covers capability preference, fallback and a bounded handoff', () => {
  const corpus = readCorpus(FORGE_REQUIRED.skill)
  const scenario = corpus.evals.find((entry) => entry.id === FORGE_REQUIRED.ids[0])
  assert.ok(scenario)
  assert.match(scenario.prompt, /isolated execution/)
  assert.match(scenario.expected_output, /optional mechanism/)
  assert.match(scenario.expected_output, /fallback or explicit handoff/)
  assert.ok(scenario.assertions.some((assertion) => /resumable next step/.test(assertion)))
})

test('error handling trigger corpus keeps positive and near-miss coverage', () => {
  const corpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', 'trigger-evals.json'), 'utf8'),
  ) as {
    skill_name: string
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.equal(corpus.skill_name, 'dsh-spec-error-handling')
  assert.equal(corpus.queries.length, 10)
  assert.equal(new Set(corpus.queries.map((entry) => entry.id)).size, corpus.queries.length)
  assert.equal(corpus.queries.filter((entry) => entry.should_trigger).length, 5)
  assert.equal(corpus.queries.filter((entry) => !entry.should_trigger).length, 5)
  for (const entry of corpus.queries) {
    assertNonEmptyString(entry.id, 'trigger eval id')
    assertNonEmptyString(entry.query, entry.id + ' trigger query')
  }
})

test('error handling model evidence retains candidate and baseline runs', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr113')
  const scenarios = ['existing-identity', 'message-only', 'numeric-no-cause', 'silent-handler', 'worker-boundary']
  for (const scenario of scenarios) {
    for (const profile of ['baseline', 'previous', 'candidate']) {
      const run = join(evidenceRoot, profile + '-' + scenario)
      const final = readFileSync(join(run, 'final.md'), 'utf8')
      const status = readFileSync(join(run, 'status.txt'), 'utf8')
      assert.ok(final.trim().length > 0, run + ' must retain a final response')
      assert.match(status, /^assertions: \d\/\d$/m)
      if (profile === 'candidate' || scenario !== 'silent-handler') {
        assert.match(status, /^status: pass$/m)
        assert.match(status, /^assertions: 4\/4$/m)
      } else {
        assert.match(status, /^status: fail$/m)
        assert.match(status, /^assertions: 2\/4$/m)
      }
    }
  }

  const triggerRoot = join(evidenceRoot, 'trigger')
  const triggerCorpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', 'trigger-evals.json'), 'utf8'),
  ) as { queries: Array<{ id: string }> }
  assert.equal(readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8').trim().split('\n').length, 11)
  for (const query of triggerCorpus.queries) {
    assert.ok(readFileSync(join(triggerRoot, query.id, 'final.md'), 'utf8').trim().length > 0)
  }
})

test('the scenario input check rejects missing, empty, directory and escaping files', () => {
  const root = mkdtempSync(join(tmpdir(), 'skill-scenarios-files-'))
  const files = join(root, 'evals', 'files')
  try {
    mkdirSync(files, { recursive: true })
    writeFileSync(join(root, 'SKILL.md'), '# skill\n')
    assert.throws(() => assertInputFile(root, 'evals/files/missing.md', 'missing'), /does not exist/)
    writeFileSync(join(files, 'empty.md'), '')
    assert.throws(() => assertInputFile(root, 'evals/files/empty.md', 'empty'), /is empty/)
    mkdirSync(join(files, 'directory'))
    assert.throws(() => assertInputFile(root, 'evals/files/directory', 'directory'), /not a regular file/)
    const outside = mkdtempSync(join(tmpdir(), 'skill-scenarios-outside-'))
    try {
      writeFileSync(join(outside, 'outside.md'), '# outside\n')
      symlinkSync(join(outside, 'outside.md'), join(files, 'outside.md'))
      assert.throws(() => assertInputFile(root, 'evals/files/outside.md', 'link'), /escapes evals\/files/)
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
    assert.throws(() => assertInputFile(root, 'evals/files/../../SKILL.md', 'traversal'), /escapes evals\/files/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
