# Agent Note: Dependabot signs with a fixed address, so the DCO gate accepts that one

Status: implemented

English | [中文](2026-10-13-dependabot-signs-with-a-fixed-address.zh.md)

## Problem

Every Dependabot action bump failed the DCO gate, so each one had to be landed by hand.

Dependabot authors a commit as `<installation-id>+dependabot[bot]@users.noreply.github.com` and always carries `Signed-off-by: dependabot[bot] <support@github.com>`. The trailer address is fixed by GitHub and deliberately differs from the per-bot author address, so `verify-dco.ts` — which reads the authorship out of the commit rather than trusting the trailer — reported `signs dependabot[bot] <support@github.com>, but the commit's author is dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>` and exited 1.

The refusal is by design, not a defect: the comparison exists so that a sign-off naming somebody other than the commit's author, or naming a mistyped address, is caught. But it also meant the one automated dependency channel this repository configured could never satisfy it, and the weekly bump arrived with a red check.

## Decision

`verify-dco.ts` accepts Dependabot's fixed trailer address for a commit whose author address is Dependabot's own, and verifies a commit that claims a bot identity against GitHub rather than believing it.

The two decisions live in one gate because the second applies only to the commits the first exempts: the exemption is what creates an identity worth checking, so a range of human commits is decided by `git log` alone and a range carrying a bot commit asks GitHub about exactly those commits.

The exemption in `verify-dco.ts` is keyed on the author **address**, not the author name: the commit passes only when `git log` reports the author email as `^\d+\+dependabot\[bot\]@users\.noreply\.github\.com$` **and** the trailer is exactly `dependabot[bot] <support@github.com>`. Every other commit keeps the exact comparison against both the author and the committer, so a sign-off naming the wrong person still fails.

A display name cannot buy the exemption. GitHub resolves an account from the author address, so the address in that pattern belongs to the bot, while `user.name` is whatever the committer sets — `git -c user.name="dependabot[bot]"` signs with a human address and is refused.

For every commit the exemption fires on, the gate then requires three GitHub-side facts: `author.type === 'Bot'`, a login on its allowlist, and `commit.verification.verified`. A commit a person wrote locally satisfies the two writable facts and not the signature, so the exemption accepts Dependabot's bump and refuses the forgery it could not otherwise see.

What that keeps: a contributor's checkout decides a human range from `git log` alone, and no commit is asked for a signature — the DCO needs none, and requiring one would impose this repository's taste on every contributor. What it costs: the gate is no longer a pure `git log` read in every case. A bot commit in the range needs `gh`, authenticated; a contributor who authors one locally and runs the gate offline gets a refusal rather than a pass, which is the honest answer, since only GitHub can tell that commit from a forgery.

The credential is the CI step's to supply, and it carries `GITHUB_TOKEN` the way the vendored-packages workflow hands one to its step: `gh` reads that variable as well as `GH_TOKEN` and refuses without either, so a step offering none fails the check rather than skipping the question. `contents: read` is the only scope the lookup needs.

## Alternatives considered

**Remove Dependabot and update the pin by hand when a release appears.** The smallest change, and it leaves the gate untouched. It lost because the pin is one line in two workflow files and a weekly bot is exactly the chore worth not doing: `actions/setup-node` moved from 7.0.0 to 7.1.0 with a two-line diff, and a human repeating that by hand is the manual upkeep an automated channel exists to remove.

**Skip every commit whose author name ends in `[bot]`.** One line, and it covers release-please and every future bot. It lost because the author name is contributor-controlled: `git -c user.name="some[bot]"` would skip the gate for an ordinary contributor. Two repositories that shipped this shape have since moved off it, one of them recording the bypass as its own reason.

**Put the whole exemption in the local gate, trusting the two writable facts.** The change that was written first. It lost because a contributor can write both — `user.email` and the trailer — so the exemption would rest on nothing GitHub knows.

**Ask GitHub about every commit, so that a signature is required of people too.** It lost because the DCO needs no signature: demanding one would add a key to every contributor's setup for a check the certificate does not make, against a gate whose whole design is to be runnable with `git` alone.

**Exempt the bot and record it in the pull request instead of the gate.** No gate change at all. It lost because the CI that must go green runs the gate from `main`, so the exemption has to be on `main` before Dependabot's pull request can pass it.

## Consequences

The weekly bump arrives green and merges with the same sign-off the gate still demands of a person. `support@github.com` is accepted for exactly one author address, so this is not a general escape hatch.

What it costs: another bot that injects its own sign-off fails the same way until somebody adds its trailer to `DEPENDABOT_TRAILER` beside its author pattern. That is deliberate — the comparison stays exact for everyone else, and widening it takes a change and a note rather than a general rule about bots.

The forgery it does not stop, and the one it does not introduce. A commit genuinely authored and signed by the bot cannot be told from a locally committed one carrying those two strings, because both facts come from the commit itself: `git log` reads an author record a contributor sets, and a trailer they write. So a contributor who writes `user.email=49699333+dependabot[bot]@users.noreply.github.com` and that trailer passes this gate.

That is not a hole this change opens. A gate comparing a trailer against an author record is comparing two contributor-controlled facts, so the pre-existing rule had the same property one step over — committing as the trailer's own address always satisfied `named === author`. What compares authorship to an outside record rather than to the commit is verification (GitHub's signature check, GPG, Sigstore), which this gate has never done, and the alternatives above are where that choice was made.

What the exemption does newly permit is a commit wearing the bot's identity, which reads as trusted automation in a pull request list. The defence is the same one as before it: a pull request is reviewed before it merges, and the DCO step runs on pull requests only, so what lands on `main` is what a reviewer passed.

## Testing

`tests/dco.test.ts` runs the gate against a fixture repository and pins both halves: Dependabot's fixed trailer is accepted for Dependabot's author address, and accepted for nobody else — a human address under the bot's name, a bot commit with a human trailer, and an unrelated bot's fixed trailer all still fail, beside the missing-trailer and empty-range cases.
