/**
 * Deterministic controls for the project-local review-platform fixture used by browser GIF
 * publication model scenarios. These cases prove byte bounds, attachment order and recorded
 * remote state without a network request or a model call.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { test, type TestContext } from 'node:test'

import { REPO_ROOT } from './helpers/fixtures.ts'

const FIXTURE = join(REPO_ROOT, 'tests/skill-evals/dsh-spec-record-browser-gif/evals/files/publication-project')
const MAX_BYTES = 5 * 1024 * 1024

function copyFixture(t: TestContext, source = FIXTURE): string {
  const root = mkdtempSync(join(tmpdir(), 'browser-gif-publication-'))
  cpSync(source, root, { recursive: true })
  chmodSync(join(root, 'bin/gh'), 0o755)
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}

function clearGeneratedOutputs(root: string): void {
  const cases = join(root, 'publication/cases')
  for (const entry of readdirSync(cases, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const caseRoot = join(cases, entry.name)
    rmSync(join(caseRoot, 'evidence'), { recursive: true, force: true })
    rmSync(join(caseRoot, 'invocations.jsonl'), { force: true })
    rmSync(join(caseRoot, 'remote.json'), { force: true })
  }
}

function fixture(t: TestContext, source = FIXTURE): string {
  const root = copyFixture(t, source)
  clearGeneratedOutputs(root)
  return root
}

function run(root: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  })
}

function prepare(root: string, name: string): { evidence: string; overlimitPath?: string } {
  const result = run(root, process.execPath, ['prepare-publication-fixture.mjs', name])
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout) as { evidence: string; overlimitPath?: string }
}

function cleanupTemporary(t: TestContext, prepared: { overlimitPath?: string }): void {
  const path = prepared.overlimitPath
  if (path) t.after(() => rmSync(dirname(path), { recursive: true, force: true }))
}

function gh(root: string, name: string, args: string[]) {
  return run(root, './bin/gh', args, { GH_FIXTURE_CASE: `publication/cases/${name}` })
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function attachSplit(root: string) {
  return gh(root, 'split', [
    'pr',
    'edit',
    '151',
    '--body-file',
    'publication/cases/split/body.md',
    '--attach',
    'publication/cases/split/evidence/part-01.gif',
    '--attach',
    'publication/cases/split/evidence/part-02.gif',
  ])
}

test('browser GIF split fixture keeps the aggregate over the limit and every part inside it', (t) => {
  const root = fixture(t)
  const prepared = prepare(root, 'split')
  cleanupTemporary(t, prepared)
  assert.ok(prepared.overlimitPath, 'the split fixture returned no temporary over-limit path')
  const temporaryRelative = relative(root, prepared.overlimitPath)
  assert.equal(isAbsolute(temporaryRelative) || temporaryRelative.startsWith('..'), true)
  assert.equal(existsSync(join(root, 'publication/cases/split/evidence/overlimit.gif')), false)
  const manifest = readJson<{
    full: { bytes: number; sha256: string; temporary: boolean }
    maxBytes: number
    parts: Array<{ bytes: number; order: number; path: string; range: string; sha256: string }>
  }>(join(root, 'publication/cases/split/evidence/split-manifest.json'))
  assert.equal(manifest.maxBytes, MAX_BYTES)
  assert.equal(manifest.full.temporary, true)
  assert.ok(manifest.full.bytes > manifest.maxBytes)
  assert.deepEqual(
    manifest.parts.map((part) => [part.order, part.range]),
    [
      [1, '0.000-1.600s'],
      [2, '1.600-3.200s'],
    ],
  )
  assert.equal(new Set(manifest.parts.map((part) => part.sha256)).size, manifest.parts.length)
  const fullArtifact = { ...manifest.full, path: prepared.overlimitPath }
  for (const artifact of [fullArtifact, ...manifest.parts]) {
    const path = isAbsolute(artifact.path) ? artifact.path : join(root, artifact.path)
    const bytes = readFileSync(path)
    assert.equal(bytes.subarray(0, 3).toString('ascii'), 'GIF')
    assert.equal(statSync(path).size, artifact.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.sha256)
  }
  for (const part of manifest.parts) assert.ok(part.bytes <= manifest.maxBytes)
})

test('browser GIF publication fixture preserves ordered references and unchanged live head', (t) => {
  const root = fixture(t)
  const prepared = prepare(root, 'split')
  cleanupTemporary(t, prepared)
  const before = gh(root, 'split', ['pr', 'view', '151', '--json', 'headRefOid,body,url'])
  assert.equal(before.status, 0, before.stderr)
  const initial = JSON.parse(before.stdout) as { headRefOid: string; body: string }
  assert.match(initial.body, /\]\(publication\/cases\/split\/evidence\/part-01\.gif\)/)
  assert.match(initial.body, /\]\(publication\/cases\/split\/evidence\/part-02\.gif\)/)

  const edit = gh(root, 'split', [
    'pr',
    'edit',
    '151',
    '--body-file',
    'publication/cases/split/body.md',
    '--attach',
    'publication/cases/split/evidence/part-01.gif',
    '--attach',
    'publication/cases/split/evidence/part-02.gif',
  ])
  assert.equal(edit.status, 0, edit.stderr)
  const after = gh(root, 'split', ['pr', 'view', '151', '--json', 'headRefOid,body,url'])
  assert.equal(after.status, 0, after.stderr)
  const remote = JSON.parse(after.stdout) as { headRefOid: string; body: string }
  assert.equal(remote.headRefOid, initial.headRefOid)
  assert.ok(remote.body.indexOf('/1-part-01.gif') < remote.body.indexOf('/2-part-02.gif'))
  assert.doesNotMatch(remote.body, /\]\(publication\/cases\/split\/evidence\//)

  const state = readJson<{
    headAtEdit: string
    uploads: Array<{ order: number; path: string }>
  }>(join(root, 'publication/cases/split/remote.json'))
  assert.equal(state.headAtEdit, initial.headRefOid)
  assert.deepEqual(
    state.uploads.map((upload) => [upload.order, upload.path]),
    [
      [1, 'publication/cases/split/evidence/part-01.gif'],
      [2, 'publication/cases/split/evidence/part-02.gif'],
    ],
  )
})

test('browser GIF partial attachment records one upload and leaves the body unresolved', (t) => {
  const root = fixture(t)
  prepare(root, 'partial')
  const edit = gh(root, 'partial', [
    'pr',
    'edit',
    '151',
    '--body-file',
    'publication/cases/partial/body.md',
    '--attach',
    'publication/cases/partial/evidence/part-01.gif',
    '--attach',
    'publication/cases/partial/evidence/part-02.gif',
  ])
  assert.equal(edit.status, 1)
  assert.match(edit.stderr, /simulated upload failure.*part-02\.gif/)
  const state = readJson<{
    body: string
    operations: Array<{ attachments: Array<{ path: string }> }>
    uploads: Array<{ order: number; path: string }>
  }>(join(root, 'publication/cases/partial/remote.json'))
  assert.equal(state.operations.length, 1)
  assert.deepEqual(
    state.operations[0]?.attachments.map((attachment) => attachment.path),
    ['publication/cases/partial/evidence/part-01.gif', 'publication/cases/partial/evidence/part-02.gif'],
  )
  assert.deepEqual(state.uploads, [
    {
      bytes: statSync(join(root, 'publication/cases/partial/evidence/part-01.gif')).size,
      order: 1,
      path: 'publication/cases/partial/evidence/part-01.gif',
      url: 'https://github.com/example/dsh-spec-fixture/assets/151/1-part-01.gif',
    },
  ])
  assert.match(state.body, /\]\(publication\/cases\/partial\/evidence\/part-01\.gif\)/)
  assert.match(state.body, /\]\(publication\/cases\/partial\/evidence\/part-02\.gif\)/)
})

test('browser GIF publication fixture exposes an uploaded part missing from the body', (t) => {
  const root = fixture(t)
  prepare(root, 'unreferenced')
  const edit = gh(root, 'unreferenced', [
    'pr',
    'edit',
    '151',
    '--body-file',
    'publication/cases/unreferenced/body.md',
    '--attach',
    'publication/cases/unreferenced/evidence/part-01.gif',
    '--attach',
    'publication/cases/unreferenced/evidence/part-02.gif',
  ])
  assert.equal(edit.status, 0, edit.stderr)
  const state = readJson<{
    body: string
    uploads: Array<{ order: number; path: string }>
  }>(join(root, 'publication/cases/unreferenced/remote.json'))
  assert.equal(state.uploads.length, 2)
  assert.match(state.body, /assets\/151\/1-part-01\.gif/)
  assert.match(state.body, /\]\(publication\/cases\/unreferenced\/evidence\/part-02\.gif\)/)
  assert.doesNotMatch(state.body, /assets\/151\/2-part-02\.gif/)
  const repair = gh(root, 'unreferenced', [
    'pr',
    'edit',
    '151',
    '--body-file',
    'publication/cases/unreferenced/body.md',
  ])
  assert.equal(repair.status, 1)
  assert.match(repair.stderr, /follow-up body update rejected/)
})

test('browser GIF publication fixture exposes a moved demonstrated head', (t) => {
  const moved = fixture(t)
  prepare(moved, 'moved-head')
  const view = gh(moved, 'moved-head', ['pr', 'view', '151', '--json', 'headRefOid,body,url'])
  assert.equal(view.status, 0, view.stderr)
  const observed = JSON.parse(view.stdout) as { headRefOid: string }
  assert.notEqual(observed.headRefOid, '1111111111111111111111111111111111111111')
  assert.equal(existsSync(join(moved, 'publication/cases/moved-head/remote.json')), false)
})

test('browser GIF publication fixture rejects duplicate attachments in one invocation', (t) => {
  const root = fixture(t)
  const prepared = prepare(root, 'split')
  cleanupTemporary(t, prepared)
  const edit = gh(root, 'split', [
    'pr',
    'edit',
    '151',
    '--body-file',
    'publication/cases/split/body.md',
    '--attach',
    'publication/cases/split/evidence/part-01.gif',
    '--attach',
    'publication/cases/split/evidence/part-01.gif',
  ])
  assert.equal(edit.status, 1)
  assert.match(edit.stderr, /the same file cannot be attached twice/)
  assert.equal(existsSync(join(root, 'publication/cases/split/remote.json')), false)
})

test('browser GIF publication fixture staging discards prior local use before repeated prepare and edit', (t) => {
  const usedSource = fixture(t)
  const initial = prepare(usedSource, 'split')
  cleanupTemporary(t, initial)
  const initialEdit = attachSplit(usedSource)
  assert.equal(initialEdit.status, 0, initialEdit.stderr)
  assert.equal(existsSync(join(usedSource, 'publication/cases/split/evidence/part-01.gif')), true)
  assert.equal(existsSync(join(usedSource, 'publication/cases/split/invocations.jsonl')), true)
  assert.equal(existsSync(join(usedSource, 'publication/cases/split/remote.json')), true)

  const root = fixture(t, usedSource)
  assert.equal(existsSync(join(root, 'publication/cases/split/evidence')), false, 'staging retained prior evidence')
  assert.equal(
    existsSync(join(root, 'publication/cases/split/invocations.jsonl')),
    false,
    'staging retained prior invocations',
  )
  assert.equal(
    existsSync(join(root, 'publication/cases/split/remote.json')),
    false,
    'staging retained prior remote state',
  )

  const prepared = prepare(root, 'split')
  cleanupTemporary(t, prepared)
  const edit = attachSplit(root)
  assert.equal(edit.status, 0, edit.stderr)
  const state = readJson<{ operations: unknown[]; uploads: unknown[] }>(
    join(root, 'publication/cases/split/remote.json'),
  )
  assert.equal(state.operations.length, 1, 'staged use mixed edit history')
  assert.equal(state.uploads.length, 2, 'staged use mixed upload history')
})
