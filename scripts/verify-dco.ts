/**
 * SPDX-License-Identifier: MIT
 *
 * A repository's own gate: every commit a change offers carries the
 * Developer Certificate of Origin's `Signed-off-by:` trailer, and the line
 * names the commit's author, or its committer where the two differ. A machine does not sign for a
 * person, and a person does not sign for a machine, so the trailer is compared against the commit's
 * own author or committer identity rather than trusted.
 *
 * The same commit-admission step enforces the mechanical tracker-suffix boundary. Before a squash,
 * neither the pull-request title nor a branch commit subject may carry the suffix GitHub supplies.
 * The prospective subject comes from the commit subject for a pull request with one non-merge
 * commit and from the pull-request title otherwise. An already-landed squash commit is checked only
 * in the explicit `squash-commit` mode, which requires one commit with one parent. Subject checks
 * read Git's `%s` rendering rather than the first physical message line. The gate does not try to
 * judge whether a subject describes a review, rebase or session; that remains a review decision.
 *
 * One identity is accepted on more than that comparison. Dependabot authors as a per-installation
 * noreply address and signs with GitHub's fixed `support@github.com` trailer, so the exact
 * comparison refuses every weekly action bump; the exemption below accepts that one trailer for
 * that one author address. Both facts come from the commit, so a contributor can write them — and
 * a commit that claims a bot identity is therefore *verified* against GitHub as well: its resolved
 * account must be that bot, and GitHub must have signed it. That lookup happens only for the
 * commits that claim one, so a range of human commits is decided without asking GitHub anything.
 *
 * Reads a range: `--base=<ref>` (or `DCO_BASE`) to `--head=<ref>` (or `DCO_HEAD`, default `HEAD`).
 * Pull-request mode is the default. Outside pull-request CI, an optional `--pr-title=<text>` (or
 * `DCO_PR_TITLE`) reports the prospective subject; when `GITHUB_EVENT_NAME` is `pull_request`, the
 * title is required. `--mode=squash-commit` checks exactly one already-squashed commit instead. An
 * empty range fails: a gate that passes on an empty corpus is worse than no gate.
 *
 *   node scripts/verify-dco.ts --base=origin/main
 */

import { execFileSync } from 'node:child_process'

const USAGE = `usage: verify-dco.ts [--root=<dir>] [--base=<ref>] [--head=<ref>] [--pr-title=<text>] [--mode=<mode>]

Check final-block sign-offs and the mechanical prospective or landed squash-subject boundary.
Environment: DCO_ROOT, DCO_BASE, DCO_HEAD, DCO_PR_TITLE and DCO_MODE are fallbacks for the options.
DCO_PR_TITLE is required in PR mode when GITHUB_EVENT_NAME is pull_request.

options:
  --root=<dir>       the checkout to read (default: .)
  --base=<ref>       the range start (default: origin/main)
  --head=<ref>       the range end (default: HEAD)
  --pr-title=<text>  the pull-request title used when a multi-commit PR is squashed
  --mode=<mode>      pr (default) or squash-commit for one landed commit with one parent
  --help, -h         print this and exit 0`

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE)
  process.exit(0)
}
const unknown = args.filter((arg) => !/^--(base|head|mode|pr-title|root)=/.test(arg))
if (unknown.length > 0) {
  console.error('verify-dco.ts: unknown option: ' + unknown.join(' '))
  console.error('run "verify-dco.ts --help" for usage')
  process.exit(2)
}
for (const name of ['root', 'base', 'head']) {
  const flag = '--' + name + '='
  const hit = args.find((argument) => argument.startsWith(flag))
  const value = hit === undefined ? undefined : hit.slice(flag.length)
  if (value !== undefined && (value === '' || value.startsWith('-'))) {
    console.error('verify-dco.ts: ' + flag + ' needs a value')
    console.error('run "verify-dco.ts --help" for usage')
    process.exit(2)
  }
}
const COMMIT_FIELD_COUNT = 8

function arg(name: string, fallback: string): string {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  const environmentName = `DCO_${name.replaceAll('-', '_').toUpperCase()}`
  return hit ? hit.slice(name.length + 3) : (process.env[environmentName] ?? fallback)
}

