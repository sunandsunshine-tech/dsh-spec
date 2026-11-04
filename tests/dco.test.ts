/**
 * The DCO gate, and the two halves it now decides.
 *
 * The trailer half is read from `git log` alone, so it runs anywhere and the suite pins it without
 * reaching the network. The identity half covers a commit that claims a bot's address: because both
 * facts the trailer comparison uses are writable, such a commit is verified against GitHub — the
 * resolved account must be that bot and GitHub must have signed the commit — so those cases put a
 * `gh` stand-in first on `PATH` and control exactly the three facts GitHub would report.
 *
 * Dependabot authors as `<id>+dependabot[bot]@users.noreply.github.com` and signs
 * `dependabot[bot] <support@github.com>`: a fixed GitHub-side trailer address that deliberately
 * does not match the per-bot author address. Without the exemption the gate refuses every weekly
 * action bump; without the verification, the exemption would rest on strings a contributor writes.
 */

import assert from 'node:assert/strict'
import { chmodSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { makeFixture, REPO_ROOT } from './helpers/fixtures.ts'
import type { Fixture } from './helpers/fixtures.ts'
import { runScript } from './helpers/cli.ts'

/** The address GitHub stamps on Dependabot's commits, per bot installation id. */
const BOT_AUTHOR = '49699333+dependabot[bot]@users.noreply.github.com'
/** The trailer address GitHub fixes for Dependabot's commits, which never matches the author. */
const BOT_TRAILER_ADDRESS = 'support@github.com'
/** A Dependabot commit's author name, which a contributor can also set. */
const BOT_NAME = 'dependabot[bot]'
/** A person's address, which is what every other case signs with. */
const HUMAN = 'someone@example.invalid'

/** What GitHub reports about one commit, as the stand-in answers it. */
interface GhFacts {
  type?: string
  login?: string
  verified?: boolean
  /** When set, the stand-in exits with this status instead of answering — an unreachable GitHub. */
  fail?: boolean
}

/**
 * A `gh` stand-in first on `PATH`, answering `repos/{owner}/{repo}/commits/<sha>` with canned facts.
 * It honours the `--jq` the gate passes, because that filter decides which field the gate compares.
 * @param fixture - the fixture the stand-in is written into.
 * @param facts - the three facts GitHub would report about the commit being asked about.
 * @returns the environment that puts it before every other `gh` on the machine.
 */
function stubGh(fixture: Fixture, facts: GhFacts): Record<string, string | undefined> {
  const payload = Buffer.from(
    JSON.stringify({
      author: { type: facts.type, login: facts.login },
      commit: { verification: { verified: facts.verified } },
    }),
    'utf8',
  ).toString('base64')
  const script = [
    '#!/bin/sh',
    `payload=$(printf '%s' '${payload}' | base64 -d)`,
    "filter=$(printf '%s\\n' \"$*\" | sed -n 's/.*--jq //p')",
    'if [ -n "$filter" ]; then printf \'%s\' "$payload" | jq -r "$filter"; else printf \'%s\' "$payload"; fi',
    `exit ${facts.fail === true ? 1 : 0}`,
    '',
  ].join('\n')
  fixture.write('.stub/gh', script)
  chmodSync(join(fixture.root, '.stub', 'gh'), 0o755)
  return { PATH: `${join(fixture.root, '.stub')}:${process.env.PATH ?? ''}` }
}

/**
 * Run the gate over a range whose only commit is the fixture's last one.
 *
 * The gate reads a range with `git log`, so it runs with the fixture as its working directory:
 * that is the repository the revisions belong to.
 * @param fixture - the fixture whose last commit the range names.
 * @param env - extra environment, notably the `PATH` that carries a `gh` stand-in.
 */
function gate(fixture: Fixture, env: Record<string, string | undefined> = {}): { status: number; output: string } {
  return runScript(
    'scripts/verify-dco.ts',
    [
      `--root=${fixture.root}`,
      `--base=${fixture.git('rev-parse', 'HEAD~1').stdout.trim()}`,
      `--head=${fixture.git('rev-parse', 'HEAD').stdout.trim()}`,
    ],
    fixture.root,
    { env },
  )
}

/**
 * A fixture whose second commit carries the given author identity and trailer, on top of a base
 * commit the range excludes.
 * @param author - the `Name <address>` git records as the commit's author.
 * @param trailer - the complete `Signed-off-by:` line the commit message carries.
 */
function signed(author: string, trailer: string): Fixture {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  fixture.write('file.txt', 'change\n')
  fixture.git('add', '-A')
  const name = author.replace(/ <.*$/, '')
  const email = author.replace(/^.*</, '').replace(/>$/, '')
  fixture.git('-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', `change\n\n${trailer}`)
  return fixture
}

test('a human author who signs with their own address passes', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`)
  try {
    // No stand-in on `PATH`: a range of human commits is decided without asking GitHub anything.
    const result = gate(fixture)

    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /none claims a bot identity that had to be verified/)
  } finally {
    fixture.dispose()
  }
})

test('Dependabot’s fixed trailer address is accepted when GitHub signs the commit as that bot', () => {
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture, stubGh(fixture, { type: 'Bot', login: 'dependabot[bot]', verified: true }))

    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /dependabot\[bot\], GitHub-signed/)
  } finally {
    fixture.dispose()
  }
})

test('the bot name alone does not buy the exemption', () => {
  // A contributor can set any display name, so the exemption keys on the address GitHub stamps
  // rather than on the name: a human address under the bot's name still signs with its own.
  const fixture = signed(`${BOT_NAME} <${HUMAN}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture)

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /signs dependabot\[bot\] <support@github\.com>/)
  } finally {
    fixture.dispose()
  }
})

