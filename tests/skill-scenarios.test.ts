/**
 * The capability scenarios shipped beside the two skills whose work can need an isolated context.
 *
 * These cases validate the scenario corpus, not a model run. The official Agent Skills eval loop
 * executes each prompt in a clean context; a green corpus keeps the no-isolation and
 * isolation-available paths present, complete, and paired with observable acceptance evidence.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
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

function scenarioPath(skill: string): string {
  return join(REPO_ROOT, 'skills', skill, 'evals', 'evals.json')
}

function readCorpus(skill: string): ScenarioCorpus {
  return JSON.parse(readFileSync(scenarioPath(skill), 'utf8')) as ScenarioCorpus
}

function assertInputFile(skillRoot: string, file: string, label: string): void {
  assert.ok(file.startsWith('evals/files/'), label + ' names an input outside evals/files/')
  const absolute = join(skillRoot, file)
  assert.ok(existsSync(absolute), label + ' input does not exist: ' + file)
  const resolved = realpathSync(absolute)
  assert.ok(resolved.startsWith(realpathSync(skillRoot) + sep), label + ' input escapes the skill: ' + file)
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
    assert.ok(scenario.assertions.length > 0, id + ' must carry observable assertions')
  }
  for (const id of required.isolatedIds) {
    const scenario = byId.get(id)
    assert.ok(scenario)
    assert.match(scenario.prompt, /isolated subagents?|isolated contexts?/i)
    assert.ok(scenario.assertions.length > 0, id + ' must carry observable assertions')
  }
  for (const id of required.handoffIds) {
    const scenario = byId.get(id)
    assert.ok(scenario)
    assert.match(scenario.expected_output, /hands? off|handoff|stops? before claiming completion/i)
    assert.ok(
      scenario.assertions.some((assertion) => /hand off|handoff|pending work|next step/i.test(assertion)),
      id + ' must define resumable handoff evidence',
    )
  }

  for (const scenario of corpus.evals) {
    assert.ok(scenario.id)
    assert.ok(scenario.prompt)
    assert.ok(scenario.expected_output)
    assert.ok(scenario.assertions.length > 0)
    assert.ok((scenario.files?.length ?? 0) > 0, scenario.id + ' must ship its input files')
    const skillRoot = join(REPO_ROOT, 'skills', required.skill)
    for (const file of scenario.files ?? []) {
      assertInputFile(skillRoot, file, scenario.id)
    }
  }
}

test('the capability scenario corpus covers absent and available isolated execution', () => {
  for (const required of REQUIRED) validateCorpus(readCorpus(required.skill), required)
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

test('the translation fixture starts as a consistent existing pair', () => {
  const skillRoot = join(REPO_ROOT, 'skills/dsh-spec-translate-docs')
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
  assert.throws(() => validateCorpus(evidenceFree, required), /observable assertions/)
})

test('the scenario input check rejects missing, empty, directory and escaping files', () => {
  const root = mkdtempSync(join(tmpdir(), 'skill-scenarios-files-'))
  const files = join(root, 'evals', 'files')
  try {
    mkdirSync(files, { recursive: true })
    assert.throws(() => assertInputFile(root, 'evals/files/missing.md', 'missing'), /does not exist/)
    writeFileSync(join(files, 'empty.md'), '')
    assert.throws(() => assertInputFile(root, 'evals/files/empty.md', 'empty'), /is empty/)
    mkdirSync(join(files, 'directory'))
    assert.throws(() => assertInputFile(root, 'evals/files/directory', 'directory'), /not a regular file/)
    const outside = mkdtempSync(join(tmpdir(), 'skill-scenarios-outside-'))
    try {
      writeFileSync(join(outside, 'outside.md'), '# outside\n')
      symlinkSync(join(outside, 'outside.md'), join(files, 'outside.md'))
      assert.throws(() => assertInputFile(root, 'evals/files/outside.md', 'link'), /escapes the skill/)
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
