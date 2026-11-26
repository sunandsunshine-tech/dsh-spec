/**
 * The DCO gate, and the commit metadata it decides.
 *
 * The trailer half is read from `git log` alone, so it runs anywhere and the suite pins it without
 * reaching the network. The identity half covers a commit that claims a bot identity through its
 * author address or a final-block sign-off: because the trailer comparison uses writable facts,
 * such a commit is verified against GitHub — the resolved account must be that bot and GitHub must
 * have signed the commit — so those cases put a `gh` stand-in first on `PATH` and control exactly
 * the three facts GitHub would report.
 *
 * Dependabot authors as `<id>+dependabot[bot]@users.noreply.github.com` and signs
 * `dependabot[bot] <support@github.com>`: a fixed GitHub-side trailer address that deliberately
 * does not match the per-bot author address. Without the exemption the gate refuses every weekly
 * action bump; without the verification, the exemption would rest on strings a contributor writes.
 *
 * The gate also owns the narrow tracker-suffix boundary: neither the input pull-request title nor a
 * branch commit subject carries a suffix because GitHub adds one while squashing. A PR with one
 * non-merge commit takes its prospective subject from that commit; any other count takes it from the
 * title. Only explicit `squash-commit` mode accepts a landed suffix. It does not judge narrative
 * prose.
 */

import assert from 'node:assert/strict'
import { chmodSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { makeFixture, REPO_ROOT } from './helpers/fixtures.ts'
import type { Fixture } from './helpers/fixtures.ts'
import { runScript } from './helpers/cli.ts'
import type { CliResult } from './helpers/cli.ts'

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
  authorType?: string
  authorLogin?: string
  committerType?: string
  committerLogin?: string
  verified?: boolean
  /** When set, the stand-in exits with this status instead of answering — an unreachable GitHub. */
  fail?: boolean
}

const DEPENDABOT_SIGNED: GhFacts = {
  authorType: 'Bot',
  authorLogin: 'dependabot[bot]',
  committerType: 'Bot',
  committerLogin: 'dependabot[bot]',
  verified: true,
}

const HUMAN_ACCOUNT: GhFacts = {
  authorType: 'User',
  authorLogin: 'someone',
  committerType: 'User',
  committerLogin: 'someone',
  verified: true,
}

/**
 * A `gh` stand-in first on `PATH`, answering `repos/{owner}/{repo}/commits/<sha>` with canned facts.
 * Each SHA has its own author, committer and verification facts; it honours the `--jq` filter.
 * @param fixture - the fixture the stand-in is written into.
 * @param factsBySha - one fact set per commit SHA.
 * @returns the environment that puts it before every other `gh` on the machine.
 */
function stubGhFor(fixture: Fixture, factsBySha: Record<string, GhFacts>): Record<string, string | undefined> {
  const responses = Object.fromEntries(
    Object.entries(factsBySha).map(([sha, facts]) => [
      sha,
      {
        author: { type: facts.authorType, login: facts.authorLogin },
        committer: { type: facts.committerType, login: facts.committerLogin },
        commit: { verification: { verified: facts.verified } },
        fail: facts.fail === true,
      },
    ]),
  )
  const payload = Buffer.from(JSON.stringify(responses), 'utf8').toString('base64')
  const script = [
    '#!/bin/sh',
    `payload=$(printf '%s' '${payload}' | base64 -d)`,
    "sha=$(printf '%s\\n' \"$*\" | sed -n 's#.*commits/\\([0-9a-f]\\{40\\}\\).*#\\1#p')",
    'facts=$(printf \'%s\' "$payload" | jq -c --arg sha "$sha" \'.[$sha] // empty\')',
    'if [ -z "$facts" ]; then exit 1; fi',
    "filter=$(printf '%s\\n' \"$*\" | sed -n 's/.*--jq //p')",
    'if [ -n "$filter" ]; then printf \'%s\' "$facts" | jq -r "$filter"; else printf \'%s\' "$facts"; fi',
    'if [ "$(printf \'%s\' "$facts" | jq -r \'.fail // false\')" = true ]; then exit 1; fi',
    'exit 0',
    '',
  ].join('\n')
  fixture.write('.stub/gh', script)
  chmodSync(join(fixture.root, '.stub', 'gh'), 0o755)
  return { PATH: `${join(fixture.root, '.stub')}:${process.env.PATH ?? ''}` }
}

