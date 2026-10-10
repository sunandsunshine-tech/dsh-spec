# Agent Note: Opening this repository

Status: implemented

English | [中文](2026-09-24-opening-this-repository.zh.md)

## Problem

Publishing this repository settles a set of decisions a maintainer reverses only at a price: which license governs it, what right an inbound contribution carries, which code of conduct speaks for it, what an AI-assisted contribution discloses, which identity the public history carries, what runs on a pull request, and what the repository page offers. Each had a defensible answer, and those answers lived in the publication work's own planning material rather than in a record that outlives the session that made them.

The form kit that ships with the repository has the same shape from the other side. `form.md`, `questions.md`, `checklist.md` and `sources.md` are reusable by any repository, while the two working files written against them — the filled answers and the plan derived from it — carry this organization's account state. A public kit shows a filled form without carrying the account it was filled against.

## Decision

**The license stays MIT.** Upstream and every vendored package are MIT, and the extraction with `THIRD_PARTY_NOTICES.md` is already consistent with it.

**The code of conduct is Contributor Covenant 2.1 in its official English text, with no paired Chinese file.** The English text is authoritative, and a pair carries equal authority on both sides by contract, so a Chinese side would either be a second authority or a pointer. The repository keeps the pointer.

**Inbound contributions carry a DCO from day zero.** `CONTRIBUTING.md` states the `Signed-off-by` requirement, and `scripts/verify-dco.ts` checks that every commit in the pull-request range carries a sign-off matching its author. An agent does not sign for someone else, and the check recognizes only the contributor's own signature.

**AI contributions are allowed and disclosed.** A contribution declares assistance with an `Assisted-by:` trailer, and a person remains answerable for what the change does; a pull request submitted by an autonomous agent needs prior approval. The history already carries the trailer, and the policy records the practice rather than introducing it.

**The public commit identity is a GitHub noreply address.** Every commit's author and committer email is rewritten before the repository becomes public, at the point where no fork, no external clone and no immutable release exists, and the account-side email privacy settings are turned on first so the rewritten identity survives the next push.

**The CI is one workflow with the smallest permissions that run it.** `.github/workflows/checks.yml` triggers on `pull_request` and on `push: [main]`, declares `permissions: {contents: read}`, checks out with `submodules: recursive`, runs Node 24, and pins every third-party action to a full commit SHA. The vendored dependency snapshot is submitted on `push: [main]` alone, with no schedule.

**The repository page stays minimal.** There is no homepage; Issues is open; Wiki, Discussions and Projects are closed.

**The form kit ships as a worked example.** `example-answers.md` and `example-plan.md` carry the method — the answer table, the decisions a maintainer has to make, the skipped questions, the landing list, the orchestration with its dependencies and acceptance gates — with the organization's account state removed, and `making-this-repository-public.md` is archived beside them as the audit that preceded publication. The two working files the examples were derived from are not kept.

**The baseline pin follows every dsh release.** One routine does it: clone the new tag shallow, compare the ported files against `submodules/dsh`, re-port what changed and update `ports.json`, update the four pin sites, then run provenance and the full gate set.

Three notes own adjacent ground and are linked rather than restated: [the pin is the published tag](2026-09-22-the-pin-is-the-published-tag.md) owns what installs follow — the installed skill set's revision, not the extraction baseline; [the review handover and the merge need authorization](2026-09-23-the-review-handover-and-the-merge-need-authorization.md) owns what an authorization has to be, and why each of those two acts needs one; and [the pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) owns the states, the tidy before acceptance, before review and before the merge, the merge kinds, and where the `Assisted-by:` trailer sits in a commit message.

## Alternatives considered

- **Apache-2.0.** It adds a patent grant and a NOTICE and modification-marking duty. It lost because the repository ships no patent-sensitive code, and the extraction-plus-reconciliation routine would pay that duty at every re-port.
- **A paired Chinese code of conduct.** It would reach more readers. It lost because the pairing contract makes both sides equally authoritative, and a translation of the official text is not.
- **A CLA instead of a DCO.** It preserves a different relicensing route. It lost because a CLA asks an occasional contributor for a legal round trip, while a sign-off is the statement the project can actually check.
- **Barring AI-assisted contributions.** It removes the disclosure question. It lost because the rule that matters is that a person understands and answers for the change, which disclosure reaches and a prohibition nothing can enforce does not.
- **Accepting the commit email, or rebuilding history from a tree snapshot.** Both avoid the rewrite. Accepting it lost because the rewrite is cheapest before any fork, clone or immutable release exists; a clean snapshot lost because it discards the reviewable history the extraction relies on.
- **No CI, or a scheduled vendored refresh.** The gates run locally either way. No CI lost because a check that never runs on a pull request cannot be required; a schedule lost because the dependency graph recomputes on new advisories, and a scheduled public workflow is disabled after sixty idle days.
- **Enabling Wiki, Discussions, Projects and a homepage.** Each is one switch. They lost because they would open rooms that duplicate the gated documents already in the repository.
- **Keeping the two working files beside the examples.** A reader could compare them. They lost because they carry organization-private account state, and the examples are the part a reader needs.
- **Automatic submodule upgrades.** The pin would track dsh. It lost because the design is a pin plus a manual re-extraction, and the release-following routine is what keeps the provenance gate meaningful.

## Consequences

**What it bought.** Each publication decision has one home, so a later maintainer meets the license, the disclosure rule, the identity rewrite and the CI shape as stated facts rather than as a transcript to reconstruct, and the form kit becomes reusable by another repository because its example carries the method and not this account.

**What it costs.** The rewrite replaces every commit SHA, so closed pull requests that reference old commits keep pointing at objects the public repository does not name; the examples lose the concrete account evidence that made the original answers persuasive, and a reader has to take the method on its own terms.

**What it leaves to a reader.** The plan sequences the work: the baseline bump, the policy documents, the workflow and the scripts these decisions name land in the states that own them, and no platform act happens before the state that authorizes it — the visibility switch, the rulesets and the release happen only in their own states and only on the maintainer's authorization; [the review handover and the merge need authorization](2026-09-23-the-review-handover-and-the-merge-need-authorization.md) owns what such an authorization has to be.
