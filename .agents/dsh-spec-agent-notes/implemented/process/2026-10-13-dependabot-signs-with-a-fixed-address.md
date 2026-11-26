# Agent Note: Dependabot signs with a fixed address, so the DCO gate accepts that one

Status: implemented

English | [中文](2026-10-13-dependabot-signs-with-a-fixed-address.zh.md)

## Problem

Every Dependabot action bump failed the DCO gate, so each one had to be landed by hand.

Dependabot authors a commit as `<installation-id>+dependabot[bot]@users.noreply.github.com` and always carries `Signed-off-by: dependabot[bot] <support@github.com>`. The trailer address is fixed by GitHub and deliberately differs from the per-bot author address, so `verify-dco.ts` — which reads the authorship out of the commit rather than trusting the trailer — reported `signs dependabot[bot] <support@github.com>, but the commit's author is dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>` and exited 1.

The refusal is by design, not a defect: the comparison exists so that a sign-off naming somebody other than the commit's author, or naming a mistyped address, is caught. But it also meant the one automated dependency channel this repository configured could never satisfy it, and the weekly bump arrived with a red check.

## Decision

`verify-dco.ts` accepts Dependabot's fixed trailer address for a commit whose author address is Dependabot's own. It verifies a commit against GitHub whenever the author address or any final-block sign-off names an allowlisted bot, including Dependabot's noreply self-signoff.

The trailer and bot checks live in one commit-admission gate: a human commit is decided locally, while a bot identity needs GitHub to distinguish it from a locally written claim.

The gate normalizes CRLF and CR line endings to LF, then parses the final trailer block with `git interpret-trailers --parse`, so continuation lines unfold according to Git's trailer rules. Every unfolded `Signed-off-by:` must name exactly one identity, the commit's author or committer. A folded value naming multiple identities fails.

Dependabot's fixed trailer is accepted only when the author address matches `^\d+\+dependabot\[bot\]@users\.noreply\.github\.com$` and the sign-off is exactly `dependabot[bot] <support@github.com>`. Every other sign-off keeps the exact author-or-committer comparison, so a sign-off naming a third party still fails.

A display name alone cannot buy the exemption. It does trigger verification when it names an allowlisted bot: GitHub must resolve the commit's committer to that bot, not a human account. A human who writes `git -c user.name="dependabot[bot]"` with a human address therefore fails.

For every commit naming an allowlisted bot, the gate requires three GitHub-side facts: `committer.type === 'Bot'`, the expected bot login, and `commit.verification.verified`. GitHub's [commit API](https://docs.github.com/en/rest/commits/commits#get-a-commit) separates its author and committer account attributions, while [signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) binds the verified signature to the committer email. Author attribution plus a verified boolean therefore does not prove that the bot signed the commit.

What that keeps: a contributor's checkout decides a human range from `git log` alone, and no commit is asked for a signature — the DCO needs none, and requiring one would impose this repository's taste on every contributor. What it costs: the gate is no longer a pure `git log` read in every case. A bot commit in the range needs `gh`, authenticated; a contributor who authors one locally and runs the gate offline gets a refusal rather than a pass, which is the honest answer, since only GitHub can tell that commit from a forgery.

The credential is the CI step's to supply, and it carries `GITHUB_TOKEN` the way the vendored-packages workflow hands one to its step: `gh` reads that variable as well as `GH_TOKEN` and refuses without either, so a step offering none fails the check rather than skipping the question. `contents: read` is the only scope the lookup needs.

## Alternatives considered

**Remove Dependabot and update the pin by hand when a release appears.** The smallest change, and it leaves the gate untouched. It lost because the pin is one line in two workflow files and a weekly bot is exactly the chore worth not doing: `actions/setup-node` moved from 7.0.0 to 7.1.0 with a two-line diff, and a human repeating that by hand is the manual upkeep an automated channel exists to remove.

**Skip every commit whose author name ends in `[bot]`.** One line, and it covers release-please and every future bot. It lost because the author name is contributor-controlled: `git -c user.name="some[bot]"` would skip the gate for an ordinary contributor. Two repositories that shipped this shape have since moved off it, one of them recording the bypass as its own reason.

**Put the whole exemption in the local gate, trusting the two writable facts.** The change that was written first. It lost because a contributor can write both — `user.email` and the trailer — so the exemption would rest on nothing GitHub knows.

**Ask GitHub about every commit, so that a signature is required of people too.** It lost because the DCO needs no signature: demanding one would add a key to every contributor's setup for a check the certificate does not make, against a gate whose whole design is to be runnable with `git` alone.

**Trust the API's author attribution and verified boolean.** It lost because GitHub's author account identifies the commit's author, not the committer whose email and signature are verified. A human committer under a Dependabot author would otherwise satisfy both writable local fields and the remote boolean.

**Exempt the bot and record it in the pull request instead of the gate.** No gate change at all. It lost because the CI that must go green runs the gate from `main`, so the exemption has to be on `main` before Dependabot's pull request can pass it.

## Consequences

The weekly bump arrives green and merges with the same sign-off the gate still demands of a person. `support@github.com` is accepted for exactly one author address, so this is not a general escape hatch.

What it costs: another bot that injects its own sign-off fails the same way until its author pattern, login and accepted trailer are added to `BOT_AUTHORS`. That is deliberate — the comparison stays exact for everyone else, and widening it takes a change and a note rather than a general rule about bots.

The gate accepts a commit carrying Dependabot's author address and trailer only after GitHub resolves the commit's committer to the bot and reports the signature GitHub-verified. The author, committer and trailer strings remain contributor-writable; the external committer resolution and signature are the checks that separate the bot's commit from a local claim.

The remaining human control is review: the DCO step runs on pull requests, and what lands on `main` is what a reviewer passed.

## Testing

`tests/dco.test.ts` runs the gate against fixture repositories. It pins legitimate LF and CRLF folded sign-offs, folded multi-identity rejection, author-only and committer-only identities, Dependabot's fixed trailer, its noreply self-signoff, a Dependabot author with a human committer, per-SHA facts across multiple commits, the bot name with a human address, unsigned and failed GitHub lookups, unrelated bots, missing final-block sign-offs, and empty ranges.
