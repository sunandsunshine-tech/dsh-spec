/**
 * The help surface: one shape a reader expects, two languages, and the reference rendered from it.
 *
 * Only the help is localized, so every case here controls the environment completely — a variable
 * the runner happens to carry would otherwise decide the language and make the suite depend on the
 * machine. The reference case is the drift guard the design rests on: the committed `cli.md` and the
 * English help are one document, rendered twice.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { REPO_ROOT, makeFixture } from './helpers/fixtures.ts'

/** The subjects the design defines. */
const SUBJECTS = [
  'install',
  'upgrade',
  'uninstall',
  'status',
  'notes',
  'notes-archived',
  'translation-pair',
  'md-links',
  'commit',
  'all',
]

/** An environment with every language variable decided, so a case is independent of the machine. */
function locale(overrides: Record<string, string | undefined>): Record<string, string | undefined> {
  return { DSH_SPEC_LANG: undefined, LC_ALL: undefined, LC_MESSAGES: undefined, LANG: undefined, ...overrides }
}

test('--help names every subject', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })

  assert.equal(result.status, 0, result.output)
  for (const subject of SUBJECTS) {
    assert.match(result.output, new RegExp(`\\b${subject}\\b`), `--help does not name ${subject}:\n${result.output}`)
  }
})

test('--help en is English and --help zh is Chinese', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const english = runCli(fixture.root, ['--help', 'en'], { env: locale({ LANG: 'zh_CN.UTF-8' }) })
  const chinese = runCli(fixture.root, ['--help', 'zh'], { env: locale({ LANG: 'en_US.UTF-8' }) })

  assert.equal(english.status, 0, english.output)
  assert.equal(chinese.status, 0, chinese.output)
  assert.match(english.output, /Usage:/)
  assert.doesNotMatch(english.output, /用法/)
  assert.match(chinese.output, /用法/)
  assert.doesNotMatch(chinese.output, /Usage:/)
})

test('the language environment decides the help', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const byLang = runCli(fixture.root, ['--help'], { env: locale({ LANG: 'zh_CN.UTF-8' }) })
  assert.match(byLang.output, /用法/, `LANG=zh_CN.UTF-8 did not select Chinese:\n${byLang.output}`)

  const lcAllWins = runCli(fixture.root, ['--help'], { env: locale({ LANG: 'zh_CN.UTF-8', LC_ALL: 'en_US.UTF-8' }) })
  assert.match(lcAllWins.output, /Usage:/, `LC_ALL did not beat LANG:\n${lcAllWins.output}`)

  const explicitWins = runCli(fixture.root, ['--help'], { env: locale({ LC_ALL: 'en_US.UTF-8', DSH_SPEC_LANG: 'zh' }) })
  assert.match(explicitWins.output, /用法/, `DSH_SPEC_LANG did not beat LC_ALL:\n${explicitWins.output}`)

  // A locale that is neither is a locale, not a mistake: it falls back to English.
  const other = runCli(fixture.root, ['--help'], { env: locale({ LANG: 'de_DE.UTF-8' }) })
  assert.match(other.output, /Usage:/, `a non-zh locale did not fall back to English:\n${other.output}`)
})

test('the flag beats the environment, and the value is an enum', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const flagWins = runCli(fixture.root, ['--help', 'en'], { env: locale({ DSH_SPEC_LANG: 'zh' }) })
  assert.match(flagWins.output, /Usage:/, `--help en did not beat DSH_SPEC_LANG:\n${flagWins.output}`)

  const unknown = runCli(fixture.root, ['--help', 'de'], { env: locale({ LANG: 'en_US.UTF-8' }) })
  assert.equal(unknown.status, 2, unknown.output)
  assert.match(unknown.output, /zh/)
  assert.match(unknown.output, /en/)
})

test('every subject answers --help with its operations', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const subject of SUBJECTS) {
    const result = runCli(fixture.root, [subject, '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
    assert.equal(result.status, 0, `${subject} --help exited ${result.status}:\n${result.output}`)
    assert.match(result.output, new RegExp(subject), `${subject} --help does not name itself:\n${result.output}`)
  }

  const notes = runCli(fixture.root, ['notes', '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
  assert.match(notes.output, /--check/)
  assert.match(notes.output, /--all/)

  const links = runCli(fixture.root, ['md-links', '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
  assert.match(links.output, /--files-from/)

  const commit = runCli(fixture.root, ['commit', '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
  assert.match(commit.output, /--base/)

  // A subject documents the flags that are its own, beside the global ones.
  const install = runCli(fixture.root, ['install', '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
  assert.match(install.output, /--dry-run/)
  const upgrade = runCli(fixture.root, ['upgrade', '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
  assert.match(upgrade.output, /--reinstall/)
  const pair = runCli(fixture.root, ['translation-pair', '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
  for (const flag of ['--brief', '--apply', '--cached', '--list', '--write']) {
    assert.match(pair.output, new RegExp(flag), `translation-pair --help does not document ${flag}:\n${pair.output}`)
  }
})

test('the briefing is an operation of translation-pair, not a subject', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['brief', '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })

  assert.equal(result.status, 2, result.output)
})

test('the reference is the English help, rendered', () => {
  const path = join(REPO_ROOT, 'skills', 'dsh-spec-manager', 'references', 'cli.md')
  let committed: string
  try {
    committed = readFileSync(path, 'utf8')
  } catch {
    assert.fail(`${path} does not exist yet — render it with \`--help en --markdown\``)
  }

  const rendered = runCli(REPO_ROOT, ['--help', 'en', '--markdown'], { env: locale({ LANG: 'en_US.UTF-8' }) })

  assert.equal(rendered.status, 0, rendered.output)
  assert.equal(committed, rendered.stdout, 'references/cli.md and `--help en --markdown` have drifted apart')
})