test('an unsigned commit under the bot’s address is refused', () => {
  // The forgery the verification exists for: both strings are writable locally, the signature is not.
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture, stubGh(fixture, { type: 'Bot', login: 'dependabot[bot]', verified: false }))

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /is not signed by GitHub/)
  } finally {
    fixture.dispose()
  }
})

test('an address GitHub resolves to a person is refused', () => {
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture, stubGh(fixture, { type: 'User', login: 'someone', verified: true }))

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /resolves that address to a User account, not a bot/)
  } finally {
    fixture.dispose()
  }
})

test('a lookup that cannot be made is refused rather than waved through', () => {
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture, stubGh(fixture, { fail: true }))

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /GitHub could not be asked about it/)
  } finally {
    fixture.dispose()
  }
})

test('a Dependabot commit without the fixed trailer fails', () => {
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${HUMAN}>`)
  try {
    const result = gate(fixture)

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /signs dependabot\[bot\] <someone@example\.invalid>/)
  } finally {
    fixture.dispose()
  }
})

test('an unrelated bot’s fixed trailer address is not accepted', () => {
  const fixture = signed(
    'other-app[bot] <12345+other-app[bot]@users.noreply.github.com>',
    `Signed-off-by: other-app[bot] <${BOT_TRAILER_ADDRESS}>`,
  )
  try {
    // No allowlisted bot matches that address, so the exact comparison decides it — and the trailer
    // names no author, so it fails without GitHub being asked.
    const result = gate(fixture)

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /signs other-app\[bot\]/)
  } finally {
    fixture.dispose()
  }
})

test('a commit with no trailer at all fails', () => {
  const fixture = makeFixture()
  try {
    fixture.write('file.txt', 'base\n')
    fixture.commit('base')
    fixture.write('file.txt', 'change\n')
    fixture.commit('a change with no trailer')
    const result = gate(fixture)

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /no Signed-off-by trailer/)
  } finally {
    fixture.dispose()
  }
})

test('an empty range fails rather than passing vacuously', () => {
  const fixture = makeFixture()
  try {
    fixture.write('file.txt', 'base\n')
    fixture.commit('base')
    const head = fixture.git('rev-parse', 'HEAD').stdout.trim()
    const result = runScript(
      'scripts/verify-dco.ts',
      [`--root=${fixture.root}`, `--base=${head}`, `--head=${head}`],
      fixture.root,
    )

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /holds no commit/)
  } finally {
    fixture.dispose()
  }
})

test('the CI step that runs this gate offers gh a token', () => {
  // The gate asks GitHub about a commit claiming a bot identity, so the step that runs it in CI
  // needs a token in its environment: `gh` reads `GITHUB_TOKEN` as well as `GH_TOKEN` and refuses
  // without either, which would redden the check for a commit the gate would otherwise accept.
  const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/checks.yml'), 'utf8')
  const steps = workflow.split(/\n(?= {6}- )/).filter((block) => block.includes('verify-dco.ts'))

  assert.equal(steps.length, 1, 'exactly one step runs the DCO gate')
  assert.match(steps[0]!, /(GH_TOKEN|GITHUB_TOKEN):/)
})
