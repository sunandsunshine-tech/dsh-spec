/**
 * Development-side model scenarios for isolated-context capabilities, Agent Notes companion
 * defaults, Translate Docs scoped authorization, the forge's capability conclusions,
 * error-contract judgment, Web UI review evidence and browser GIF capture.
 *
 * The source corpus lives under tests/ because skills/ is a distribution artifact. The tests stage
 * a temporary skill copy with the corpus at the official evals/ path. They validate the scenario
 * contract, not a model run.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { test } from 'node:test'

import { createCaptureFixture, waitForProcessGone } from './helpers/capture-browser-fixture.ts'
import { REPO_ROOT } from './helpers/fixtures.ts'

interface Scenario {
  id: string
  prompt: string
  expected_output: string
  assertions: string[]
  files?: string[]
  capabilities?: {
    browser?: boolean
    media?: boolean
  }
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
      {
        id: 'outcome-classification-and-extensible-codes',
        signature: [/no matches/i, /provider extensions/i],
        expectedOutput: [/remains.*success/i, /open code type/i, /tolerate unknown codes/i],
        assertions: [
          /successful empty-search result/i,
          /open code type/i,
          /Known plugin codes are exported/i,
          /tolerate unknown plugin codes/i,
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
  {
    skill: 'dsh-spec-client-ui-ux',
    scenarios: [
      {
        id: 'shared-widget-consumer-coverage',
        signature: [/shared button change/i, /SearchPage/],
        assertions: [
          /SearchPage and SettingsPage/i,
          /identifies which affected interactive states remain unverified/i,
          /rendered evidence/i,
          /consumer or state not inspected is named as a gap/i,
          /controlled comparison rather than historical provenance/i,
        ],
      },
      {
        id: 'missing-rendered-evidence-handoff',
        signature: [/No browser/i, /unit tests pass/i],
        assertions: [
          /does not claim visual acceptance/i,
          /missing rendered page or recording capability/i,
          /completed source and test evidence/i,
          /resumable next step/i,
        ],
      },
      {
        id: 'project-declares-equivalent-evidence',
        signature: [/labeled screenshot pair/i, /instead of a GIF/i],
        assertions: [
          /screenshot pair as the evidence form/i,
          /does not require a GIF/i,
          /simulated focus pair is rejected/i,
          /Missing rendered coverage remains a gap/i,
        ],
      },
      {
        id: 'capability-present-real-browser',
        signature: [/evidence-default probe/i, /no visual-evidence form/i],
        assertions: [
          /rendered evidence is required without relying on a project-declared form/i,
          /runs the application and browser evidence path/i,
          /inspects the generated artifacts and reports their source and provenance/i,
          /does not claim formal visual approval when the project declares no approval policy/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-browser-gif-evidence',
    scenarios: [
      {
        id: 'real-ui-change-uses-one-isolated-run',
        signature: [/user-visible browser settings flow/i, /declared real build/i, /one isolated run/i],
        assertions: [
          /one isolated run/i,
          /real-versus-substituted services/i,
          /inspected after encoding/i,
          /No media/i,
        ],
      },
      {
        id: 'missing-capture-capability-hands-off',
        signature: [/no browser-control capability/i, /no ffmpeg or ffprobe/i, /Finish the evidence task now/i],
        assertions: [/missing browser and media capabilities/i, /resumable next step/i, /does not claim completion/i],
      },
      {
        id: 'explicit-fixture-recording-is-disclosed',
        signature: [/explicitly requests a fixture-only GIF/i, /real external provider is unavailable/i],
        assertions: [/fixture request authorizes/i, /fixture-based/i, /does not prove/i],
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

function commandReadsSkill(command: string | undefined, skillName = 'dsh-spec-error-handling'): boolean {
  if (command === undefined) return false
  const escaped = skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `(?:^|[\\s;&|'"])(?:cat|sed|head|tail)\\s+[^\\n]*\\.agents/skills/${escaped}/SKILL\\.md(?:[\\s'"]|$)`,
  ).test(command)
}

function filesUnder(root: string): string[] {
  return readdirSync(root, { recursive: true })
    .filter((path): path is string => typeof path === 'string' && statSync(join(root, path)).isFile())
    .sort()
}

function triggerSurfaceHash(skillName: string): string {
  const body = readFileSync(join(REPO_ROOT, 'skills', skillName, 'SKILL.md'), 'utf8')
  const name = /^name:\s*(.+)$/m.exec(body)?.[1]
  const description = /^description:\s*"(.*)"$/m.exec(body)?.[1]
  assert.ok(name, skillName + ' has no name')
  assert.ok(description, skillName + ' has no description')
  return createHash('sha256').update(JSON.stringify({ name, description })).digest('hex')
}

test('the capability scenario corpus covers absent and available isolated execution', () => {
  for (const required of REQUIRED) validateCorpus(readCorpus(required.skill), required)
  validateCorpus(readCorpus(FORGE_REQUIRED.skill), FORGE_REQUIRED)
  const browser = readCorpus('dsh-spec-browser-gif-evidence')
  const missing = browser.evals.find((scenario) => scenario.id === 'missing-capture-capability-hands-off')
  assert.ok(missing)
  assert.deepEqual(missing.capabilities, { browser: false, media: false })
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
    agent_file: string
    queries: Array<{ id: string; query: string; should_trigger: boolean; files?: string[] }>
  }
  assert.equal(corpus.skill_name, 'dsh-spec-error-handling')
  assertNonEmptyString(corpus.agent_file, 'trigger agent file')
  assert.ok(corpus.agent_file.startsWith('trigger-fixtures/'))
  assert.ok(existsSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', corpus.agent_file)))
  assert.equal(corpus.queries.length, 10)
  assert.equal(new Set(corpus.queries.map((entry) => entry.id)).size, corpus.queries.length)
  assert.equal(corpus.queries.filter((entry) => entry.should_trigger).length, 5)
  assert.equal(corpus.queries.filter((entry) => !entry.should_trigger).length, 5)
  for (const entry of corpus.queries) {
    assertNonEmptyString(entry.id, 'trigger eval id')
    assertNonEmptyString(entry.query, entry.id + ' trigger query')
    for (const file of entry.files ?? []) {
      assert.ok(file.startsWith('trigger-fixtures/'), entry.id + ' fixture escapes trigger-fixtures')
      const absolute = join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', file)
      assert.ok(existsSync(absolute), entry.id + ' fixture is missing: ' + file)
      assert.ok(statSync(absolute).size > 0, entry.id + ' fixture is empty: ' + file)
    }
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
      if (profile !== 'previous' || scenario !== 'silent-handler') {
        assert.match(status, /^status: pass$/m)
        assert.match(status, /^assertions: 4\/4$/m)
      } else {
        assert.match(status, /^status: fail$/m)
        assert.match(status, /^assertions: 2\/4$/m)
      }
    }
  }

  const triggerRoot = join(evidenceRoot, 'trigger')
  const evidenceReadme = readFileSync(join(evidenceRoot, 'README.md'), 'utf8')
  const candidateTree = /^Candidate skill tree: `([0-9a-f]{40})`\.$/m.exec(evidenceReadme)?.[1]
  assert.ok(candidateTree, 'error handling evidence does not record its candidate tree')
  const candidateSkill = spawnSync('git', ['show', `${candidateTree}:SKILL.md`], { cwd: REPO_ROOT })
  assert.equal(candidateSkill.status, 0, candidateSkill.stderr?.toString())
  const skillHash = createHash('sha256').update(candidateSkill.stdout).digest('hex')
  const triggerCorpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', 'trigger-evals.json'), 'utf8'),
  ) as { agent_file: string; queries: Array<{ id: string; should_trigger: boolean }> }
  assert.ok(existsSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', triggerCorpus.agent_file)))
  const matrixLines = readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8').trim().split('\n')
  assert.equal(matrixLines[0], 'id\tshould_trigger\tread_skill\tresult')
  const matrix = new Map(
    matrixLines.slice(1).map((line) => {
      const [id, shouldTrigger, readSkill, result] = line.split('\t')
      assert.ok(id && shouldTrigger && readSkill && result, 'malformed trigger matrix row: ' + line)
      return [id, { shouldTrigger, readSkill, result }] as const
    }),
  )
  assert.equal(matrix.size, triggerCorpus.queries.length)
  for (const query of triggerCorpus.queries) {
    const row = matrix.get(query.id)
    assert.ok(row, 'missing trigger matrix row ' + query.id)
    assert.equal(row.shouldTrigger, String(query.should_trigger))
    const trace = readFileSync(join(triggerRoot, query.id, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string; command?: string; exit_code?: number | null; sha256?: string })
    assert.equal(
      trace.filter((entry) => entry.type === 'skill' && entry.sha256 === skillHash).length,
      1,
      query.id + ' trace must identify the exact skill blob',
    )
    const readSkill = trace.some(
      (entry) =>
        entry.type === 'command' &&
        entry.exit_code === 0 &&
        commandReadsSkill(entry.command, 'dsh-spec-error-handling'),
    )
    assert.equal(row.readSkill, String(readSkill), query.id + ' trace disagrees with the matrix')
    assert.equal(row.result, query.should_trigger === readSkill ? 'pass' : 'fail')
    assert.equal(row.result, 'pass', query.id + ' has the wrong trigger result')
    assert.ok(
      trace.some((entry) => entry.type === 'turn.completed'),
      query.id + ' trace lacks usage',
    )
    assert.ok(readFileSync(join(triggerRoot, query.id, 'final.md'), 'utf8').trim().length > 0)
    assert.ok(readFileSync(join(triggerRoot, query.id, 'stderr.log'), 'utf8').trim().length > 0)
  }
  assert.doesNotMatch(
    readFileSync(join(triggerRoot, 'visible-unknown-outcome', 'final.md'), 'utf8'),
    /stderr\.log|events\.jsonl/,
  )
})

test('web UI trigger corpus keeps positive and near-miss coverage', () => {
  const corpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', 'trigger-evals.json'), 'utf8'),
  ) as {
    skill_name: string
    agent_file: string
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.equal(corpus.skill_name, 'dsh-spec-client-ui-ux')
  assert.equal(corpus.queries.length, 12)
  assert.equal(new Set(corpus.queries.map((entry) => entry.id)).size, corpus.queries.length)
  assert.equal(corpus.queries.filter((entry) => entry.should_trigger).length, 6)
  assert.equal(corpus.queries.filter((entry) => !entry.should_trigger).length, 6)
  assert.ok(existsSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', corpus.agent_file)))
  const skill = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-client-ui-ux/SKILL.md'), 'utf8')
  assert.match(skill, /State authenticity:.*real interaction or state mechanism/)
  assert.match(skill, /forced class, data attribute, debug overlay, or copied style/)
  assert.match(skill, /concrete resumable action naming the environment, scene, or artifact/)
  assert.doesNotMatch(skill, /组件消费者/)
  for (const entry of corpus.queries) {
    assertNonEmptyString(entry.id, 'Web UI trigger eval id')
    assertNonEmptyString(entry.query, entry.id + ' trigger query')
  }
})

test('web UI historical model evidence and trigger traces stay auditable', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr114')
  const evidenceReadme = readFileSync(join(evidenceRoot, 'README.md'), 'utf8')
  const historicalCapturePath = 'evals/files/shared-widget-project/capture-browser.mjs'
  const historicalCaptureHash = 'a76a0b15807b9786ee468705836865ba057400c05a20e2b6ad13b855d3ae346e'
  const behaviorRuns = [
    ['candidate-shared-widget', true, 'shared-widget-consumer-coverage', 'pass', 5],
    ['candidate-missing-render', true, 'missing-rendered-evidence-handoff', 'pass', 4],
    ['baseline-screenshot-pair', false, 'project-declares-equivalent-evidence', 'fail', 4],
    ['candidate-screenshot-pair', true, 'project-declares-equivalent-evidence', 'pass', 4],
    ['candidate-capability-present', true, 'capability-present-real-browser', 'pass', 4],
  ] as const
  const scenarios = new Map(
    (
      JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', 'evals', 'evals.json'), 'utf8')) as {
        evals: Array<{ id: string; files?: string[]; assertions: string[] }>
      }
    ).evals.map((scenario) => [scenario.id, scenario]),
  )
  const skillHash = /^Skill file SHA-256: `([0-9a-f]{64})`\.$/m.exec(evidenceReadme)?.[1]
  assert.ok(skillHash, 'Web UI evidence does not record its skill revision')

  for (const [runName, candidate, scenarioId, status, assertionCount] of behaviorRuns) {
    const run = join(evidenceRoot, runName)
    const scenario = scenarios.get(scenarioId)
    assert.ok(scenario, 'missing scenario ' + scenarioId)
    assert.equal(scenario.assertions.length, assertionCount)
    assert.ok(readFileSync(join(run, 'final.md'), 'utf8').trim().length > 0)
    const body = readFileSync(join(run, 'status.txt'), 'utf8')
    assert.match(body, new RegExp('^status: ' + status + '$', 'm'))
    const graded = readFileSync(join(run, 'assertions.txt'), 'utf8').trim().split('\n').filter(Boolean)
    assert.equal(graded.length, assertionCount, runName + ' assertion count')
    assert.deepEqual(
      graded.map((line) => line.replace(/^(?:PASS|FAIL) /, '')),
      scenario.assertions,
      runName + ' assertion text differs from the canonical scenario',
    )
    const passedAssertions = graded.filter((line) => /^PASS /.test(line)).length
    if (status === 'pass') assert.equal(passedAssertions, assertionCount)
    else assert.ok(passedAssertions < assertionCount, runName + ' has no failed assertion')

    const manifest = readFileSync(join(run, 'input-manifest.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => /^([0-9a-f]{64})  (.+?)(?:  mode=[0-7]{4})?$/.exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => ({ hash: match[1], path: match[2] }))
    assert.equal(manifest.length, scenario.files?.length ?? 0, runName + ' input manifest')
    assert.deepEqual(
      manifest.map((entry) => entry.path).sort(),
      [...(scenario.files ?? [])].sort(),
      runName + ' does not cover the scenario files',
    )
    if (candidate) {
      for (const entry of manifest) {
        if (entry.path === historicalCapturePath) {
          assert.equal(
            entry.hash,
            historicalCaptureHash,
            runName + ' does not retain the historical capture fixture input',
          )
          continue
        }
        const actual = join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', entry.path)
        assert.equal(
          createHash('sha256').update(readFileSync(actual)).digest('hex'),
          entry.hash,
          runName + ' input differs: ' + entry.path,
        )
      }
    }

    const traceText = readFileSync(join(run, 'trace.jsonl'), 'utf8')
    const trace = traceText
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string
            sha256?: string
            path?: string
            item?: { type?: string; command?: string; exit_code?: number }
          },
      )
    const skillReads = trace.filter(
      (entry) =>
        entry.type === 'item.completed' &&
        entry.item?.type === 'command_execution' &&
        entry.item.exit_code === 0 &&
        commandReadsSkill(entry.item.command, 'dsh-spec-client-ui-ux'),
    )
    const skillEvents: typeof trace = trace.filter((entry) => entry.type === 'skill' && entry.sha256 === skillHash)
    assert.equal(
      skillReads.length > 0 || skillEvents.length > 0,
      candidate,
      runName + (candidate ? ' did not read its candidate skill' : ' read the skill it was testing'),
    )
    assert.equal(trace.filter((entry) => entry.type === 'turn.completed').length, 1)
    for (const entry of trace.filter((candidate) => candidate.type === 'stderr')) {
      assert.ok(entry.path, runName + ' stderr entry lacks a path')
      assert.ok(readFileSync(join(run, entry.path), 'utf8').trim().length > 0, runName + ' stderr is empty')
    }

    if (scenarioId === 'capability-present-real-browser') {
      assert.doesNotMatch(traceText, /browser-skill|\bbsk\b/i)
      const artifacts = readFileSync(join(run, 'artifacts.sha256'), 'utf8').trim().split('\n').filter(Boolean)
      assert.ok(artifacts.length >= 5, runName + ' lacks rendered artifacts')
      for (const line of artifacts) {
        const [hash, path] = line.split('  ')
        assert.ok(hash && path, runName + ' malformed artifact manifest')
        assert.equal(
          createHash('sha256')
            .update(readFileSync(join(run, path)))
            .digest('hex'),
          hash,
          runName + ' artifact differs: ' + path,
        )
      }
    }
  }

  const triggerCorpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', 'trigger-evals.json'), 'utf8'),
  ) as { queries: Array<{ id: string; should_trigger: boolean }> }
  const triggerInputs = new Map(
    readFileSync(join(evidenceRoot, 'trigger-input.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, path] = line.split('  ')
        return [path, hash] as const
      }),
  )
  for (const path of [
    'tests/skill-evals/dsh-spec-client-ui-ux/trigger-evals.json',
    'tests/skill-evals/dsh-spec-client-ui-ux/trigger-fixtures/AGENTS.md',
  ] as const) {
    assert.equal(
      triggerInputs.get(path),
      createHash('sha256')
        .update(readFileSync(join(REPO_ROOT, path)))
        .digest('hex'),
      'trigger input differs: ' + path,
    )
  }
  assert.equal(
    triggerInputs.get('skills/dsh-spec-client-ui-ux/SKILL.md#name-description'),
    triggerSurfaceHash('dsh-spec-client-ui-ux'),
    'Web UI trigger surface differs',
  )
  const matrix = new Map(
    readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8')
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => {
        const [id, shouldTrigger, readSkill, result] = line.split('\t')
        assert.ok(id && shouldTrigger && readSkill && result, 'malformed Web UI trigger row')
        return [id, { shouldTrigger, readSkill, result }] as const
      }),
  )
  assert.equal(matrix.size, triggerCorpus.queries.length)
  for (const query of triggerCorpus.queries) {
    const row = matrix.get(query.id)
    assert.ok(row, 'missing Web UI trigger row ' + query.id)
    assert.equal(row.shouldTrigger, String(query.should_trigger))
    const trace = readFileSync(join(evidenceRoot, 'trigger', query.id, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string; command?: string; exit_code?: number | null; sha256?: string })
    assert.equal(
      trace.filter((entry) => entry.type === 'skill' && entry.sha256 === skillHash).length,
      1,
      query.id + ' does not identify the current Web UI skill',
    )
    const readSkill = trace.some(
      (entry) =>
        entry.type === 'command' && entry.exit_code === 0 && commandReadsSkill(entry.command, 'dsh-spec-client-ui-ux'),
    )
    assert.equal(row.readSkill, String(readSkill))
    assert.equal(row.result, query.should_trigger === readSkill ? 'pass' : 'fail')
    assert.equal(row.result, 'pass')
    assert.ok(readFileSync(join(evidenceRoot, 'trigger', query.id, 'final.md'), 'utf8').trim().length > 0)
  }
})

test('web UI fixtures are runnable and retain real media signatures', () => {
  const files = join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', 'evals', 'files')
  const shared = join(files, 'shared-widget-project')
  const missing = join(files, 'no-render-project')
  const sharedTest = spawnSync(process.execPath, ['--test', 'tests/button-consumers.test.mjs'], {
    cwd: shared,
    encoding: 'utf8',
  })
  assert.equal(sharedTest.status, 0, (sharedTest.stdout ?? '') + (sharedTest.stderr ?? ''))
  const missingTest = spawnSync(process.execPath, ['--test', 'tests/dialog-check.mjs'], {
    cwd: missing,
    encoding: 'utf8',
  })
  assert.equal(missingTest.status, 0, (missingTest.stdout ?? '') + (missingTest.stderr ?? ''))
  const captureCheck = spawnSync(process.execPath, ['--check', 'capture-browser.mjs'], {
    cwd: shared,
    encoding: 'utf8',
  })
  assert.equal(captureCheck.status, 0, (captureCheck.stdout ?? '') + (captureCheck.stderr ?? ''))

  for (const name of [
    'search-before.png',
    'search-after.png',
    'settings-before.png',
    'settings-after.png',
    'search-focus-before.png',
    'search-focus-after.png',
    'settings-saving-before.png',
    'settings-saving-after.png',
  ]) {
    assert.equal(
      readFileSync(join(shared, 'evidence', name))
        .subarray(1, 4)
        .toString('ascii'),
      'PNG',
    )
  }
  assert.equal(
    readFileSync(join(shared, 'evidence', 'shared-button.gif'))
      .subarray(0, 3)
      .toString('ascii'),
    'GIF',
  )
})

function assertCaptureDidNotTimeOut(result: ReturnType<typeof spawnSync>): void {
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
}

async function assertCaptureProcessesGone(fixture: ReturnType<typeof createCaptureFixture>): Promise<void> {
  for (const path of [fixture.serverPidFile, fixture.chromePidFile, fixture.descendantPidFile]) {
    const pid = fixture.pid(path)
    assert.equal(await waitForProcessGone(pid), true, 'capture left process ' + pid)
  }
  assert.deepEqual(fixture.captureRunDirectories(), [])
}

test('client UI capture rejects an unready server before Chrome and clears old evidence', async (t) => {
  const fixture = createCaptureFixture(t, 'capture-server-unready-')
  fixture.seedOldEvidence()
  const result = fixture.run('success', {
    FAKE_SERVER_MODE: 'unready',
    SERVER_READY_TIMEOUT_MS: '100',
  })

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /SERVER_UNREADY: server did not report a URL/)
  assert.equal(fixture.pid(fixture.chromePidFile), undefined)
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture cleans up Chrome startup failure and stale evidence', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-chrome-exit-')
  fixture.seedOldEvidence()
  const result = fixture.run('exit-before-ready')

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CHROME_START_FAILED: Chrome exited before readiness: 7/)
  assert.ok(fixture.events(fixture.chromeEvents).some((entry) => entry.event === 'start'))
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture rejects a command pending when DevTools disconnects', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-disconnect-')
  fixture.seedOldEvidence()
  const result = fixture.run('disconnect-pending', {
    CDP_COMMAND_TIMEOUT_MS: '2000',
    CAPTURE_TIMEOUT_MS: '3000',
  })

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CDP_DISCONNECTED: Chrome DevTools connection (?:closed|failed)/)
  assert.ok(fixture.events(fixture.chromeEvents).some((entry) => entry.event === 'websocket-open'))
  assert.ok(fixture.events(fixture.chromeEvents).some((entry) => entry.event === 'command'))
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture bounds an unresponsive CDP command and removes its run', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-command-timeout-')
  fixture.seedOldEvidence()
  const result = fixture.run('command-timeout', {
    CDP_COMMAND_TIMEOUT_MS: '100',
    CAPTURE_TIMEOUT_MS: '2000',
  })

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CDP_COMMAND_TIMEOUT: Page\.enable did not finish within 100 ms/)
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture bounds the whole run when target discovery hangs', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-overall-timeout-')
  fixture.seedOldEvidence()
  const result = fixture.run('overall-timeout', {
    CDP_COMMAND_TIMEOUT_MS: '2000',
    CHROME_READY_TIMEOUT_MS: '2000',
    CAPTURE_TIMEOUT_MS: '200',
  })

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CAPTURE_TIMEOUT: capture did not finish within 200 ms/)
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture publishes one complete run and removes its process tree', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-success-')
  fixture.seedOldEvidence()
  const result = fixture.run('success')

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(
    readdirSync(fixture.evidence).sort(),
    [
      'delete-disabled.png',
      'narrow-after-idle.png',
      'review-state.json',
      'search-hover.png',
      'search-keyboard-focus.png',
      'search-pressed.png',
      'wide-after-idle.png',
    ].sort(),
  )
  assert.equal(existsSync(join(fixture.evidence, 'stale.png')), false)
  const report = JSON.parse(readFileSync(join(fixture.evidence, 'review-state.json'), 'utf8')) as {
    screenshots: Record<string, { path: string; sha256: string; bytes: number }>
  }
  assert.deepEqual(JSON.parse(result.stdout), report)
  for (const screenshot of Object.values(report.screenshots)) {
    const bytes = readFileSync(join(fixture.root, screenshot.path))
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG')
    assert.equal(bytes.length, screenshot.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), screenshot.sha256)
  }
  assert.ok(fixture.events(fixture.serverEvents).some((entry) => entry.event === 'ready'))
  const chromeEvents = fixture.events(fixture.chromeEvents)
  assert.equal(chromeEvents.filter((entry) => entry.event === 'screenshot').length, 6)
  assert.ok(
    chromeEvents.some((entry) => entry.event === 'command' && entry.method === 'Browser.close'),
    'capture did not ask Chrome to close before process-tree cleanup',
  )
  assert.notEqual(fixture.pid(fixture.descendantPidFile), undefined)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture discards prior evidence and its partial run after failure', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-partial-failure-')
  fixture.seedOldEvidence()
  const result = fixture.run('fail-after-first-screenshot')

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CDP_COMMAND_FAILED: injected CDP failure/)
  assert.ok(fixture.events(fixture.chromeEvents).some((entry) => entry.event === 'screenshot'))
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('browser GIF fixtures build and their capture entries parse', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'browser-gif-fixture-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const scenario = readCorpus('dsh-spec-browser-gif-evidence').evals.find(
    (entry) => entry.id === 'real-ui-change-uses-one-isolated-run',
  )
  assert.ok(scenario)
  const prefix = 'evals/files/shared-gif-project/'
  for (const file of scenario.files ?? []) {
    assert.ok(file.startsWith(prefix), 'unexpected browser GIF fixture input: ' + file)
    const destination = join(root, file.slice(prefix.length))
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-browser-gif-evidence', file), destination)
  }

  const build = spawnSync(process.execPath, ['build.mjs'], { cwd: root, encoding: 'utf8' })
  assert.equal(build.status, 0, (build.stdout ?? '') + (build.stderr ?? ''))
  for (const file of ['dist/index.html', 'dist/src/app.js']) {
    assert.equal(existsSync(join(root, file)), true, 'fixture build did not produce ' + file)
  }
  for (const file of ['capture-browser.mjs', 'server.mjs']) {
    const syntax = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' })
    assert.equal(syntax.status, 0, (syntax.stdout ?? '') + (syntax.stderr ?? ''))
  }
})

test('the browser evidence fixture does not leak an unready server', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the failure path uses POSIX process liveness checks')
    return
  }
  const root = mkdtempSync(join(tmpdir(), 'capture-cleanup-'))
  const profiles = join(root, 'profiles')
  const pidFile = join(root, 'server.pid')
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(profiles)
  const source = join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux/evals/files/shared-widget-project/capture-browser.mjs')
  cpSync(source, join(root, 'capture-browser.mjs'))
  writeFileSync(
    join(root, 'hang-server.mjs'),
    "import { writeFileSync } from 'node:fs'\n" +
      'writeFileSync(process.env.SERVER_PID_FILE, String(process.pid))\n' +
      'setInterval(() => {}, 1000)\n',
  )
  const result = spawnSync(process.execPath, ['capture-browser.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      CHROME_PATH: existsSync('/bin/true') ? '/bin/true' : process.execPath,
      SERVER_ENTRY: 'hang-server.mjs',
      SERVER_PID_FILE: pidFile,
      SERVER_READY_TIMEOUT_MS: '100',
      TMPDIR: profiles,
    },
    encoding: 'utf8',
    timeout: 5_000,
  })
  assert.notEqual(result.status, 0)
  await new Promise((resolve) => setTimeout(resolve, 100))
  const pid = Number(readFileSync(pidFile, 'utf8'))
  assert.throws(() => process.kill(pid, 0), /ESRCH/)
  assert.deepEqual(readdirSync(profiles), [])
})

test('browser GIF model evidence binds inputs, scores, artifacts and trigger decisions', () => {
  const skill = 'dsh-spec-browser-gif-evidence'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr115')
  const corpusRoot = join(EVAL_SOURCE_ROOT, skill)
  const historicalInputs = new Map(
    readFileSync(join(evidenceRoot, 'evaluation-files.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const match = /^([0-9a-f]{64})  (.+)$/.exec(line)
        assert.ok(match, 'browser GIF evaluation manifest has a malformed line')
        return [match[2], match[1]] as const
      }),
  )
  const behaviorScenarios = new Map([
    ['candidate-real', 'real-ui-change-uses-one-isolated-run'],
    ['candidate-absent', 'missing-capture-capability-hands-off'],
    ['candidate-fixture', 'explicit-fixture-recording-is-disclosed'],
  ])
  const scenarioFiles = new Map(readCorpus(skill).evals.map((scenario) => [scenario.id, scenario.files ?? []] as const))
  for (const run of ['candidate-real', 'candidate-absent', 'candidate-fixture']) {
    const root = join(evidenceRoot, run)
    const status = readFileSync(join(root, 'status.txt'), 'utf8')
    assert.match(status, /^status: pass$/m)
    assert.match(status, /^assertions: 4\/4$/m)
    const assertions = readFileSync(join(root, 'assertions.txt'), 'utf8').trim().split('\n')
    assert.equal(assertions.length, 4, run + ' assertion count')
    assert.equal(
      assertions.every((line) => line.startsWith('PASS ')),
      true,
      run + ' has a failed assertion',
    )
    assert.ok(readFileSync(join(root, 'final.md'), 'utf8').trim().length > 0)
    const trace = readFileSync(join(root, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) => JSON.parse(line) as { type: string; item?: { type?: string; command?: string; exit_code?: number } },
      )
    assert.equal(trace.at(-1)?.type, 'turn.completed', run + ' did not complete')
    assert.equal(
      trace.some(
        (entry) =>
          entry.type === 'item.completed' &&
          entry.item?.type === 'command_execution' &&
          entry.item.exit_code === 0 &&
          commandReadsSkill(entry.item.command, skill),
      ),
      true,
      run + ' did not read the candidate skill',
    )
    const manifests =
      run === 'candidate-absent' ? ['input-manifest.sha256'] : ['input-manifest.sha256', 'artifacts.sha256']
    for (const manifest of manifests) {
      const lines = readFileSync(join(root, manifest), 'utf8').trim().split('\n')
      if (manifest === 'input-manifest.sha256') {
        const inputs = lines.map((line) => {
          const match = /^([0-9a-f]{64})  (.+?)(?:  mode=([0-7]{4}))?$/.exec(line)
          assert.ok(match, run + ' input manifest has a malformed line')
          return { hash: match[1], path: match[2] }
        })
        const scenario = behaviorScenarios.get(run)
        assert.ok(scenario)
        assert.deepEqual(
          inputs.map((entry) => entry.path),
          scenarioFiles.get(scenario),
          run + ' input manifest does not match the declared scenario files',
        )
        for (const entry of inputs) {
          assert.equal(
            historicalInputs.get(`tests/skill-evals/${skill}/${entry.path}`),
            entry.hash,
            run + ' input differs from its recorded historical manifest: ' + entry.path,
          )
        }
        continue
      }
      for (const line of lines) {
        const [hash, relative] = line.split(/\s{2,}/)
        assert.match(hash ?? '', /^[0-9a-f]{64}$/, run + ' malformed hash')
        const target = join(root, relative ?? '')
        assert.equal(
          createHash('sha256').update(readFileSync(target)).digest('hex'),
          hash,
          run + ' changed ' + relative,
        )
      }
    }
    if (run === 'candidate-absent') assert.equal(existsSync(join(root, 'artifact')), false)
  }
  for (const run of ['candidate-real', 'candidate-fixture']) {
    const artifactRoot = join(evidenceRoot, run, 'artifact')
    const gifs = filesUnder(artifactRoot).filter((path) => path.endsWith('.gif'))
    assert.equal(gifs.length, 1, run + ' GIF count')
    assert.equal(
      readFileSync(join(artifactRoot, gifs[0] as string))
        .subarray(0, 3)
        .toString('ascii'),
      'GIF',
    )
    const reports = filesUnder(artifactRoot).filter((path) => path.endsWith('/capture-report.json'))
    assert.equal(reports.length, 1, run + ' capture report count')
    const report = JSON.parse(readFileSync(join(artifactRoot, reports[0] as string), 'utf8')) as {
      states: Record<string, { status: string; button: string; disabled: boolean }>
    }
    assert.deepEqual(report.states.initial, {
      status: 'Unsaved changes',
      button: 'Save changes',
      disabled: false,
    })
    assert.deepEqual(report.states.saving, {
      status: 'Saving changes',
      button: 'Saving…',
      disabled: true,
    })
    assert.deepEqual(report.states.final, {
      status: 'Changes saved',
      button: 'Save changes',
      disabled: false,
    })
  }

  const triggerInputs = new Map(
    readFileSync(join(evidenceRoot, 'trigger-input.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, path] = line.split(/\s{2,}/)
        return [path, hash] as const
      }),
  )
  for (const path of [
    `tests/skill-evals/${skill}/trigger-evals.json`,
    `tests/skill-evals/${skill}/trigger-fixtures/AGENTS.md`,
  ]) {
    assert.equal(
      triggerInputs.get(path),
      createHash('sha256')
        .update(readFileSync(join(REPO_ROOT, path)))
        .digest('hex'),
      'trigger input differs: ' + path,
    )
  }
  assert.equal(
    triggerInputs.get(`skills/${skill}/SKILL.md#name-description`),
    triggerSurfaceHash(skill),
    'browser GIF trigger surface differs',
  )

  const triggerCorpus = JSON.parse(readFileSync(join(corpusRoot, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; should_trigger: boolean }>
  }
  const matrix = new Map(
    readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8')
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => {
        const [id, shouldTrigger, selected, result] = line.split('\t')
        assert.ok(id && shouldTrigger && selected && result, 'malformed browser GIF trigger row')
        return [id, { shouldTrigger, selected, result }] as const
      }),
  )
  assert.equal(matrix.size, triggerCorpus.queries.length)
  for (const query of triggerCorpus.queries) {
    const row = matrix.get(query.id)
    assert.ok(row, 'missing browser GIF trigger row ' + query.id)
    const final = readFileSync(join(evidenceRoot, 'trigger', query.id, 'final.md'), 'utf8')
    const marker = final.trim().split('\n').at(-1)
    assert.ok(
      marker === 'SELECT: dsh-spec-browser-gif-evidence' || marker === 'SELECT: none',
      query.id + ' is missing a stable selection marker',
    )
    const selected = marker === 'SELECT: dsh-spec-browser-gif-evidence'
    const trace = readFileSync(join(evidenceRoot, 'trigger', query.id, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string })
    assert.equal(trace.at(-1)?.type, 'turn.completed', query.id + ' did not complete')
    assert.equal(row.shouldTrigger, String(query.should_trigger))
    assert.equal(row.selected, String(selected))
    assert.equal(row.result, query.should_trigger === selected ? 'pass' : 'fail')
    assert.equal(row.result, 'pass')
    assert.ok(final.trim().length > 0)
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

test('a path mention without reading the error skill is not trigger evidence', () => {
  const skill = '.agents/skills/dsh-spec-error-handling/SKILL.md'
  for (const command of [`ls ${skill}`, `stat ${skill}`, `test -f ${skill}`, `echo ${skill}`]) {
    assert.equal(commandReadsSkill(command), false, command)
  }
  for (const command of [`cat ${skill}`, `sed -n '1,20p' ${skill}`, `head -n 8 ${skill}`]) {
    assert.equal(commandReadsSkill(command), true, command)
  }
})
