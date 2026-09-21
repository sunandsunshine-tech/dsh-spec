---
description: 'Use when adopting the dsh development pattern in a project, or when an adopted project needs its skill set changed: initialize the root AGENTS.md and the Agent Note tree; install the skill set from one pinned revision; update it; remove it; read each installed revision from the metadata the installer injected into SKILL.md; or run the project aggregate check. This skill owns project setup and the skill set, and reports every fact it could not determine.'
metadata:
    github-path: skills/dsh-spec-manager
    github-ref: refs/heads/extract
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: 826d1367f6802222a525a83dd44494cc6c04f13b
name: dsh-spec-manager
---
# Managing an adopted project

This is the one skill of the set that a project installs by hand. Everything else arrives through it, at one revision, listed in its manifest.

Its initialization mode runs before any other skill: the standing orders and the decision-record tree have to exist before an agent has anywhere to record a decision. After that it installs, updates and removes the workflow skills, carries the collection's engine — every gate, the dispatcher that resolves one by name, and the modules they share all sit in this skill's `scripts/` — and runs the aggregate check that keeps every gate from being optional.

**`scripts/` here is the collection's engine, not this skill's private resources.** The other skills ship their `SKILL.md` and `references/` and no code at all, so a gate's bug is a bug in the collection rather than in the workflow this file describes; file it against the gate, and change it where every skill's checks already live.

Two references carry the detail; this file does not restate them:

- [`manager-init.md`](references/manager-init.md) — the initialization workflow, from inventory to the questions it leaves for the maintainer.
- [`manager-lifecycle.md`](references/manager-lifecycle.md) — install, update, uninstall and status, the manifest they read, the engine directory and the dispatcher that resolves a gate by name, and the boundaries this skill keeps.

What this skill does not own: the decision-record contract belongs to [`dsh-archive-agent-notes`](../dsh-archive-agent-notes/SKILL.md), and the evidence a change owes belongs to [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md). Neither is restated here.