/** Answer one fixture commit with the supplied facts. */
function stubGh(fixture: Fixture, facts: GhFacts): Record<string, string | undefined> {
  const sha = fixture.git('rev-parse', 'HEAD').stdout.trim()
  return stubGhFor(fixture, { [sha]: facts })
}

/**
 * Run the gate over a range ending at the fixture's last commit.
 *
 * The gate reads a range with `git log`, so it runs with the fixture as its working directory:
 * that is the repository the revisions belong to.
 * @param fixture - the fixture whose last commit the range names.
 * @param env - extra environment, notably the `PATH` that carries a `gh` stand-in.
 * @param extraArgs - extra options, such as a pull-request title.
 * @param rangeLength - the number of commits in the range.
 */
function gate(
  fixture: Fixture,
  env: Record<string, string | undefined> = {},
  extraArgs: string[] = [],
  rangeLength = 1,
): CliResult {
  return gateFrom(fixture, `HEAD~${rangeLength}`, env, extraArgs)
}

/** Run the gate from an explicit base ref to HEAD. */
function gateFrom(
  fixture: Fixture,
  baseRef: string,
  env: Record<string, string | undefined> = {},
  extraArgs: string[] = [],
): CliResult {
  return runScript(
    'scripts/verify-dco.ts',
    [
      `--root=${fixture.root}`,
      `--base=${fixture.git('rev-parse', baseRef).stdout.trim()}`,
      `--head=${fixture.git('rev-parse', 'HEAD').stdout.trim()}`,
      ...extraArgs,
    ],
    fixture.root,
    { env: { GITHUB_EVENT_NAME: undefined, DCO_MODE: undefined, DCO_PR_TITLE: undefined, ...env } },
  )
}

/**
 * A fixture whose second commit carries the given author identity and trailer, on top of a base
 * commit the range excludes.
 * @param author - the `Name <address>` git records as the commit's author.
 * @param trailer - the complete `Signed-off-by:` line the commit message carries.
 * @param subject - the subject Git records for the commit.
 */
function signed(author: string, trailer: string, subject = 'change'): Fixture {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  commitSigned(fixture, author, trailer, subject, 'change\n')
  return fixture
}

/** Add one commit carrying the given author, subject and complete trailer block. */
function commitSigned(
  fixture: Fixture,
  author: string,
  trailers: string,
  subject: string,
  contents: string,
  file = 'file.txt',
): void {
  fixture.write(file, contents)
  fixture.git('add', '-A')
  const name = author.replace(/ <.*$/, '')
  const email = author.replace(/^.*</, '').replace(/>$/, '')
  fixture.git('-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', `${subject}\n\n${trailers}`)
}

/** Add one commit from a verbatim message file, preserving leading blank lines and CRLF. */
function commitWithMessage(
  fixture: Fixture,
  author: string,
  message: string,
  contents = 'change\n',
  file = 'file.txt',
): void {
  fixture.write(file, contents)
  fixture.git('add', '-A')
  fixture.write('.commit-message', message)
  const name = author.replace(/ <.*$/, '')
  const email = author.replace(/^.*</, '').replace(/>$/, '')
  try {
    fixture.git(
      '-c',
      `user.name=${name}`,
      '-c',
      `user.email=${email}`,
      'commit',
      '-q',
      '--cleanup=verbatim',
      '-F',
      '.commit-message',
    )
  } finally {
    fixture.remove('.commit-message')
  }
}

