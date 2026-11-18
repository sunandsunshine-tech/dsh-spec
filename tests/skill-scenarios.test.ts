/**
 * Development-side capability scenarios for the two skills whose work can need an isolated context.
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

const ALL_REQUIRED = [...REQUIRED, FORGE_REQUIRED]

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

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  assert.equal(typeof value, 'string', label + ' must be a string')
  assert.ok(value.trim().length > 0, label + ' must not be blank')
}

function assertNonEmptyStrings(values: readonly unknown[] | undefined, label: string): asserts values is string[] {
  assert.ok(values !== undefined && values.length > 0, label + ' must not be empty')
  for (const value of values) assertNonEmptyString(value, label)
}

test('the capability scenario corpus covers absent and available isolated execution', () => {
  for (const required of REQUIRED) validateCorpus(readCorpus(required.skill), required)
  validateCorpus(readCorpus(FORGE_REQUIRED.skill), FORGE_REQUIRED)
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
      for (const file of scenario.files ?? []) assertInputFile(skillRoot, file, scenario.id)
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
  const source = 'evals/files/vendor/docs/guide.md'
  const result = spawnSync(process.execPath, [script, 'check', source, '--target', 'zh=中文'], {
    cwd: skillRoot,
    encoding: 'utf8',
  })
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