const root = arg('root', '.')
const base = arg('base', 'origin/main')
const head = arg('head', 'HEAD')
const mode = arg('mode', 'pr')
const prTitle = arg('pr-title', '')
for (const [label, value] of [
  ['DCO_ROOT', root],
  ['DCO_BASE', base],
  ['DCO_HEAD', head],
] as const) {
  if (value === '' || value.startsWith('-')) {
    console.error('verify-dco.ts: ' + label + ' needs a value')
    console.error('run "verify-dco.ts --help" for usage')
    process.exit(2)
  }
}
if (mode === '') {
  console.error('verify-dco.ts: DCO_MODE needs a value')
  console.error('run "verify-dco.ts --help" for usage')
  process.exit(2)
}
if (mode !== 'pr' && mode !== 'squash-commit') {
  console.error('verify-dco.ts: --mode must be pr or squash-commit')
  console.error('run "verify-dco.ts --help" for usage')
  process.exit(2)
}
const titleArgument = args.find((argument) => argument.startsWith('--pr-title='))
const inheritedTitle = process.env.DCO_PR_TITLE
const titleMissingInPullRequest =
  mode === 'pr' &&
  process.env.GITHUB_EVENT_NAME === 'pull_request' &&
  titleArgument === undefined &&
  inheritedTitle === undefined
if (
  titleArgument === '--pr-title=' ||
  (inheritedTitle !== undefined && inheritedTitle.trim() === '' && titleArgument === undefined) ||
  titleMissingInPullRequest
) {
  const titleSource = titleArgument === '--pr-title=' ? '--pr-title=' : 'DCO_PR_TITLE'
  console.error(`verify-dco.ts: ${titleSource} needs a value`)
  console.error('run "verify-dco.ts --help" for usage')
  process.exit(2)
}
if (titleArgument?.startsWith('--pr-title=') && prTitle.trim() === '') {
  console.error('verify-dco.ts: --pr-title= needs a value')
  console.error('run "verify-dco.ts --help" for usage')
  process.exit(2)
}
if (mode === 'squash-commit' && prTitle !== '') {
  console.error('verify-dco.ts: --mode=squash-commit does not take a pull-request title')
  console.error('run "verify-dco.ts --help" for usage')
  process.exit(2)
}
const range = `${base}..${head}`

interface TrackerSuffixRun {
  suffixes: string[]
  spaced: boolean
  positiveUnpadded: boolean
  atTrueEnd: boolean
  canonical: boolean
}

