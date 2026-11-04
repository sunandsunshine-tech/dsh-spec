/**
 * The CLI contract the repository's scripts share.
 *
 * A command answers `--help` and `-h` with usage on stdout and exit 0. An unknown option is a
 * usage error: one `<tool>: <message>` line on stderr, a `run "<tool> --help" for usage` line, and
 * exit 2, without the full usage. A command that accepts `--json` prints parseable, indented JSON
 * with a trailing newline. The wording belongs to each command; the exit status, the diagnostic
 * channel and the output shape are the shared contract.
 *
 * The pairing CLI follows the same shape: its usage errors carry the `<tool>:` prefix and the
 * `run "<tool> --help"` hint, and its `--help` exits 0.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { skillBundle } from './helpers/bundles.ts'
import { runScript } from './helpers/cli.ts'
import { makeIsolatedFixture } from './helpers/fixtures.ts'
import { makeWorkspace } from './helpers/workspace.ts'

interface CommandContract {
  /** The bundle or repository script; skill bundles resolve to the work draft while one exists. */
  script: string
  /** The tool name a diagnostic starts with. */
  tool: string
  /** Arguments that reach an unknown option after any required positionals. */
  unknownArgs: string[]
  /** Whether the usage error's second line points at `--help`. */
  usageHint: boolean
  /** Whether the command accepts `--json`. */
  json?: boolean
}

const COMMANDS: CommandContract[] = [
  {
    script: skillBundle('dsh-spec-agent-notes', 'notes.mjs'),
    tool: 'notes.mjs',
    unknownArgs: ['check', '--no-such-option'],
    usageHint: true,
    json: true,
  },
  {
    script: skillBundle('dsh-spec-pre-push-checks', 'change-scope.mjs'),
    tool: 'change-scope.mjs',
    unknownArgs: ['--base', 'HEAD', '--no-such-option'],
    usageHint: true,
  },
  {
    script: skillBundle('dsh-spec-skill-forge', 'forge.mjs'),
    tool: 'forge.mjs',
    unknownArgs: ['draft', 'alpha', '--no-such-option'],
    usageHint: true,
    json: true,
  },
  {
    script: skillBundle('dsh-spec-skill-forge', 'verify-skill-spec.mjs'),
    tool: 'verify-skill-spec.mjs',
    unknownArgs: ['--no-such-option'],
    usageHint: true,
    json: true,
  },
  {
    script: skillBundle('dsh-spec-translate-docs', 'translate-pair.mjs'),
    tool: 'translate-pair',
    unknownArgs: ['list', '--no-such-option'],
    usageHint: true,
  },
  { script: 'scripts/verify-dco.ts', tool: 'verify-dco.ts', unknownArgs: ['--no-such-option'], usageHint: true },
  {
    script: 'scripts/submit-vendored.ts',
    tool: 'submit-vendored.ts',
    unknownArgs: ['--no-such-option'],
    usageHint: true,
  },
  { script: 'scripts/check-bundles.ts', tool: 'check-bundles.ts', unknownArgs: ['--no-such-option'], usageHint: true },
  {
    script: 'scripts/refresh-skills.ts',
    tool: 'refresh-skills.ts',
    unknownArgs: ['--no-such-option'],
    usageHint: true,
  },
  { script: 'scripts/build-skills.ts', tool: 'build-skills.ts', unknownArgs: ['--no-such-option'], usageHint: true },
  { script: 'scripts/verify-corpus.ts', tool: 'verify-corpus.ts', unknownArgs: ['--no-such-option'], usageHint: true },
  {
    script: 'scripts/sync-vendored-notices.ts',
    tool: 'sync-vendored-notices.ts',
    unknownArgs: ['--no-such-option'],
    usageHint: true,
  },
]

/** A literal string for a regular expression. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The contract entry for one command, required to declare `--json` where a case parses it. */
function commandWithJson(tool: string): CommandContract {
  const command = COMMANDS.find((item) => item.tool === tool)
  assert.ok(command !== undefined, tool + ' is listed as a command')
  assert.equal(command.json, true, tool + ' declares --json')
  return command
}

