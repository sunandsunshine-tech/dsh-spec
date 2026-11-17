/**
 * The sibling-reference gate: descriptions name no sibling, and visible Markdown uses only the two
 * availability-qualified examples. Cases build a scratch skill corpus and run the real CLI.
 */

import assert from 'node:assert/strict'
import { symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runScript } from './helpers/cli.ts'
import { makeWorkspace, type Workspace } from './helpers/workspace.ts'

const gate = 'scripts/verify-sibling-references.ts'

interface CleanupContext {
  after(callback: () => void): void
}

function skill(name: string, body = 'Follow the project requirements.\n', extra = ''): string {
  return `---\nname: ${name}\ndescription: Carries ${name}'s task.\n${extra}---\n\n${body}`
}

function corpus(context: CleanupContext, files: Record<string, string>): Workspace {
  const workspace = makeWorkspace()
  context.after(() => workspace.dispose())
  for (const [path, text] of Object.entries(files)) workspace.write(path, text)
  return workspace
}

function twoSkills(context: CleanupContext, alphaBody: string, extra: Record<string, string> = {}): Workspace {
  return corpus(context, {
    'skills/dsh-spec-alpha/SKILL.md': skill('dsh-spec-alpha', alphaBody),
    'skills/dsh-spec-beta/SKILL.md': skill('dsh-spec-beta'),
    ...extra,
  })
}

function check(workspace: Workspace) {
  return runScript(gate, [], workspace.root)
}

test('exact references pass across formatting, links, code, paths, self names and translations', (t) => {
  const workspace = twoSkills(
    t,
    [
      'Follow prose (when available, use the `dsh-spec-beta` skill).',
      '',
      'Use guidance (when available, consider using the dsh-spec-beta skill).',
      '',
      'Both (when available, use the `dsh-spec-beta` skill) and (when available, consider using',
      'the `dsh-spec-beta` skill).',
      '',
      '<span>(when available, use the dsh-spec-beta skill)</span>',
      '',
      'The owner dsh-spec-alpha and `.agents/dsh-spec-beta/notes` are examples.',
      'See https://example.test/dsh-spec-beta, dsh-spec-beta.md and <span data-skill="dsh-spec-beta">note</span>.',
      'Run `node skills/dsh-spec-beta/scripts/tool.mjs`.',
      'Read [the guide][guide].',
      '',
      '[guide]: skills/dsh-spec-beta/references/guide.md',
      '',
      '```text',
      'dsh-spec-beta',
      'node skills/dsh-spec-beta/scripts/tool.mjs',
      '```',
      '',
      '    dsh-spec-beta',
    ].join('\n'),
    {
      'skills/dsh-spec-alpha/references/guide.zh.md':
        'Use the optional helper (when available, use the dsh-spec-beta skill).\n',
    },
  )
  const result = check(workspace)
  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /ok sibling skill references — 2 skill\(s\), 6 reference\(s\)/)
})

test('description and compatibility fields name no sibling', (t) => {
  for (const [field, line, fieldLine] of [
    ['description', 'Uses dsh-spec-beta by default.', 3],
    ['compatibility', 'Requires dsh-spec-beta.', 4],
  ] as const) {
    const frontmatter = [
      '---',
      'name: dsh-spec-alpha',
      ...(field === 'description' ? [`description: ${line}`] : ['description: A task.', `compatibility: ${line}`]),
      '---',
      '',
      'Body.',
      '',
    ].join('\n')
    const workspace = corpus(t, {
      'skills/dsh-spec-alpha/SKILL.md': frontmatter,
      'skills/dsh-spec-beta/SKILL.md': skill('dsh-spec-beta'),
    })
    const result = check(workspace)
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, new RegExp(`FAIL .*SKILL\\.md:${fieldLine} — ${field} names sibling dsh-spec-beta`))
  }
})

test('bare and inline-code-only sibling names fail', (t) => {
  const workspace = twoSkills(t, 'See dsh-spec-beta. Also use `dsh-spec-beta` directly.\n')
  const result = check(workspace)
  assert.equal(result.status, 1, result.output)
  assert.equal((result.stdout.match(/outside an exact availability reference/g) ?? []).length, 2, result.output)
})

