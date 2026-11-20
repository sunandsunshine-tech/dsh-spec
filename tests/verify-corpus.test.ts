/**
 * The corpus gate's orchestration: argument forwarding and gate classification.
 *
 * A green gate that silently ignored the flag would verify the change against its own tip instead
 * of the protected branch, so the forwarding is pinned here. The real maintained corpus is one
 * shared integration run through `pnpm run check:corpus`; these cases use a stub corpus so the
 * functional suite does not repeat that work.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'
import { runScript } from './helpers/cli.ts'

function write(root: string, path: string, text: string): void {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, text)
}

function stubSiblingCorpus(context: { after(callback: () => void): void }, failing: boolean): string {
  const root = mkdtempSync(join(tmpdir(), 'verify-corpus-siblings-'))
  context.after(() => rmSync(root, { recursive: true, force: true }))
  symlinkSync(join(REPO_ROOT, 'node_modules'), join(root, 'node_modules'), 'dir')
  const siblingGate = join(root, 'scripts/verify-sibling-references.ts')
  mkdirSync(dirname(siblingGate), { recursive: true })
  cpSync(join(REPO_ROOT, 'scripts/verify-sibling-references.ts'), siblingGate)

  write(root, 'skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs', 'process.exit(0)\n')
  write(
    root,
    'skills/dsh-spec-agent-notes/scripts/notes.mjs',
    `if (process.argv[2] === 'check') console.log(JSON.stringify({ notes: 1 }))
if (process.argv[2] === 'archive') {
  const args = process.argv.slice(3)
  const equals = args.find((arg) => arg.startsWith('--base-ref='))
  const flag = args.indexOf('--base-ref')
  const baseRef = equals?.slice('--base-ref='.length) ?? (flag === -1 ? undefined : args[flag + 1])
  if (baseRef && baseRef !== 'HEAD') {
    console.error('cannot read baseline ' + baseRef)
    process.exit(1)
  }
}
`,
  )
  write(
    root,
    'skills/dsh-spec-translate-docs/scripts/translate-pair.mjs',
    "if (!process.argv.includes('tests/skill-evals/**') || !process.argv.includes('tests/skill-evals/**/.*/**')) process.exit(4)\n" +
      "if (process.argv[2] === 'list') console.log('ok sample.zh.md')\n",
  )
  write(root, 'scripts/submit-vendored.ts', 'process.exit(0)\n')
  write(
    root,
    'skills/dsh-spec-a/SKILL.md',
    `---\nname: dsh-spec-a\ndescription: A task.\n---\n\n${
      failing ? 'See dsh-spec-b.' : '(when available, use the dsh-spec-b skill)'
    }\n`,
  )
  write(root, 'skills/dsh-spec-b/SKILL.md', '---\nname: dsh-spec-b\ndescription: Another task.\n---\n\nBody.\n')
  return root
}

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
      'scripts/verify-sibling-references.ts',
      'scripts/submit-vendored.ts',
      'scripts/verify-corpus.ts',
      'THIRD_PARTY_NOTICES.md',
    ]) {
      const target = join(root, path)
      mkdirSync(dirname(target), { recursive: true })
      cpSync(join(REPO_ROOT, path), target, { recursive: true })
    }
    symlinkSync(join(REPO_ROOT, 'node_modules'), join(root, 'node_modules'), 'dir')
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

test('a valid archive baseline passes the notes archive gate', (t) => {
  const result = runScript('scripts/verify-corpus.ts', ['--base-ref=HEAD'], stubSiblingCorpus(t, false))
  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /ok   notes archive/)
})

test('the corpus gate runs and reports a passing sibling-reference gate', (t) => {
  const result = runScript('scripts/verify-corpus.ts', [], stubSiblingCorpus(t, false))
  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /ok {3}sibling skill references/)
})

test('translation discovery excludes the development eval corpus', (t) => {
  const result = runScript('scripts/verify-corpus.ts', [], stubSiblingCorpus(t, false))
  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /ok {3}translation pairs/)
})

test('a sibling-reference finding fails the corpus gate', (t) => {
  const result = runScript('scripts/verify-corpus.ts', [], stubSiblingCorpus(t, true))
  assert.equal(result.status, 1, result.output)
  assert.match(result.stdout, /FAIL sibling skill references/)
  assert.match(result.output, /FAIL skills\/dsh-spec-a\/SKILL\.md:6 — dsh-spec-b is outside/)
})

test('an unreadable archive baseline fails the notes archive gate', (t) => {
  const result = runScript(
    'scripts/verify-corpus.ts',
    ['--base-ref=refs/heads/dsh-spec-missing-baseline'],
    stubSiblingCorpus(t, false),
  )
  assert.equal(result.status, 1, result.output)
  assert.match(result.stdout, /FAIL notes archive/)
  assert.match(result.output, /cannot read baseline/)
  assert.match(result.output, /dsh-spec-missing-baseline/)
})