/** Create a commit with the current tree and declared parents, then move HEAD to it. */
function commitTree(fixture: Fixture, author: string, message: string, parents: string[]): string {
  fixture.write('.commit-message', message)
  const tree = fixture.git('rev-parse', 'HEAD^{tree}').stdout.trim()
  const name = author.replace(/ <.*$/, '')
  const email = author.replace(/^.*</, '').replace(/>$/, '')
  try {
    const args = ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit-tree', tree]
    for (const parent of parents) args.push('-p', parent)
    args.push('-F', '.commit-message')
    const sha = fixture.git(...args).stdout.trim()
    fixture.git('update-ref', 'HEAD', sha)
    return sha
  } finally {
    fixture.remove('.commit-message')
  }
}

/** A fixture whose final commit has different author and committer identities. */
function differentIdentities(signoff: string): Fixture {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  fixture.write('file.txt', 'change\n')
  fixture.git('add', '-A')
  fixture.git(
    '-c',
    'user.name=Committer',
    '-c',
    'user.email=committer@example.invalid',
    'commit',
    '-q',
    '--author=Author <author@example.invalid>',
    '-m',
    `change\n\n${signoff}`,
  )
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

test('control characters in an author identity cannot shift metadata fields', () => {
  const hostile = `Evil\u001fName\u001eField <${HUMAN}>`
  const fixture = signed(hostile, `Signed-off-by: ${hostile}`)
  try {
    const result = gate(fixture)

    assert.equal(result.status, 0, result.output)
  } finally {
    fixture.dispose()
  }
})

test('a sign-off may name the author when author and committer differ', () => {
  const fixture = differentIdentities('Signed-off-by: Author <author@example.invalid>')
  try {
    const result = gate(fixture)

    assert.equal(result.status, 0, result.output)
  } finally {
    fixture.dispose()
  }
})

test('a sign-off may name the committer when author and committer differ', () => {
  const fixture = differentIdentities('Signed-off-by: Committer <committer@example.invalid>')
  try {
    const result = gate(fixture)

    assert.equal(result.status, 0, result.output)
  } finally {
    fixture.dispose()
  }
})

test('a one-commit PR rejects a manual suffix in its prospective commit subject', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, `change (#167)`)
  try {
    const result = gate(fixture, {
      GITHUB_EVENT_NAME: 'pull_request',
      DCO_PR_TITLE: 'fix(process): enforce conventions',
    })

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /single non-merge commit supplies the prospective squash subject/)
  } finally {
    fixture.dispose()
  }
})