/** Parse a pretty JSON result: indented and newline terminated. */
function parsePrettyJson(text: string): unknown {
  assert.ok(text.endsWith('\n'), 'JSON output ends with a newline')
  assert.match(text, /\n  "/, 'JSON output is indented')
  return JSON.parse(text)
}

for (const command of COMMANDS) {
  test(command.tool + ' answers --help and -h with usage and exit 0', () => {
    const long = runScript(command.script, ['--help'])
    assert.equal(long.status, 0, long.output)
    assert.equal(long.stderr, '')
    assert.match(long.stdout, /usage:/i)

    const short = runScript(command.script, ['-h'])
    assert.equal(short.status, 0, short.output)
    assert.equal(short.stderr, '')
    assert.equal(short.stdout, long.stdout)
  })

  test(command.tool + ' reports an unknown option as a usage error with exit 2', () => {
    const result = runScript(command.script, command.unknownArgs)
    assert.equal(result.status, 2, result.output)
    assert.equal(result.stdout, '')
    assert.doesNotMatch(result.stderr, /usage:/i)
    const lines = result.stderr.trimEnd().split('\n')
    assert.match(lines[0] as string, new RegExp('^' + escapeRegExp(command.tool) + ': '))
    if (command.usageHint) {
      assert.equal(lines.length, 2, result.stderr)
      assert.equal(lines[1], 'run "' + command.tool + ' --help" for usage')
    }
  })
}

test('notes --help wins over a later invalid option', () => {
  const result = runScript(skillBundle('dsh-spec-agent-notes', 'notes.mjs'), ['--help', '--bogus', 'check'])
  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /usage:/)
})

test('verify-dco rejects empty range values', () => {
  for (const [name, value] of [
    ['DCO_ROOT', ''],
    ['DCO_ROOT', '-x'],
    ['DCO_BASE', ''],
    ['DCO_BASE', '-x'],
    ['DCO_HEAD', ''],
    ['DCO_HEAD', '-1'],
  ]) {
    const result = runScript('scripts/verify-dco.ts', [], process.cwd(), { env: { [name]: value } })
    assert.equal(result.status, 2, name + ': ' + result.output)
    assert.match(result.stderr, new RegExp(name + ' needs a value'))
  }
  for (const flag of ['--base=', '--head=', '--root=', '--root=-x', '--base=-x', '--head=-1']) {
    const result = runScript('scripts/verify-dco.ts', [flag])
    assert.equal(result.status, 2, flag + ': ' + result.output)
    assert.match(result.stderr, /needs a value/)
  }
})

test('notes --json prints a parseable summary', (t) => {
  const project = makeIsolatedFixture({}, { cleanup: t })
  const command = commandWithJson('notes.mjs')
  const result = runScript(command.script, ['init', '--json'], project.root, { env: project.env })
  assert.equal(result.status, 0, result.output)
  assert.equal(result.stderr, '')
  const summary = parsePrettyJson(result.stdout) as { command: string; ok: boolean }
  assert.equal(summary.command, 'init')
  assert.equal(summary.ok, true)
})

test('forge --json prints a parseable summary', (t) => {
  const workspace = makeWorkspace()
  t.after(() => workspace.dispose())
  const command = commandWithJson('forge.mjs')
  const result = runScript(command.script, ['draft', 'alpha', '--json'], workspace.root)
  assert.equal(result.status, 0, result.output)
  assert.equal(result.stderr, '')
  const summary = parsePrettyJson(result.stdout) as { command: string; results: { ok: boolean }[] }
  assert.equal(summary.command, 'draft')
  assert.equal(
    summary.results.every((item) => item.ok),
    true,
  )
})

test('verify-skill-spec --json prints a parseable summary', () => {
  const command = commandWithJson('verify-skill-spec.mjs')
  const result = runScript(command.script, ['skills/dsh-spec-skill-forge', '--json'])
  assert.equal(result.status, 0, result.output)
  assert.equal(result.stderr, '')
  const summary = parsePrettyJson(result.stdout) as { results: { ok: boolean }[] }
  assert.ok(Array.isArray(summary.results) && summary.results.length > 0)
  assert.ok(
    summary.results.every((item) => item.ok),
    result.stdout,
  )
})