test('additional detail or a non-exact phrase inside the parenthesis fails', (t) => {
  const workspace = twoSkills(
    t,
    [
      "Use its skeleton (when available, use the `dsh-spec-beta` skill's Problem section).",
      '',
      'Then select checks (when available, use the dsh-spec-beta skill to select them).',
      '',
      'A malformed form (when available, use dsh-spec-beta skill).',
    ].join('\n'),
  )
  const result = check(workspace)
  assert.equal(result.status, 1, result.output)
  assert.equal((result.stdout.match(/additional or malformed content/g) ?? []).length, 3, result.output)
})

test('ordinary when-available prose without a sibling name passes', (t) => {
  const workspace = twoSkills(
    t,
    [
      'A cache may be used (when available, prefer the local copy).',
      '',
      'The host may cache data (when available, use a local copy).',
    ].join('\n'),
  )
  const result = check(workspace)
  assert.equal(result.status, 0, result.output)
})

test('paths, filenames and command arguments inside an availability parenthesis fail', (t) => {
  for (const body of [
    '(when available, use the dsh-spec-beta/references skill)',
    '(when available, use the dsh-spec-beta.md skill)',
    '(when available, use `dsh-spec-beta --section Problem` skill)',
  ]) {
    const workspace = twoSkills(t, body + '\n')
    const result = check(workspace)
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /additional or malformed content/)
  }
})

test('an unknown dsh-spec candidate fails even in an availability-shaped parenthesis', (t) => {
  const workspace = twoSkills(t, 'Use help (when available, use the dsh-spec-missing skill).\n')
  const result = check(workspace)
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /unknown skill reference dsh-spec-missing/)
})

test('mixed-case and malformed dsh-spec candidates fail while a known name still passes', (t) => {
  for (const candidate of ['dsh-spec-Beta', 'dsh-spec-beta--typo']) {
    const workspace = twoSkills(t, `(when available, use the ${candidate} skill)\n`)
    const result = check(workspace)
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, new RegExp(`unknown skill reference ${candidate}`))
  }
  const workspace = twoSkills(t, '(when available, use the dsh-spec-beta skill)\n')
  const result = check(workspace)
  assert.equal(result.status, 0, result.output)
})

test('visible link labels and ordinary HTML text are scanned', (t) => {
  for (const body of [
    '[dsh-spec-beta](references/guide.md)',
    '<span>dsh-spec-beta</span>',
    '<a href="references/guide.md">dsh-spec-beta</a>',
  ]) {
    const workspace = twoSkills(t, body + '\n')
    const result = check(workspace)
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /outside an exact availability reference/)
  }
})

test('the whole availability phrase in inline code is not the name-only exception', (t) => {
  const workspace = twoSkills(t, '`(when available, use the dsh-spec-beta skill)`\n')
  const result = check(workspace)
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /additional or malformed content/)
})

test('a finding after a soft line break reports its actual source line', (t) => {
  const workspace = twoSkills(t, 'First line stays clean.\nSee dsh-spec-beta on this line.\n')
  const result = check(workspace)
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /FAIL .*SKILL\.md:7 — dsh-spec-beta is outside/)
})

test('a markdown file symlinked into references is scanned', (t) => {
  const workspace = twoSkills(t, 'Body.\n')
  workspace.write('skills/dsh-spec-alpha/source/note.md', 'Clean first line.\nSee dsh-spec-beta.\n')
  workspace.mkdir('skills/dsh-spec-alpha/references')
  symlinkSync('../source/note.md', join(workspace.root, 'skills/dsh-spec-alpha/references/notes.md'))
  const result = check(workspace)
  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /FAIL skills\/dsh-spec-alpha\/references\/notes\.md:2 — dsh-spec-beta is outside/)
})