test('a leading blank line does not hide the suffix in Git’s subject', () => {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  commitWithMessage(fixture, `Someone <${HUMAN}>`, `\n\nchange (#167)\n\nSigned-off-by: Someone <${HUMAN}>\n`)
  try {
    assert.equal(fixture.git('log', '-1', '--format=%s').stdout.trim(), 'change (#167)')
    assert.match(fixture.git('log', '-1', '--format=%B').stdout, /^\n\nchange \(#167\)/)
    const result = gate(fixture, {
      GITHUB_EVENT_NAME: 'pull_request',
      DCO_PR_TITLE: 'fix(process): enforce conventions',
    })

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /single non-merge commit supplies the prospective squash subject/)
  } finally {
    fixture.dispose()
  }
})

test('control characters in a suffixed subject cannot shift metadata fields', () => {
  const fixture = signed(
    `Someone <${HUMAN}>`,
    `Signed-off-by: Someone <${HUMAN}>`,
    `change\u001fspoofed-field\u001e (#167)`,
  )
  try {
    const result = gate(fixture, {
      GITHUB_EVENT_NAME: 'pull_request',
      DCO_PR_TITLE: 'fix(process): enforce conventions',
    })

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /manual tracker suffix \(\(#167\)\)/)
  } finally {
    fixture.dispose()
  }
})

test('a tracker suffix without preceding whitespace is refused', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, `change(#136)`)
  try {
    const result = gate(fixture, { DCO_PR_TITLE: 'fix(process): enforce conventions' })

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /commit subject carries a manual tracker suffix \(\(#136\)\)/)
  } finally {
    fixture.dispose()
  }
})

for (const [form, subject] of [
  ['adjacent', 'change (#136)(#152)'],
  ['spaced', 'change (#136) (#152)'],
  ['mixed', 'change(#136) (#152)'],
]) {
  test(`${form} duplicate tracker suffixes on a branch commit subject are refused`, () => {
    const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, subject)
    try {
      const result = gate(fixture, { DCO_PR_TITLE: 'fix(process): enforce conventions' })

      assert.equal(result.status, 1, result.output)
      assert.match(result.stderr, /manual tracker suffix \(\(#136\) \(#152\)\)/)
    } finally {
      fixture.dispose()
    }
  })
}

for (const suffix of ['#0', '#000168']) {
  test(`a branch suffix with invalid number ${suffix} is refused`, () => {
    const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, `change (${suffix})`)
    try {
      const result = gate(fixture, { DCO_PR_TITLE: 'fix(process): enforce conventions' })

      assert.equal(result.status, 1, result.output)
      assert.match(result.stderr, new RegExp(`manual tracker suffix \\(\\(${suffix}\\)\\)`))
    } finally {
      fixture.dispose()
    }
  })
}

test('a branch suffix followed by a nonbreaking space is refused', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, `change (#136)\u00a0`)
  try {
    const result = gate(fixture, { DCO_PR_TITLE: 'fix(process): enforce conventions' })

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /manual tracker suffix \(\(#136\)\)/)
  } finally {
    fixture.dispose()
  }
})

test('a manual tracker suffix on the pull-request title is refused', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`)
  try {
    const result = gate(fixture, { DCO_PR_TITLE: 'fix(process): enforce conventions (#167)' })

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /pull-request title carries a manual tracker suffix \(\(#167\)\)/)
  } finally {
    fixture.dispose()
  }
})

test('a one-commit PR with clean title and commit reports the commit as prospective subject', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`)
  try {
    const result = gate(fixture, {
      GITHUB_EVENT_NAME: 'pull_request',
      DCO_PR_TITLE: 'fix(process): enforce conventions',
    })

    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /prospective squash subject comes from the sole non-merge commit subject/)
  } finally {
    fixture.dispose()
  }
})

test('a nonempty --pr-title argument is accepted', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`)
  try {
    const result = gate(fixture, {}, ['--pr-title=fix(process): enforce conventions'])

    assert.equal(result.status, 0, result.output)
  } finally {
    fixture.dispose()
  }
})

test('a whitespace-only --pr-title argument is refused', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`)
  try {
    const result = gate(fixture, {}, ['--pr-title=   '])

    assert.equal(result.status, 2, result.output)
    assert.match(result.stderr, /--pr-title= needs a value/)
  } finally {
    fixture.dispose()
  }
})

test('PR-mode fixtures isolate an inherited DCO_MODE', () => {
  const previous = process.env.DCO_MODE
  process.env.DCO_MODE = 'squash-commit'
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, 'change (#167)')
  try {
    const result = gate(fixture, {
      GITHUB_EVENT_NAME: 'pull_request',
      DCO_PR_TITLE: 'fix(process): enforce conventions',
    })

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /single non-merge commit supplies the prospective squash subject/)
  } finally {
    if (previous === undefined) delete process.env.DCO_MODE
    else process.env.DCO_MODE = previous
    fixture.dispose()
  }
})

test('a multi-commit PR reports the pull-request title as prospective subject', () => {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  commitSigned(fixture, `Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, 'change one', 'one\n')
  commitSigned(fixture, `Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, 'change two', 'two\n')
  try {
    const result = gate(
      fixture,
      { GITHUB_EVENT_NAME: 'pull_request', DCO_PR_TITLE: 'fix(process): enforce conventions' },
      [],
      2,
    )

    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /prospective squash subject comes from the pull-request title/)
  } finally {
    fixture.dispose()
  }
})

