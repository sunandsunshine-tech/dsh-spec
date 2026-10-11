/**
 * The manifest's reading: what `optional` means, and every way the record fails.
 *
 * The reading is a value rather than an exit, so the validation can be observed without stopping a
 * process. The cases that end in a non-zero exit run the manager from the project's own tree: a
 * manager reads the manifest beside itself, so the repository's own `runCli` can only ever hand it
 * the repository's manifest, and a fixture needs a copy to carry a different one.
 */

import assert from 'node:assert/strict'
import { cpSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runEntry } from './helpers/cli.ts'
import { REPO_ROOT, makeFixture } from './helpers/fixtures.ts'
import type { Fixture } from './helpers/fixtures.ts'
import { readManifestRecord, requiredSkills } from '../skills/dsh-spec-manager/scripts/manager.ts'

/** The skills a manifest case names, one of which is optional. */
const SKILLS = ['dsh-spec-manager', 'dsh-code-review', 'dsh-agent-team-workflow']

/**
 * The manifest every case starts from, with `optional` replaced or left out.
 *
 * The gate record is included because a manifest in the field always carries one, and a verb that
 * runs the initializer reads it before it writes anything: an empty record is a reading rather than a
 * malformed one.
 */
function manifest(fields: { optional?: unknown, withOptional?: boolean } = {}): string {
  const record: Record<string, unknown> = { repo: 'sunandsunshine-tech/dsh-spec', skills: SKILLS, gates: [], scopes: {} }
  if (fields.withOptional === true) record.optional = fields.optional ?? []
  return `${JSON.stringify(record, null, 2)}\n`
}

/** Write a manifest into a fixture and read it back through the manager's own reading. */
function read(fixture: Fixture, text: string): ReturnType<typeof readManifestRecord> {
  fixture.write('manifest.json', text)
  return readManifestRecord(join(fixture.root, 'manifest.json'))
}

/** The reading a legal manifest produces, with the failure reported rather than returned. */
function readOrFail(fixture: Fixture, text: string): { repo: string, skills: string[], optional: string[] } {
  const reading = read(fixture, text)
  if (!reading.ok) assert.fail(`a legal manifest was refused: ${reading.error}`)
  return reading.manifest
}

/** Copy the manager skill into a fixture, so the copy beside it reads the fixture's manifest. */
function adoptManagerCopy(fixture: Fixture): string {
  const directory = join(fixture.root, '.agents', 'skills', 'dsh-spec-manager')
  cpSync(join(REPO_ROOT, 'skills', 'dsh-spec-manager'), directory, { recursive: true })
  return join(directory, 'scripts', 'manager.ts')
}

test('a manifest names its optional skills as a subset, and the rest are required', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const parsed = readOrFail(fixture, manifest({ withOptional: true, optional: ['dsh-agent-team-workflow'] }))

  assert.deepEqual(parsed, {
    repo: 'sunandsunshine-tech/dsh-spec',
    skills: SKILLS,
    optional: ['dsh-agent-team-workflow'],
  })
  // Required is derived from the two lists, so it cannot disagree with them.
  assert.deepEqual(requiredSkills(parsed), ['dsh-spec-manager', 'dsh-code-review'])
})

test('a manifest written before `optional` existed requires every skill it names', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const parsed = readOrFail(fixture, manifest())

  assert.deepEqual(parsed.optional, [], 'an absent `optional` was read as anything but nothing')
  assert.deepEqual(requiredSkills(parsed), SKILLS, 'an older manifest stopped requiring a skill')
})

test('a varied set of malformed `optional` values is refused, each naming what is wrong', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const cases: { text: string, why: RegExp }[] = [
    { text: manifest({ withOptional: true, optional: 'dsh-code-review' }), why: /`optional` that is not a list/ },
    { text: manifest({ withOptional: true, optional: ['Not_A_Skill'] }), why: /optional skill `Not_A_Skill`, which is not a skill name/ },
    { text: manifest({ withOptional: true, optional: ['', 'dsh-code-review'] }), why: /`optional` entry with no name/ },
    { text: manifest({ withOptional: true, optional: ['dsh-code-review', 'dsh-code-review'] }), why: /optional skill `dsh-code-review` twice/ },
    { text: manifest({ withOptional: true, optional: ['dsh-not-shipped'] }), why: /names `dsh-not-shipped` optional but `skills` does not/ },
  ]

  for (const entry of cases) {
    const reading = read(fixture, entry.text)
    assert.equal(reading.ok, false, `a malformed manifest was accepted: ${entry.text}`)
    if (reading.ok) continue
    assert.match(reading.error, entry.why, reading.error)
  }
})

test('the manager exits non-zero on a malformed manifest, and accepts a legal one', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const entry = adoptManagerCopy(fixture)
  const path = '.agents/skills/dsh-spec-manager/references/manifest.json'

  const malformed = [
    manifest({ withOptional: true, optional: 'dsh-code-review' }),
    manifest({ withOptional: true, optional: ['dsh-not-shipped'] }),
  ]
  for (const text of malformed) {
    fixture.write(path, text)
    const result = runEntry(entry, fixture.root, ['status', '--root', fixture.root])
    assert.equal(result.status, 1, `the manager accepted a malformed manifest:\n${result.output}`)
    assert.match(result.stderr, /^dsh-spec-manager: .*optional/m, result.output)
  }

  // A legal manifest carries the manager past the reading: the dry-run reports the skills instead
  // of refusing the record. Nothing consumes `optional` yet, so every skill is still named here.
  fixture.write(path, manifest({ withOptional: true, optional: ['dsh-agent-team-workflow'] }))
  const accepted = runEntry(entry, fixture.root, ['uninstall', '--dry-run', '--root', fixture.root])
  assert.equal(accepted.status, 0, accepted.output)
  assert.doesNotMatch(accepted.stderr, /dsh-spec-manager:/, accepted.output)
})