test('a directory symlinked into references is scanned', (t) => {
  const workspace = twoSkills(t, 'Body.\n')
  workspace.write('skills/dsh-spec-alpha/source/nested/note.md', 'Clean first line.\nSee dsh-spec-beta.\n')
  workspace.mkdir('skills/dsh-spec-alpha/references')
  symlinkSync('../source', join(workspace.root, 'skills/dsh-spec-alpha/references/linked'), 'dir')
  const result = check(workspace)
  assert.equal(result.status, 1, result.output)
  assert.match(
    result.output,
    /FAIL skills\/dsh-spec-alpha\/references\/linked\/nested\/note\.md:2 — dsh-spec-beta is outside/,
  )
})

test('broken and cyclic reference symlinks fail without recursing forever', (t) => {
  const broken = twoSkills(t, 'Body.\n')
  broken.mkdir('skills/dsh-spec-alpha/references')
  symlinkSync('../missing.md', join(broken.root, 'skills/dsh-spec-alpha/references/broken.md'))
  const brokenResult = check(broken)
  assert.equal(brokenResult.status, 1, brokenResult.output)
  assert.match(brokenResult.output, /references\/broken\.md:1 — cannot follow symbolic link/)

  const cyclic = twoSkills(t, 'Body.\n')
  cyclic.mkdir('skills/dsh-spec-alpha/references')
  symlinkSync('.', join(cyclic.root, 'skills/dsh-spec-alpha/references/loop'), 'dir')
  const cyclicResult = check(cyclic)
  assert.equal(cyclicResult.status, 1, cyclicResult.output)
  assert.match(cyclicResult.output, /references\/loop:1 — symbolic link cycle/)
})

test('reference symlinks cannot escape the skill', (t) => {
  const fileLink = twoSkills(t, 'Body.\n')
  fileLink.write('outside/note.md', 'See dsh-spec-beta.\n')
  fileLink.mkdir('skills/dsh-spec-alpha/references')
  symlinkSync('../../../outside/note.md', join(fileLink.root, 'skills/dsh-spec-alpha/references/notes.md'))
  const fileResult = check(fileLink)
  assert.equal(fileResult.status, 1, fileResult.output)
  assert.match(fileResult.output, /references\/notes\.md:1 — symbolic link escapes the skill/)

  const directoryLink = twoSkills(t, 'Body.\n')
  directoryLink.write('outside/note.md', 'See dsh-spec-beta.\n')
  directoryLink.mkdir('skills/dsh-spec-alpha/references')
  symlinkSync('../../../outside', join(directoryLink.root, 'skills/dsh-spec-alpha/references/linked'), 'dir')
  const directoryResult = check(directoryLink)
  assert.equal(directoryResult.status, 1, directoryResult.output)
  assert.match(directoryResult.output, /references\/linked:1 — symbolic link escapes the skill/)
})

test('HTML code and command inline code are excluded', (t) => {
  const workspace = twoSkills(
    t,
    ['<pre><code>dsh-spec-beta</code></pre>', '', '`node --version dsh-spec-beta`', '', '`dsh-spec-beta --check`'].join(
      '\n',
    ),
  )
  const result = check(workspace)
  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /0 reference\(s\)/)
})

test('an empty or source-free corpus fails', (t) => {
  const empty = corpus(t, {})
  const emptyResult = check(empty)
  assert.equal(emptyResult.status, 1, emptyResult.output)
  assert.match(emptyResult.stderr, /no skills under skills\/; nothing to check/)

  const sourceFree = corpus(t, { 'skills/dsh-spec-empty/.keep': '' })
  const sourceResult = check(sourceFree)
  assert.equal(sourceResult.status, 1, sourceResult.output)
  assert.match(sourceResult.stderr, /no SKILL\.md files under skills\/; nothing to check/)
})

test('a single skill with no sibling reference passes', (t) => {
  const workspace = corpus(t, {
    'skills/dsh-spec-only/SKILL.md': skill('dsh-spec-only', 'Use dsh-spec-only as its own name.\n'),
  })
  const result = check(workspace)
  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /1 skill\(s\), 0 reference\(s\)/)
})
