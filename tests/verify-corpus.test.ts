/**
 * The corpus gate's archive baseline: the CLI forwards --base-ref to the notes archive.
 *
 * A green gate that silently ignored the flag would verify the change against its own tip instead
 * of the protected branch, so the forwarding is pinned here rather than left to a manual run.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'
import { runScript } from './helpers/cli.ts'

test('an empty --base-ref is a usage error', () => {
  const result = runScript('scripts/verify-corpus.ts', ['--base-ref='])
  assert.equal(result.status, 2, result.output)
  assert.match(result.stderr, /non-empty value/)
})

test('a --base-ref value that is another option is a usage error', () => {
  const spaced = runScript('scripts/verify-corpus.ts', ['--base-ref', '--json'])
  assert.equal(spaced.status, 2, spaced.output)
  assert.match(spaced.stderr, /needs a value/)
  const equals = runScript('scripts/verify-corpus.ts', ['--base-ref=-'])
  assert.equal(equals.status, 2, equals.output)
  assert.match(equals.stderr, /needs a non-empty value/)
})

test('an empty notes corpus fails the corpus gate', () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-corpus-empty-'))
  try {
    for (const path of [
      'skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs',
      'skills/dsh-spec-agent-notes/scripts/notes.mjs',
      'skills/dsh-spec-translate-docs/scripts/translate-pair.mjs',
      'skills/dsh-spec-error-handling',
      'scripts/submit-vendored.ts',
      'scripts/verify-corpus.ts',
      'THIRD_PARTY_NOTICES.md',
    ]) {
      const target = join(root, path)
      mkdirSync(dirname(target), { recursive: true })
      cpSync(join(REPO_ROOT, path), target, { recursive: true })
    }
    spawnSync('git', ['init'], { cwd: root })
    const notes = join(root, 'skills/dsh-spec-agent-notes/scripts/notes.mjs')
    const init = spawnSync(process.execPath, [notes, 'init', '--root', join(root, '.agents/dsh-spec-agent-notes')], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.equal(init.status, 0, init.stderr)
    const result = spawnSync(process.execPath, [join(root, 'scripts/verify-corpus.ts')], {
      cwd: root,
      encoding: 'utf8',
    })
    const output = (result.stdout ?? '') + (result.stderr ?? '')
    assert.equal(result.status, 1, output)
    assert.match(output, /FAIL notes tree/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a valid archive baseline passes the notes archive gate', () => {
  const result = runScript('scripts/verify-corpus.ts', ['--base-ref=HEAD'])
  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /ok   notes archive/)
})

test('an unreadable archive baseline fails the notes archive gate', () => {
  const result = runScript('scripts/verify-corpus.ts', ['--base-ref=refs/heads/dsh-spec-missing-baseline'])
  assert.equal(result.status, 1, result.output)
  assert.match(result.stdout, /FAIL notes archive/)
  assert.match(result.output, /cannot read baseline/)
  assert.match(result.output, /dsh-spec-missing-baseline/)
})