test('a suffix on a non-first commit in a multi-commit PR is refused', () => {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  commitSigned(fixture, `Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, 'change one', 'one\n')
  commitSigned(fixture, `Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, 'change two (#167)', 'two\n')
  try {
    const result = gate(
      fixture,
      { GITHUB_EVENT_NAME: 'pull_request', DCO_PR_TITLE: 'fix(process): enforce conventions' },
      [],
      2,
    )

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /every branch commit subject must be suffix-free/)
  } finally {
    fixture.dispose()
  }
})

test('a feature commit plus base-sync merge uses the sole non-merge commit subject', () => {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  const mainBranch = fixture.git('branch', '--show-current').stdout.trim()
  fixture.git('checkout', '-q', '-b', 'feature')
  commitSigned(
    fixture,
    `Someone <${HUMAN}>`,
    `Signed-off-by: Someone <${HUMAN}>`,
    'feature change',
    'feature\n',
    'feature.txt',
  )
  fixture.git('checkout', '-q', mainBranch)
  commitSigned(
    fixture,
    `Someone <${HUMAN}>`,
    `Signed-off-by: Someone <${HUMAN}>`,
    'sync base',
    'base sync\n',
    'base-sync.txt',
  )
  const baseRef = fixture.git('rev-parse', 'HEAD').stdout.trim()
  fixture.git(
    '-c',
    'user.name=Someone',
    '-c',
    `user.email=${HUMAN}`,
    'merge',
    '--no-ff',
    'feature',
    '-m',
    `Merge feature branch\n\nSigned-off-by: Someone <${HUMAN}>`,
  )
  try {
    const result = gateFrom(fixture, baseRef, {
      GITHUB_EVENT_NAME: 'pull_request',
      DCO_PR_TITLE: 'fix(process): enforce conventions',
    })

    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /prospective squash subject comes from the sole non-merge commit subject/)
  } finally {
    fixture.dispose()
  }
})

test('an explicit post-squash mode accepts exactly one landed suffix', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, `change (#168)`)
  try {
    const result = gate(fixture, {}, ['--mode=squash-commit'])

    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /landed squash commit has one parent and one canonical positive unpadded GitHub suffix/)
  } finally {
    fixture.dispose()
  }
})

