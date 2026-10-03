/**
 * Installed-copy consistency: the gate, and the drift it must catch.
 *
 * A fixture authors one skill under its own `skills/` and builds the installed copy by hand the
 * way the installer writes it — injected `metadata:`, reordered keys, no blank line after the
 * closing `---` — so a case tampers with exactly one fact and sees the gate name it. The real
 * `.agents/skills/` is only read, by the case that runs the gate without `--root`; no case writes
 * to it, so the suite stays safe beside a parallel writer.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeFixture } from './helpers/fixtures.ts'
import type { Fixture } from './helpers/fixtures.ts'
import { runScript } from './helpers/cli.ts'

const SOURCE = 'skills/demo/SKILL.md'
const SOURCE_GUIDE = 'skills/demo/references/guide.md'
const INSTALLED = '.agents/skills/demo/SKILL.md'
const INSTALLED_GUIDE = '.agents/skills/demo/references/guide.md'
const BODY = '# Demo\n\nBody.\n'
const SOURCE_ENTRY = `---\nname: demo\ndescription: 'A demo skill.'\n---\n\n${BODY}`

/**
 * A branch name no repository has. It is what main carries today: the installer records the work
 * branch it copied from, and a merged branch is deleted while its copy stays current.
 */
const DELETED_BRANCH = 'refs/heads/deleted-work-branch'

/** The injected `metadata:` block, with the recorded tree sha taken from the fixture's own git. */
function installedEntry(treeSha: string): string {
  return `---\ndescription: A demo skill.\nmetadata:\n    github-path: skills/demo\n    github-ref: ${DELETED_BRANCH}\n    github-repo: https://github.com/example/dsh-spec\n    github-tree-sha: ${treeSha}\nname: demo\n---\n${BODY}`
}

/** One authored skill and its installed copy, committed so `HEAD:skills/demo` resolves. */
function installedFixture(): Fixture {
  const fixture = makeFixture()
  fixture.write(SOURCE, SOURCE_ENTRY)
  fixture.write(SOURCE_GUIDE, 'Guide.\n')
  fixture.commit('the authored skill')
  const tree = fixture.git('rev-parse', 'HEAD:skills/demo').stdout.trim()
  fixture.write(INSTALLED, installedEntry(tree))
  fixture.write(INSTALLED_GUIDE, 'Guide.\n')
  fixture.commit('the installed copy')
  return fixture
}

/** Run the gate against one fixture root. */
function gate(fixture: Fixture): { status: number, output: string } {
  return runScript('scripts/verify-installed-copy.ts', ['--root', fixture.root])
}

test('this repository’s installed copy passes the gate', () => {
  const result = runScript('scripts/verify-installed-copy.ts')

  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /verify-installed-copy: \d+ skill\(s\) equal their installed copies/)
})

test('an injected ref that names a deleted branch does not fail the gate', () => {
  const fixture = installedFixture()
  try {
    assert.match(fixture.read(INSTALLED), new RegExp(DELETED_BRANCH.replace(/[/-]/g, '\\$&')))
    const result = gate(fixture)

    assert.equal(result.status, 0, result.output)
  } finally {
    fixture.dispose()
  }
})

test('a tampered installed reference file fails the gate', () => {
  const fixture = installedFixture()
  try {
    fixture.write(INSTALLED_GUIDE, 'Tampered.\n')
    const result = gate(fixture)

    assert.notEqual(result.status, 0, result.output)
    assert.match(result.output, /demo\/references\/guide\.md.*differs byte-for-byte/)
  } finally {
    fixture.dispose()
  }
})

test('an authored file missing from the installed copy fails the gate', () => {
  const fixture = installedFixture()
  try {
    fixture.remove(INSTALLED_GUIDE)
    const result = gate(fixture)

    assert.notEqual(result.status, 0, result.output)
    assert.match(result.output, /demo\/references\/guide\.md: authored but missing from the installed copy/)
  } finally {
    fixture.dispose()
  }
})

test('a wrong github-tree-sha fails the gate', () => {
  const fixture = installedFixture()
  try {
    fixture.write(INSTALLED, installedEntry('0'.repeat(40)))
    const result = gate(fixture)

    assert.notEqual(result.status, 0, result.output)
    assert.match(result.output, /github-tree-sha 0{40} is not the authored tree/)
  } finally {
    fixture.dispose()
  }
})

test('an installed skill with no authored counterpart fails the gate', () => {
  const fixture = installedFixture()
  try {
    fixture.write('.agents/skills/extra/SKILL.md', fixture.read(INSTALLED))
    fixture.commit('an unlisted installed skill')
    const result = gate(fixture)

    assert.notEqual(result.status, 0, result.output)
    assert.match(result.output, /extra: installed under \.agents\/skills\/ but not authored under skills\//)
  } finally {
    fixture.dispose()
  }
})

test('an empty authored corpus fails the gate', () => {
  const fixture = makeFixture()
  try {
    fixture.mkdir('skills')
    fixture.mkdir('.agents/skills')
    const result = gate(fixture)

    assert.notEqual(result.status, 0, result.output)
    assert.match(result.output, /holds no skill directory/)
  } finally {
    fixture.dispose()
  }
})
