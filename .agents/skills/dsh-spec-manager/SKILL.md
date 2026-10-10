---
description: 'Use when adopting the dsh development pattern in a project, or when an adopted project changes its skill set: initialize the root AGENTS.md and the Agent Note tree; install, update or remove the skill set at the ref the manager itself was installed from; read each installed ref from its metadata; choose the norms the project applies, and list, explain or update them; or run the checks the project owes. It owns project setup and the skill set, and reports what it could not determine.'
metadata:
    github-path: skills/dsh-spec-manager
    github-ref: refs/heads/tmp/fold-m3
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: 8c93474e738f543db91cfe26f78eafe0be596044
name: dsh-spec-manager
---
# Managing an adopted project

This is the one skill of the set that a project installs by hand. Everything else arrives through it, at one revision, listed in its manifest.

`install` runs before any other skill: the standing orders and the decision-record tree have to exist before an agent has anywhere to record a decision. After that the same entry point upgrades and removes the workflow skills, carries the collection's engine — every check, the entry point that resolves one by subject, and the modules they share all sit in this skill's `scripts/` — and dispatches the checks a change owes. It also carries the norms the set accumulated: a project chooses from the catalog in `references/norms.json`, the rules it chooses land in its own tree where it may edit them, and an update reports what moved instead of overwriting an edit.

**`scripts/` here is the collection's engine, not this skill's private resources.** The other skills ship their `SKILL.md` and `references/` and no code at all, so a gate's bug is a bug in the collection rather than in the workflow this file describes; file it against the gate, and change it where every skill's checks already live.

Four references carry the detail; this file does not restate them:

- [`cli.md`](references/cli.md) — the tool's own reference: every command, its verbs, its scope, its flags and an example. It is rendered from `--help --markdown`, so it cannot drift from what a reader sees in a terminal.
- [`manager-install.md`](references/manager-install.md) — what adoption writes into a project, what the project keeps, and the initializer's own flags.
- [`manager-lifecycle.md`](references/manager-lifecycle.md) — install, upgrade, uninstall and status, the manifest they read, the engine directory, the subjects the entry point answers to, and the boundaries this skill keeps.
- [`upstream-notices.md`](references/upstream-notices.md) — the upstream DeepSeek Harness notice this set carries once it is installed away from this repository.

What this skill does not own: the decision-record contract belongs to [`dsh-archive-agent-notes`](../dsh-archive-agent-notes/SKILL.md), and the evidence a change owes belongs to [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md). Neither is restated here.