test('post-squash mode rejects a subject without the landed suffix', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`)
  try {
    const result = gate(fixture, {}, ['--mode=squash-commit'])

    assert.equal(result.status, 1, result.output)
    assert.match(
      result.stderr,
      /post-squash subject must carry exactly one canonical space-prefixed tracker suffix; found none/,
    )
  } finally {
    fixture.dispose()
  }
})

test('post-squash mode rejects a suffix without canonical preceding whitespace', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, `change(#168)`)
  try {
    const result = gate(fixture, {}, ['--mode=squash-commit'])

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /found one suffix without the required preceding space \(\(#168\)\)/)
  } finally {
    fixture.dispose()
  }
})

for (const [form, subject] of [
  ['adjacent', 'change (#168)(#169)'],
  ['spaced', 'change (#168) (#169)'],
  ['mixed', 'change(#168) (#169)'],
]) {
  test(`post-squash mode rejects ${form} duplicate tracker suffixes`, () => {
    const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, subject)
    try {
      const result = gate(fixture, {}, ['--mode=squash-commit'])

      assert.equal(result.status, 1, result.output)
      assert.match(result.stderr, /found 2 suffixes in one noncanonical trailing group \(\(#168\) \(#169\)\)/)
    } finally {
      fixture.dispose()
    }
  })
}

for (const suffix of ['#0', '#000168']) {
  test(`post-squash mode rejects invalid suffix number ${suffix}`, () => {
    const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, `change (${suffix})`)
    try {
      const result = gate(fixture, {}, ['--mode=squash-commit'])

      assert.equal(result.status, 1, result.output)
      assert.match(result.stderr, /invalid issue number/)
      assert.match(result.stderr, /positive unpadded decimal/)
    } finally {
      fixture.dispose()
    }
  })
}

test('post-squash mode rejects a suffix followed by a nonbreaking space', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, `change (#168)\u00a0`)
  try {
    const result = gate(fixture, {}, ['--mode=squash-commit'])

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /one suffix not at the true end of the subject \(\(#168\)\)/)
  } finally {
    fixture.dispose()
  }
})

test('post-squash mode rejects a range with multiple commits', () => {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  commitSigned(fixture, `Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, 'change one', 'one\n')
  commitSigned(fixture, `Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, 'change two', 'two\n')
  try {
    const result = gate(fixture, {}, ['--mode=squash-commit'], 2)

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /squash-commit mode needs exactly one commit in the range; found 2/)
  } finally {
    fixture.dispose()
  }
})

test('post-squash mode rejects a root commit with no parent', () => {
  const fixture = makeFixture()
  try {
    fixture.write('file.txt', 'base\n')
    fixture.commit('base')
    const baseRef = fixture.git('rev-parse', 'HEAD').stdout.trim()
    commitTree(fixture, `Someone <${HUMAN}>`, `landed (#168)\n\nSigned-off-by: Someone <${HUMAN}>\n`, [])
    const result = gateFrom(fixture, baseRef, {}, ['--mode=squash-commit'])

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /post-squash commit must have exactly one parent; found 0/)
    assert.match(result.stderr, /in squash-commit mode, use exactly one commit with one parent/)
  } finally {
    fixture.dispose()
  }
})

test('post-squash mode rejects a merge commit with two parents', () => {
  const fixture = makeFixture()
  try {
    fixture.write('file.txt', 'base\n')
    fixture.commit('base')
    const base = fixture.git('rev-parse', 'HEAD').stdout.trim()
    commitSigned(fixture, `Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>`, 'change one', 'one\n')
    const head = fixture.git('rev-parse', 'HEAD').stdout.trim()
    commitTree(fixture, `Someone <${HUMAN}>`, `landed (#168)\n\nSigned-off-by: Someone <${HUMAN}>\n`, [head, base])
    const result = gateFrom(fixture, head, {}, ['--mode=squash-commit'])

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /post-squash commit must have exactly one parent; found 2/)
    assert.match(result.stderr, /in squash-commit mode, use exactly one commit with one parent/)
  } finally {
    fixture.dispose()
  }
})

test('a pull-request CI run without a title fails closed', () => {
  const result = runScript('scripts/verify-dco.ts', [], REPO_ROOT, {
    env: { GITHUB_EVENT_NAME: 'pull_request', DCO_PR_TITLE: undefined },
  })

  assert.equal(result.status, 2, result.output)
  assert.match(result.stderr, /DCO_PR_TITLE needs a value/)
})

test('Dependabot’s fixed trailer address is accepted when GitHub signs the commit as that bot', () => {
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture, stubGh(fixture, DEPENDABOT_SIGNED))

    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /dependabot\[bot\], GitHub-signed/)
  } finally {
    fixture.dispose()
  }
})

test('Dependabot author attribution cannot substitute for a human committer signer', () => {
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(
      fixture,
      stubGh(fixture, {
        ...DEPENDABOT_SIGNED,
        committerType: 'User',
        committerLogin: 'someone',
        verified: true,
      }),
    )

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /resolves the commit's committer to a User account, not an allowlisted bot signer/)
  } finally {
    fixture.dispose()
  }
})

test('Dependabot verification uses per-SHA facts across a multi-commit range', () => {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  commitSigned(
    fixture,
    `${BOT_NAME} <${BOT_AUTHOR}>`,
    `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`,
    'older bot change',
    'older\n',
    'older.txt',
  )
  const older = fixture.git('rev-parse', 'HEAD').stdout.trim()
  commitSigned(
    fixture,
    `${BOT_NAME} <${BOT_AUTHOR}>`,
    `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`,
    'newer bot change',
    'newer\n',
    'newer.txt',
  )
  const newer = fixture.git('rev-parse', 'HEAD').stdout.trim()
  try {
    const result = gate(
      fixture,
      {
        DCO_PR_TITLE: 'fix(process): enforce conventions',
        ...stubGhFor(fixture, {
          [older]: DEPENDABOT_SIGNED,
          [newer]: {
            ...DEPENDABOT_SIGNED,
            committerType: 'User',
            committerLogin: 'someone',
            verified: true,
          },
        }),
      },
      [],
      2,
    )

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, new RegExp(`${newer.slice(0, 12)}[\\s\\S]*committer to a User account`))
    assert.match(result.stdout, new RegExp(`verified  ${older.slice(0, 12)}`))
    assert.match(result.stdout, /committer dependabot\[bot\], GitHub-signed/)
  } finally {
    fixture.dispose()
  }
})

