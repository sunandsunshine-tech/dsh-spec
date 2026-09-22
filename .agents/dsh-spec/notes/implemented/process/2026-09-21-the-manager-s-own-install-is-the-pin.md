# Agent Note: The manager's own install is the pin

Status: implemented

English | [中文](2026-09-21-the-manager-s-own-install-is-the-pin.zh.md)

## Problem

The manifest declared the revision every skill came from, and a project could not change it: `manifest.json` ships inside the installed manager, so the declaration is written by the skill set and read back by the manager that the same install put in place. A project that needed a branch or an older release had no supported way to say so, and the one file that named the pin was the one file the project may not edit.

The declaration also had no check behind it. `status` compared each installed ref against the manifest's literal, so a manifest that named a revision nobody had installed passed as long as the installed copies agreed with each other — the skill set could not notice that its own declared pin and its own installations had drifted apart. [The released revision is the main branch](2026-09-21-the-released-revision-is-main.md) left that shape in place and changed only its value.

## Decision

**The manifest declares no revision.** `revision` is gone from `manifest.json`; the file still holds the repository, the skills to install, the gates this skill set publishes and each gate's scope. The installer already records the ref it resolved into each installed `SKILL.md` as `metadata.github-ref`, and that record is the pin: what an install delivered is what the project runs.

**A command that must name a target resolves it in two levels.** An explicit `--revision <ref>` wins. Without the flag the resolver reads the latest **published** release from the repository — a draft release is not a release, so its `tag_name` is not offered — and refuses with exit code 2, naming `--revision`, when there is neither a flag nor a published release. Only the two self-updating verbs resolve a target: `install` and `upgrade --only-skill-set` take their revision from the manager instead.

**The skill set is installed from the manager's own ref.** `install` and `upgrade --only-skill-set` read `metadata.github-ref` out of the installed `dsh-spec-manager/SKILL.md` and install the remaining skills at it, with the `refs/heads/` or `refs/tags/` prefix stripped for the short name. This is the ref an install already delivered. A source tree that was never installed has no such metadata, and there the pair falls back to the two-level resolution above.

**`upgrade` is a self-update followed by the set.** It resolves the target, self-updates the manager through `gh skill install <repo> dsh-spec-manager@<target> --dir <skillsDir> --force` when the manager's current ref and the target differ, and then re-executes the freshly installed dispatcher with `upgrade --only-skill-set --revision <target> --root <root>`; the exit code is that re-execution's, so the old code never finishes the work the new manager owns. A replacement older than `--only-skill-set` cannot be handed a target — run on its own it would install the set at the ref it pins, a different revision than the one this invocation resolved — so it is not run: the invoked copy installs the set instead, from the manifest the replacement ships, and neither half is left behind.

**`--only-skill-set` is the half without the self-update.** It installs the skill set at the manager's current injected ref and runs no `gh skill install` for the manager itself.

**`status` compares each skill against the manager.** Every installed skill's injected ref must equal the manager's own injected ref — a local comparison that reads no network. A skill whose `SKILL.md` carries no such block is reported by name as not being an install, and a manager with no metadata is itself a finding, because the set then has no pin to compare against.

**A dry run reads the remote index and shows three layers.** `install` and `upgrade` under `--dry-run` resolve the ref over the network, so `already at <ref>` is a fact rather than a plan; they classify every file the target revision ships as `+ added`, `~ modified` or `- removed`, with `SKILL.md` excluded from content comparison and reported on its own line as the injected metadata's move from one ref to another; and for the text the skill set owns they render the new text, diff it against the file on disk, and print `would update <path>` with that diff, truncated to about 40 lines. Nothing is written, and skill bodies are not diffed.

## Alternatives considered

**Keep `revision` in the manifest and add `--revision` as an override.** The flag would cover the project that needs a branch, and the manifest would keep naming the default. It lost because two names for one fact drift: the flag either overrides a written declaration or contradicts it, and the record of what the project actually installed — `metadata.github-ref` — would agree with neither. The manager can only pin what it was installed at.

**Pin the latest tag and require an explicit upgrade for every move.** A tag cannot move under an installer, which is the strongest pin short of a commit, and dsh itself pins `dsh-v0.1.6-alpha.2`. It lost because it makes every release a manifest change plus a re-install in every project, while this skill set is young enough that the released line is still the trunk; the released-revision note made the same trade for the same reason.

**Read a remote manifest on every upgrade to learn the new revision.** The skill set would stay the authority on what its released revision is, and no local record would have to be trusted. It lost because it puts the network in the path of a command that is otherwise local, buys the same answer the latest published release already gives, and makes `status` — the check a project runs before a push — unreproducible offline.

## Consequences

**What it bought.** One name answers where a revision comes from, and it is the record an install actually wrote rather than a literal the skill set maintained by hand. A development branch reaches a project through `--revision <branch>` without a release, and a tag reaches it through `--revision <tag>` without a manifest edit. `status` can no longer disagree with the thing it checks, because both sides read the installed metadata.

**What it costs.** Nothing compares the installed set against a revision the project never installed, so a project that wants to test a branch must first fetch the manager at that branch and only then install the rest — the former manifest pin could be pointed at a branch and refreshed in one move. The manager keeps a step of its own inside `upgrade`, and the re-execution is what keeps the two halves from mixing old code with a new ref.

**What it obliges.** A source tree that carries no manager metadata has no local pin, so `install` and `upgrade` fall back to the latest published release there and can be refused when the repository has no published release and no flag is given. In this repository, the installed copy's ref is therefore the only thing that tells a refresh where to fetch from. [Track the installed skill copy in git](2026-09-18-track-the-installed-skill-copy.md) owns the standing orders that follow, and the release pull request in [the pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) is what publishes the revision the fallback resolves.

**What it leaves to a reader.** The install path is one install plus one refresh: `status` confirms the set, and `upgrade` catches it up to the ref the manager itself carries. A project that needs a specific revision passes it explicitly, and that flag is the whole surface for pinning now that no file declares one.
