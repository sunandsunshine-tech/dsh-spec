# Agent Note: The manager owns only the skills its manifest names

Status: proposed

English | [中文](2026-10-10-the-manager-owns-only-the-skills-its-manifest-names.zh.md)

## Problem

`status` compared every installed directory against the manifest as if it belonged to this collection: a directory with a `SKILL.md` that no manifest entry named was reported unlisted and exited non-zero. Two collections that share `.agents/skills/` therefore failed each other's check — [#63](https://github.com/sunandsunshine-tech/dsh-spec/issues/63) reproduces it with another collection's directory beside a full install. Writing that collection's skills into `manifest.skills` is not a way out: `install` and `upgrade` resolve every manifest name against this repository, so a foreign name fails the whole run rather than being skipped.

## Proposal

Ownership is read from what the installer wrote, not from the network: `gh skill install` injects `metadata.github-repo` into every installed `SKILL.md`, and that field names the repository the file came from. `status` classifies each installed directory against it:

- **Name in `skills`** — this collection's, compared with the manager's own revision as before.
- **Not in `skills`, `github-repo` is this collection's repository** — this collection's, but the revision no longer publishes it: a finding, and `upgrade` removes the directory by name.
- **No `metadata.github-repo`, or another repository** — another collection's install: one `other` line, and the exit code is untouched, because a project running two collections must not fail one collection's check over the other's skill. An optional skill the project did not take is reported `absent`, which is the state the field describes rather than a problem.

`uninstall` draws the same line from the other side: it removes the whole set, or the one skill `--skill <name>` names, and a name the manifest does not carry is refused rather than skipped. That refusal is what keeps another collection's directory untouched, as a property of the code rather than of a comparison.

Ownership is decided locally. `status` reads no network, which is its existing contract, and the classification needs no repository access because the installer's metadata is already on disk.

## Alternatives considered

**Write the other collection's skills into `manifest.skills`.** It lost on measurement: `install` and `upgrade` resolve every manifest name against this repository, so a foreign name fails the whole run rather than being skipped, and `status` only trades one finding for another.

**Resolve ownership over the network, from the repository each skill came from.** It lost because `status` is documented and relied on as a local check that reads no network; a repository walk that fails on a plane turns a drift report into an outage.

**Leave an unlisted directory alone without classifying it.** It lost because two different states would become one: a skill this collection installed that the revision dropped would sit in the tree forever, reported by nothing and removed by nothing. Naming the owner is what separates "leave it" from "clean it up".

**Compare revisions against the manifest instead of the manager's own installed file.** It lost because the manifest declares no revision by design — it ships inside the installed manager, so a revision written there is a claim the project cannot check against what it installed — and [the manager's own install is the pin](../../implemented/process/2026-09-21-the-manager-s-own-install-is-the-pin.md) owns why. The manifest also travels with the revision, so it cannot say where the project came from.

## Acceptance criteria

- Another collection's directory beside this collection's install is reported as an `other` line, and `status` exits 0.
- A directory whose `github-repo` is this collection's, but whose name the revision no longer publishes, is a finding, and `upgrade` names and removes it.
- The reproduction in [#63](https://github.com/sunandsunshine-tech/dsh-spec/issues/63) exits 0.
- `status` decides every one of these locally, reaching no network.
- `uninstall --skill <name>` refuses a name the manifest does not carry, with exit 2, and no other collection's directory is touched.
- An optional skill the project did not take is reported `absent` and does not fail the check.

## Risks

- The classification trusts the injected `metadata.github-repo`, which is a field in a file rather than a fact the filesystem enforces: a directory hand-written to claim this collection's repository is treated as this collection's, and `upgrade` removes it.
- A skill installed before the metadata existed carries no `github-repo`, so it is classified as another collection's and left alone; the stale directory survives until someone removes it by hand.
- A name that leaves `skills` while its directory stays becomes a finding only `upgrade` clears, so a project that never upgrades keeps seeing it.