test('hostile Dependabot metadata and a suffixed subject stay in separate fields', () => {
  const hostileName = `${BOT_NAME}\u001fspoofed-name\u001efield`
  const fixture = signed(
    `${hostileName} <${BOT_AUTHOR}>`,
    `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`,
    `change\u001fspoofed-subject\u001e (#167)`,
  )
  try {
    const result = gate(fixture, {
      GITHUB_EVENT_NAME: 'pull_request',
      DCO_PR_TITLE: 'fix(process): enforce conventions',
      ...stubGh(fixture, DEPENDABOT_SIGNED),
    })

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /manual tracker suffix \(\(#167\)\)/)
    assert.match(result.stdout, /dependabot\[bot\], GitHub-signed/)
  } finally {
    fixture.dispose()
  }
})

test('a bot self-signoff still requires GitHub verification', () => {
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_AUTHOR}>`)
  try {
    const result = gate(fixture, stubGh(fixture, { fail: true }))

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /GitHub could not be asked about it/)
    assert.match(result.stderr, /use a GitHub-signed commit from the named allowlisted bot/)
  } finally {
    fixture.dispose()
  }
})

test('the bot name alone does not buy the exemption', () => {
  // A contributor can set any display name, so the exemption keys on the address GitHub stamps
  // rather than on the name: a human address under the bot's name still signs with its own.
  const fixture = signed(`${BOT_NAME} <${HUMAN}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture, stubGh(fixture, HUMAN_ACCOUNT))

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /resolves the commit's committer to a User account, not an allowlisted bot signer/)
  } finally {
    fixture.dispose()
  }
})

test('bot display names are matched case-insensitively as complete identities', () => {
  const fixture = signed(
    'Dependabot[bot] <someone@example.invalid>',
    'Signed-off-by: Dependabot[bot] <someone@example.invalid>',
  )
  try {
    const result = gate(fixture, stubGh(fixture, HUMAN_ACCOUNT))

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /resolves the commit's committer to a User account, not an allowlisted bot signer/)
  } finally {
    fixture.dispose()
  }
})

test('a human display name that merely mentions a bot login is not bot evidence', () => {
  const identity = 'Someone who follows dependabot[bot] <someone@example.invalid>'
  const fixture = signed(identity, `Signed-off-by: ${identity}`)
  try {
    const result = gate(fixture)

    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /none claims a bot identity that had to be verified/)
  } finally {
    fixture.dispose()
  }
})

test('an unsigned commit under the bot’s address is refused', () => {
  // The forgery the verification exists for: both strings are writable locally, the signature is not.
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture, stubGh(fixture, { ...DEPENDABOT_SIGNED, verified: false }))

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /is not signed by GitHub/)
  } finally {
    fixture.dispose()
  }
})

