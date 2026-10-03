# Agent Note: The install-copy conflict and its gate

Status: implemented

English | [中文](2026-10-03-the-install-copy-conflict-and-its-gate.zh.md)

## Problem

Every change to `skills/` must refresh `.agents/skills/**` in the same change, because [Track the installed skill copy in git](2026-09-18-track-the-installed-skill-copy.md) makes the copy the rules an agent actually loads. The installer writes a `metadata:` block into each of the ten installed `SKILL.md` files, and `github-ref` in that block names the branch the install was made from. That value differs per branch, so two pull requests that both change `skills/` collide on the same ten lines with different values rather than on different work: the rebase of #57 resolved that collision by hand.

The repository also has no gate comparing the copy with its source — the coverage gap [Track the installed skill copy in git](2026-09-18-track-the-installed-skill-copy.md) names in its Consequences. A change that edits the package and forgets the refresh leaves this repository green while the loaded skill is stale, and nothing in review shows it.

## Decision

**The conflict is accepted.** The copy stays in the same change as its source. Moving the refresh to release time would leave every pull request in between loading rules the source no longer states, which is the silent divergence the tracked copy exists to prevent. A collision on the injected block is mechanical — one line, one value — and not a reason to give up the same-change guarantee.

**Resolution is one recipe.** Take either side of the copy's conflicting lines during the rebase onto the new base, re-run `upgrade --revision <current-branch>` to regenerate the whole copy from the source, run `node scripts/verify-installed-copy.ts`, and publish the rewritten branch with `--force-with-lease`.

**A gate is both the net and the missing coverage.** `scripts/verify-installed-copy.ts` compares the two trees per skill: the file sets must match, every file but `SKILL.md` byte-for-byte, and `SKILL.md` with the injected `metadata:` block dropped from both sides; each copy's `github-tree-sha` must equal `git rev-parse HEAD:skills/<name>`; an empty corpus fails. It **never compares `github-ref`'s value**, because on main that value names a work branch that was merged and deleted while the copy is current — the field is a historical pointer, not a claim this tree can check. [The release commit carries its own copy](2026-09-23-the-release-commit-carries-its-own-copy.md) owns why a dangling ref is accepted and why the injected tree sha is the claim a copy makes. The gate catches a forgotten refresh and a conflict resolved to the wrong side, and `AGENTS.md` names it in the recipe.

## Alternatives considered

**A `.gitattributes` merge driver that takes one side.** Rejected: the copy carries the engine that CI executes, and an automatic resolution silently drops an engine change whenever one side changes the engine and the other only changes a skill.

**Keep `github-ref` only in the manager's `SKILL.md`.** Rejected for now: it reduces the collision from ten lines to one, but it changes what the package installs for adopters, so it needs its own decision and outside review. It stays open, and parallel changes to `skills/` becoming routine is the trigger to reopen it.

**Record the ref as a resolved commit sha.** Rejected: two branches have different heads, so the field still differs per file and the collision is unchanged.

**One pull request changing `skills/` at a time.** Rejected: it pays the parallelism as a rule while the collision happens only when two changes overlap, and the collision is cheap to resolve.

**Remove the copy from git, or refresh only at release.** Rejected: it returns to two collaborators loading different rules, the failure [Track the installed skill copy in git](2026-09-18-track-the-installed-skill-copy.md) rejected the ignored copy for.

## Consequences

- The collision remains, but it is mechanical and has a net: the gate names the copy that disagrees with its source, whether the refresh was forgotten or the conflict was resolved to the wrong side.
- The gate is repository tooling rather than a shipped check: it reads `skills/`, which an adopting project does not have, and CI runs it after port provenance.
- `AGENTS.md` carries the recipe, so a rebase has one recorded answer instead of a fresh judgement per branch.
- Reducing the metadata surface stays open with its trigger; until then the ten injected `github-ref` lines are the price of the same-change guarantee.