/** The complete `(#N)` run and whether it is GitHub's one canonical positive unpadded suffix. */
function trackerSuffixRun(subject: string): TrackerSuffixRun {
  const trailing = /(?:[ \t]*\(#\d+\))+\s*$/.exec(subject)?.[0] ?? ''
  const suffixes = [...trailing.matchAll(/\(#\d+\)/g)].map((match) => match[0])
  const spaced = suffixes.length === 1 && trailing.startsWith(` ${suffixes[0]}`)
  const positiveUnpadded = suffixes.length === 1 && /^\(#[1-9][0-9]*\)$/.test(suffixes[0]!)
  const atTrueEnd = suffixes.length === 1 && trailing === ` ${suffixes[0]}`
  return { suffixes, spaced, positiveUnpadded, atTrueEnd, canonical: atTrueEnd && positiveUnpadded }
}

/** The `(#N)` groups at the very end of a subject, whether or not whitespace precedes the first. */
function trailingTrackerSuffixes(subject: string): string[] {
  return trackerSuffixRun(subject).suffixes
}

/** Trailer lines in the final message block, with Git's continuation folding applied. */
function parsedTrailers(message: string): string[] {
  const normalized = message.replace(/\r\n?/g, '\n')
  const input = normalized.endsWith('\n') ? normalized : normalized + '\n'
  return gitWithInput(input, 'interpret-trailers', '--parse')
    .split('\n')
    .filter((line) => line.length > 0)
}

function git(...a: string[]): string {
  return execFileSync('git', a, { cwd: root, encoding: 'utf8' })
}

function gitWithInput(input: string, ...a: string[]): string {
  return execFileSync('git', a, { cwd: root, encoding: 'utf8', input })
}

/** Parse `git log -z` output whose eight metadata fields are NUL-framed. */
function commitsFromLog(log: string): {
  sha: string
  authorName: string
  authorEmail: string
  committerName: string
  committerEmail: string
  parents: string[]
  subject: string
  message: string
}[] {
  const fields = log.split('\0')
  if (fields.at(-1) === '') fields.pop()
  if (fields.length % COMMIT_FIELD_COUNT !== 0) {
    throw new Error(`expected ${COMMIT_FIELD_COUNT} NUL-framed fields per commit; found ${fields.length} fields`)
  }
  const commits = []
  for (let offset = 0; offset < fields.length; offset += COMMIT_FIELD_COUNT) {
    const [sha, authorName, authorEmail, committerName, committerEmail, parents, subject, message] = fields.slice(
      offset,
      offset + COMMIT_FIELD_COUNT,
    )
    commits.push({
      sha: sha!,
      authorName: authorName!,
      authorEmail: authorEmail!,
      committerName: committerName!,
      committerEmail: committerEmail!,
      parents: parents!.trim() === '' ? [] : parents!.trim().split(/\s+/),
      subject: subject!,
      message: message!,
    })
  }
  return commits
}

/**
 * The bots whose commits this repository accepts, by the author address GitHub stamps on them.
 *
 * The address is what makes the bot reachable at all: GitHub resolves an account from it, so a
 * commit under one of these addresses is attributed to that bot's account even when a person wrote
 * it locally — which is exactly what the verification below settles. Extend this one bot at a
 * time: being a GitHub App is not by itself a reason to skip the DCO, and every entry is an
 * identity a contributor may wear.
 */
interface BotAuthor {
  pattern: RegExp
  login: string
  trailer: string
  why: string
}

const BOT_AUTHORS: BotAuthor[] = [
  {
    pattern: /^\d+\+dependabot\[bot\]@users\.noreply\.github\.com$/,
    login: 'dependabot[bot]',
    trailer: 'dependabot[bot] <support@github.com>',
    why: 'authors as a per-installation noreply address and signs with GitHub’s fixed support@github.com trailer',
  },
]

/** Every allowlisted bot named by an identity or trailer value. */
function botsNamedByIdentity(value: string): BotAuthor[] {
  const bots = new Set<BotAuthor>()
  for (const match of value.matchAll(/([^<>]*)<([^<>]+)>/g)) {
    const name = match[1]?.trim()
    const email = match[2]?.trim()
    for (const bot of BOT_AUTHORS) {
      if ((email !== undefined && bot.pattern.test(email)) || name?.toLowerCase() === bot.login.toLowerCase()) {
        bots.add(bot)
      }
    }
  }
  for (const bot of BOT_AUTHORS) if (value.trim() === bot.trailer) bots.add(bot)
  return [...bots]
}

/** One field of a commit, asked of GitHub, or `undefined` when the call or the parse failed. */
function api(sha: string, jq: string): string | undefined {
  try {
    return execFileSync('gh', ['api', `repos/{owner}/{repo}/commits/${sha}`, '--jq', jq], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`verify-dco: the GitHub lookup for ${sha.slice(0, 12)} failed — ${message.trim().split('\n')[0]}`)
    return undefined
  }
}

let log: string
try {
  log = git('log', '-z', '--format=%H%x00%an%x00%ae%x00%cn%x00%ce%x00%P%x00%s%x00%B', range)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`verify-dco: the range ${range} could not be read — ${message.trim().split('\n')[0]}`)
  console.error('verify-dco: name the base the change is offered against, e.g. --base=origin/main')
  process.exit(1)
}

let commits: ReturnType<typeof commitsFromLog>
try {
  commits = commitsFromLog(log)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`verify-dco: the range ${range} metadata could not be decoded — ${message}`)
  process.exit(1)
}
if (commits.length === 0) {
  console.error(`verify-dco: the range ${range} holds no commit; nothing was checked`)
  process.exit(1)
}

const metadataFailures: string[] = []
const nonMergeCommits = commits.filter((commit) => commit.parents.length <= 1)
if (mode === 'squash-commit') {
  if (commits.length !== 1) {
    metadataFailures.push(`squash-commit mode needs exactly one commit in the range; found ${commits.length}`)
  } else {
    const commit = commits[0]!
    if (commit.parents.length !== 1) {
      metadataFailures.push(`post-squash commit must have exactly one parent; found ${commit.parents.length}`)
    }
    const suffixRun = trackerSuffixRun(commit.subject)
    if (!suffixRun.canonical) {
      const found =
        suffixRun.suffixes.length === 0
          ? 'none'
          : suffixRun.suffixes.length > 1
            ? `${suffixRun.suffixes.length} suffixes in one noncanonical trailing group (${suffixRun.suffixes.join(' ')})`
            : !suffixRun.spaced
              ? `one suffix without the required preceding space (${suffixRun.suffixes[0]})`
              : !suffixRun.positiveUnpadded
                ? `one suffix with an invalid issue number (${suffixRun.suffixes[0]}); use a positive unpadded decimal`
                : `one suffix not at the true end of the subject (${suffixRun.suffixes[0]})`
      metadataFailures.push(
        `post-squash subject must carry exactly one canonical space-prefixed tracker suffix; found ${found}`,
      )
    }
  }
} else {
  const titleSuffixes = trailingTrackerSuffixes(prTitle)
  if (titleSuffixes.length > 0) {
    metadataFailures.push(
      `pull-request title carries a manual tracker suffix (${titleSuffixes.join(' ')}); remove every (#N) suffix from branch inputs because GitHub supplies it after squash`,
    )
  }
  for (const commit of commits) {
    const subjectSuffixes = trailingTrackerSuffixes(commit.subject)
    if (subjectSuffixes.length === 0) continue
    const source =
      nonMergeCommits.length === 1 && nonMergeCommits[0] === commit
        ? 'the single non-merge commit supplies the prospective squash subject'
        : 'every branch commit subject must be suffix-free'
    metadataFailures.push(
      `${commit.sha.slice(0, 12)}  commit subject carries a manual tracker suffix (${subjectSuffixes.join(' ')}); ${source}`,
    )
  }
}

const signoffFailures = new Map<string, string[]>()
const botVerificationFailures = new Map<string, string[]>()
let claims = 0
function recordFailure(failures: Map<string, string[]>, sha: string, message: string): void {
  const existing = failures.get(sha) ?? []
  existing.push(message)
  failures.set(sha, existing)
}
for (const { sha, authorName, authorEmail, committerName, committerEmail, message } of commits) {
  const author = `${authorName} <${authorEmail}>`
  const committer = `${committerName} <${committerEmail}>`
  let trailers: string[]
  try {
    trailers = parsedTrailers(message)
  } catch (error) {
    const detail = error instanceof Error ? error.message.split('\n')[0] : String(error)
    recordFailure(signoffFailures, sha, `could not parse the final trailer block: ${detail}`)
    continue
  }
  const signoffs = trailers
    .filter((line) => /^Signed-off-by:\s+/i.test(line))
    .map((line) => line.replace(/^Signed-off-by:\s+/i, '').trim())
  if (signoffs.length === 0) {
    recordFailure(
      signoffFailures,
      sha,
      `${sha.slice(0, 12)}  no Signed-off-by trailer in the final trailer block (author ${author})`,
    )
    continue
  }

  const mentionedBots = new Map<string, BotAuthor>()
  for (const bot of BOT_AUTHORS) {
    if (bot.pattern.test(authorEmail) || authorName.toLowerCase() === bot.login.toLowerCase()) {
      mentionedBots.set(bot.login, bot)
    }
  }
  for (const named of signoffs) {
    for (const bot of botsNamedByIdentity(named)) mentionedBots.set(bot.login, bot)
    const identities = [...named.matchAll(/<([^<>]+)>/g)].map((match) => match[1]?.trim())
    if (identities.length > 1) {
      recordFailure(
        signoffFailures,
        sha,
        `${sha.slice(0, 12)}  one Signed-off-by unfolds to multiple identities: ${named}`,
      )
      continue
    }
    // The exemption is keyed on the author address rather than the name, and it covers one trailer:
    // a person who signs with somebody else's address still fails, which is the mistake this gate
    // was written to catch.
    const bot = BOT_AUTHORS.find((candidate) => candidate.pattern.test(authorEmail))
    const exempt = bot !== undefined && named === bot.trailer
    if (!exempt && named !== author && named !== committer) {
      recordFailure(
        signoffFailures,
        sha,
        `${sha.slice(0, 12)}  signs ${named}, but the commit's author is ${author} and its committer is ${committer}`,
      )
    }
  }
  if (mentionedBots.size === 0) continue

  // The assumed identity is checked, not believed: GitHub resolves the committer to an account, and
  // its verification status is bound to the committer email. Author attribution alone does not bind
  // the verified signature to the accepted bot signer.
  claims += 1
  const label = `${sha.slice(0, 12)}  ${author}`
  const type = api(sha, '.committer.type')
  const login = api(sha, '.committer.login')
  const verified = api(sha, '.commit.verification.verified')
  if (type === undefined || login === undefined || verified === undefined) {
    recordFailure(
      botVerificationFailures,
      sha,
      `${label}\n      GitHub could not be asked about it, and a claim this gate cannot check is not a claim it accepts`,
    )
    continue
  }
  if (type !== 'Bot') {
    recordFailure(
      botVerificationFailures,
      sha,
      `${label}\n      GitHub resolves the commit's committer to a ${type} account, not an allowlisted bot signer`,
    )
    continue
  }
  if (!mentionedBots.has(login) || mentionedBots.size !== 1) {
    const expected = [...mentionedBots.values()].map((bot) => `${bot.login} (${bot.why})`).join(', ')
    recordFailure(
      botVerificationFailures,
      sha,
      `${label}\n      GitHub resolves the committer to ${login}, but the named allowlisted identity is ${expected}`,
    )
    continue
  }
  if (verified !== 'true') {
    recordFailure(
      botVerificationFailures,
      sha,
      `${label}\n      ${login}'s commit is not signed by GitHub (verification.verified is ${verified}); a locally written commit cannot be`,
    )
    continue
  }
  console.log(`  verified  ${label}  committer ${login}, GitHub-signed`)
}

if (metadataFailures.length > 0) {
  console.error(`verify-dco: ${metadataFailures.length} commit metadata input(s) fail the squash-subject checks:`)
  for (const line of metadataFailures) console.error(`  ${line}`)
  console.error(
    'verify-dco: keep tracker references in the pull-request body; in squash-commit mode, use exactly one commit with one parent and one canonical suffix',
  )
}

if (signoffFailures.size > 0) {
  console.error(
    `verify-dco: final-trailer sign-off checks failed for ${signoffFailures.size} of ${commits.length} commit(s):`,
  )
  for (const lines of signoffFailures.values()) for (const line of lines) console.error(`  ${line}`)
  console.error('verify-dco: amend the final trailer block so every Signed-off-by names the author or committer')
}

if (botVerificationFailures.size > 0) {
  console.error(
    `verify-dco: GitHub verification failed for ${botVerificationFailures.size} of ${commits.length} commit(s) with allowlisted bot identity claims:`,
  )
  for (const lines of botVerificationFailures.values()) for (const line of lines) console.error(`  ${line}`)
  console.error(
    'verify-dco: use a GitHub-signed commit from the named allowlisted bot; a locally typed bot identity is not accepted',
  )
}

if (metadataFailures.length > 0 || signoffFailures.size > 0 || botVerificationFailures.size > 0) {
  process.exit(1)
}

console.log(
  `verify-dco: ${commits.length} commit(s) in ${range} carry a Signed-off-by naming an author or committer` +
    `, and ${claims === 0 ? 'none claims a bot identity that had to be verified' : `each of the ${claims} claiming a bot identity is that bot, signed by GitHub`}. ` +
    (mode === 'squash-commit'
      ? 'The landed squash commit has one parent and one canonical positive unpadded GitHub suffix.'
      : nonMergeCommits.length === 1
        ? 'The prospective squash subject comes from the sole non-merge commit subject.'
        : prTitle === ''
          ? 'Branch commit subjects are suffix-free; no pull-request title was supplied.'
          : 'The prospective squash subject comes from the pull-request title.'),
)