test('an address GitHub resolves to a person is refused', () => {
  const fixture = signed(`${BOT_NAME} <${BOT_AUTHOR}>`, `Signed-off-by: ${BOT_NAME} <${BOT_TRAILER_ADDRESS}>`)
  try {
    const result = gate(fixture, stubGh(fixture, HUMAN_ACCOUNT))

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /resolves the commit's committer to a User account, not an allowlisted bot signer/)
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
    const result = gate(fixture, stubGh(fixture, DEPENDABOT_SIGNED))

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

test('every Signed-off-by in the final trailer block must match the commit identity', () => {
  const valid = `Signed-off-by: Someone <${HUMAN}>`
  const invalid = 'Signed-off-by: Other <other@example.invalid>'
  const fixture = signed(`Someone <${HUMAN}>`, `${valid}\n${invalid}`)
  try {
    const result = gate(fixture)

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /signs Other <other@example\.invalid>/)
  } finally {
    fixture.dispose()
  }
})

test('a legitimately folded Signed-off-by unfolds to one matching identity', () => {
  const fixture = signed(`Someone Example <${HUMAN}>`, `Signed-off-by: Someone Example\n <${HUMAN}>`)
  try {
    const result = gate(fixture)

    assert.equal(result.status, 0, result.output)
  } finally {
    fixture.dispose()
  }
})

test('a Windows folded Signed-off-by unfolds after CRLF normalization', () => {
  const fixture = makeFixture()
  fixture.write('file.txt', 'base\n')
  fixture.commit('base')
  commitWithMessage(
    fixture,
    `Someone Example <${HUMAN}>`,
    `change\r\n\r\nSigned-off-by: Someone Example\r\n <${HUMAN}>\r\n`,
  )
  try {
    assert.ok(
      fixture.git('cat-file', 'commit', 'HEAD').stdout.includes(`Signed-off-by: Someone Example\r\n <${HUMAN}>`),
      'the commit object retains the CRLF folded sign-off',
    )
    const result = gate(fixture)

    assert.equal(result.status, 0, result.output)
  } finally {
    fixture.dispose()
  }
})

test('a folded Signed-off-by containing multiple identities is rejected', () => {
  const fixture = signed(`Someone <${HUMAN}>`, `Signed-off-by: Someone <${HUMAN}>\n Other <other@example.invalid>`)
  try {
    const result = gate(fixture)

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /one Signed-off-by unfolds to multiple identities/)
  } finally {
    fixture.dispose()
  }
})

test('a Signed-off-by outside the final trailer block does not satisfy the DCO', () => {
  const fixture = makeFixture()
  try {
    fixture.write('file.txt', 'base\n')
    fixture.commit('base')
    fixture.write('file.txt', 'change\n')
    fixture.git('add', '-A')
    fixture.git(
      '-c',
      'user.name=Someone',
      '-c',
      `user.email=${HUMAN}`,
      'commit',
      '-q',
      '-m',
      `change\n\nSigned-off-by: Someone <${HUMAN}>\n\nnot a final trailer`,
    )
    const result = gate(fixture)

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /no Signed-off-by trailer in the final trailer block/)
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
      { env: { GITHUB_EVENT_NAME: undefined, DCO_MODE: undefined, DCO_PR_TITLE: undefined } },
    )

    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /holds no commit/)
  } finally {
    fixture.dispose()
  }
})

test('the CI step that runs this gate supplies the PR title and offers gh a token', () => {
  // The gate asks GitHub about a commit claiming a bot identity, so the step that runs it in CI
  // needs a token in its environment: `gh` reads `GITHUB_TOKEN` as well as `GH_TOKEN` and refuses
  // without either, which would redden the check for a commit the gate would otherwise accept.
  const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/checks.yml'), 'utf8')
  assert.match(
    workflow,
    /pull_request:\s*\n\s*types: \[opened, synchronize, reopened, edited\]/,
    'title edits retrigger the pull-request workflow',
  )
  const steps = workflow.split(/\n(?= {6}- )/).filter((block) => block.includes('verify-dco.ts'))

  assert.equal(steps.length, 1, 'exactly one step runs the DCO gate')
  assert.match(steps[0]!, /(GH_TOKEN|GITHUB_TOKEN):/)
  assert.match(
    steps[0]!,
    /DCO_PR_TITLE:\s*\$\{\{\s*github\.event\.pull_request\.title\s*\}\}/,
    'the DCO step supplies the pull-request title',
  )
  assert.match(
    steps[0]!,
    /run: node scripts\/verify-dco\.ts --base="origin\/\$\{\{ github\.base_ref \}\}" --head="\$\{\{ github\.event\.pull_request\.head\.sha \}\}"/,
    'the DCO step uses the verified base and pull-request head',
  )
})
