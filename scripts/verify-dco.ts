/**
 * SPDX-License-Identifier: MIT
 *
 * A repository's own gate: every commit a change offers carries the
 * Developer Certificate of Origin's `Signed-off-by:` trailer, and the line
 * names the commit's author, or its committer where the two differ. A machine does not sign for a person, and a
 * person does not sign for a machine, so the trailer is compared against the
 * commit's own author record rather than trusted.
 *
 * One identity is accepted on more than that comparison. Dependabot authors as a per-installation
 * noreply address and signs with GitHub's fixed `support@github.com` trailer, so the exact
 * comparison refuses every weekly action bump; the exemption below accepts that one trailer for
 * that one author address. Both facts come from the commit, so a contributor can write them — and
 * a commit that claims a bot identity is therefore *verified* against GitHub as well: its resolved
 * account must be that bot, and GitHub must have signed it. That lookup happens only for the
 * commits that claim one, so a range of human commits is decided without asking GitHub anything.
 *
 * Reads a range: `--base=<ref>` (or `DCO_BASE`) to `--head=<ref>` (or
 * `DCO_HEAD`, default `HEAD`). An empty range fails: a gate that passes on an
 * empty corpus is worse than no gate.
 *
 *   node scripts/verify-dco.ts --base=origin/main
 */

import { execFileSync } from 'node:child_process'

const US = '\u001f'
const RS = '\u001e'

function arg(name: string, fallback: string): string {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : (process.env[`DCO_${name.toUpperCase()}`] ?? fallback)
}

const root = arg('root', '.')
const base = arg('base', 'origin/main')
const head = arg('head', 'HEAD')
const range = `${base}..${head}`

function git(...a: string[]): string {
  return execFileSync('git', a, { cwd: root, encoding: 'utf8' })
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
const BOT_AUTHORS: { pattern: RegExp, login: string, trailer: string, why: string }[] = [
  {
    pattern: /^\d+\+dependabot\[bot\]@users\.noreply\.github\.com$/,
    login: 'dependabot[bot]',
    trailer: 'dependabot[bot] <support@github.com>',
    why: 'authors as a per-installation noreply address and signs with GitHub’s fixed support@github.com trailer',
  },
]

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
  log = git('log', `--format=%H${US}%an${US}%ae${US}%cn${US}%ce${US}%B${RS}`, range)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`verify-dco: the range ${range} could not be read — ${message.trim().split('\n')[0]}`)
  console.error('verify-dco: name the base the change is offered against, e.g. --base=origin/main')
  process.exit(1)
}

const commits = log.split(RS).map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0)
if (commits.length === 0) {
  console.error(`verify-dco: the range ${range} holds no commit; nothing was checked`)
  process.exit(1)
}

const failures: string[] = []
let claims = 0
for (const chunk of commits) {
  const [sha, authorName, authorEmail, committerName, committerEmail, ...rest] = chunk.split(US)
  const message = rest.join(US)
  const trailer = message
    .split('\n')
    .map((line) => line.trimEnd())
    .find((line) => /^Signed-off-by:\s+/i.test(line))
  const author = `${authorName} <${authorEmail}>`
  const committer = `${committerName} <${committerEmail}>`
  if (!trailer) {
    failures.push(`${sha.slice(0, 12)}  no Signed-off-by trailer (author ${author})`)
    continue
  }
  const named = trailer.replace(/^Signed-off-by:\s+/i, '').trim()
  // The exemption is keyed on the author address rather than the name, and it covers one trailer: a
  // person who signs with somebody else's address still fails, which is the mistake this gate was
  // written to catch.
  const bot = BOT_AUTHORS.find((candidate) => candidate.pattern.test(authorEmail))
  const exempt = bot !== undefined && named === bot.trailer
  if (!exempt && named !== author && named !== committer) {
    failures.push(`${sha.slice(0, 12)}  signs ${named}, but the commit's author is ${author} and its committer is ${committer}`)
    continue
  }
  if (!exempt) continue

  // The assumed identity is checked, not believed: GitHub resolves the address to an account, and
  // only it can say whether the commit was signed by that account rather than written by somebody
  // who typed the address. A person cannot produce the signature, so this is what separates
  // Dependabot's bump from a forgery wearing its address.
  claims += 1
  const label = `${sha.slice(0, 12)}  ${author}`
  const type = api(sha, '.author.type')
  const login = api(sha, '.author.login')
  const verified = api(sha, '.commit.verification.verified')
  if (type === undefined || login === undefined || verified === undefined) {
    failures.push(`${label}\n      GitHub could not be asked about it, and a claim this gate cannot check is not a claim it accepts`)
    continue
  }
  if (type !== 'Bot') {
    failures.push(`${label}\n      GitHub resolves that address to a ${type} account, not a bot`)
    continue
  }
  if (login !== bot.login) {
    failures.push(`${label}\n      the address resolves to ${login}, which is not the bot this address is claimed for (${bot.login}, ${bot.why})`)
    continue
  }
  if (verified !== 'true') {
    failures.push(`${label}\n      ${login}'s commit is not signed by GitHub (verification.verified is ${verified}); a locally written commit cannot be`)
    continue
  }
  console.log(`  verified  ${label}  ${login}, GitHub-signed`)
}

if (failures.length > 0) {
  console.error(`verify-dco: ${failures.length} of ${commits.length} commit(s) in ${range} are not signed off:`)
  for (const line of failures) console.error(`  ${line}`)
  console.error('verify-dco: sign with `git commit --signoff`, or amend the commit that is missing it')
  process.exit(1)
}

console.log(
  `verify-dco: ${commits.length} commit(s) in ${range} carry a Signed-off-by naming their author`
  + `, and ${claims === 0 ? 'none claims a bot identity that had to be verified' : `each of the ${claims} claiming a bot identity is that bot, signed by GitHub`}.`,
)
