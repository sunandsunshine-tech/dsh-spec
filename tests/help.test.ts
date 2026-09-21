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

/** Every command the design defines, at either level. */
const COMMANDS = [
  'install',
  'upgrade',
  'uninstall',
  'status',
  'check',
  'notes',
  'notes-archived',
  'translation-pair',
  'md-links',
]

/** Every verb of every noun, so a verb without help fails rather than printing nothing. */
const VERBS: ReadonlyArray<readonly [string, string]> = [
  ['notes', 'check'],
  ['notes-archived', 'check'],
  ['notes-archived', 'write'],
  ['translation-pair', 'check'],
  ['translation-pair', 'list'],
  ['translation-pair', 'explain'],
  ['translation-pair', 'write'],
  ['translation-pair', 'brief'],
  ['md-links', 'check'],
]

/** An environment with every language variable decided, so a case is independent of the machine. */
function locale(overrides: Record<string, string | undefined>): Record<string, string | undefined> {
  return { DSH_SPEC_LANG: undefined, LC_ALL: undefined, LC_MESSAGES: undefined, LANG: undefined, ...overrides }
}

test('--help names every command', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })

  assert.equal(result.status, 0, result.output)
  for (const command of COMMANDS) {
    assert.match(result.output, new RegExp(`\\b${command}\\b`), `--help does not name ${command}:\n${result.output}`)
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

test('every command answers --help', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const command of COMMANDS) {
    const result = runCli(fixture.root, [command, '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
    assert.equal(result.status, 0, `${command} --help exited ${result.status}:\n${result.output}`)
    assert.match(result.output, new RegExp(command), `${command} --help does not name itself:\n${result.output}`)
  }
})

test('every verb answers --help beside its noun', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const [noun, verb] of VERBS) {
    const result = runCli(fixture.root, [noun, verb, '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) })
    assert.equal(result.status, 0, `${noun} ${verb} --help exited ${result.status}:\n${result.output}`)
    assert.match(result.output, new RegExp(`${noun} ${verb}`), `${noun} ${verb} --help does not name itself:\n${result.output}`)
  }
})

test('a verb documents its own flags', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const help = (args: string[]): string => runCli(fixture.root, [...args, '--help'], { env: locale({ LANG: 'en_US.UTF-8' }) }).output

  for (const flag of ['--all', '--files-from']) {
    assert.match(help(['notes', 'check']), new RegExp(flag), `notes check --help does not document ${flag}`)
  }
  assert.match(help(['md-links', 'check']), /--files-from/)

  const check = help(['check'])
  for (const flag of ['--all', '--base', '--files-from']) {
    assert.match(check, new RegExp(flag), `check --help does not document ${flag}:\n${check}`)
  }

  const brief = help(['translation-pair', 'brief'])
  for (const flag of ['--apply']) {
    assert.match(brief, new RegExp(flag), `translation-pair brief --help does not document ${flag}:\n${brief}`)
  }

  const write = help(['translation-pair', 'write'])
  assert.match(write, /--all/)

  const install = help(['install'])
  assert.match(install, /--dry-run/)
  const upgrade = help(['upgrade'])
  assert.match(upgrade, /--reinstall/)
})

test('a command the grammar removed has no help', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const args of [['brief', '--help'], ['commit', '--help'], ['all', '--help']]) {
    const result = runCli(fixture.root, args, { env: locale({ LANG: 'en_US.UTF-8' }) })
    assert.equal(result.status, 2, `${args.join(' ')} was accepted:\n${result.output}`)
  }
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
