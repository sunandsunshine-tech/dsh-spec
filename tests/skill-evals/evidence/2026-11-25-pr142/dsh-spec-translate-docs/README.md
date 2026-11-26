# Translate Docs activation and briefing evidence

These probes ran against the #142 revision of `dsh-spec-translate-docs`. Each trigger query used a
fresh minimal project containing only the current skill under `.agents/skills/` and the current
selection-only `trigger-fixtures/AGENTS.md`. The project `AGENTS.md` prohibited executing the
request, editing files, spawning subagents and inspecting paths outside the project. The
host-configured Codex CLI was `0.171.0-alpha.13`.

The activation corpus has four positive examples and four near misses. All eight probes ended with
the stable selection marker and matched the expected decision. The positives cover explicit pair
creation/check, a maintained pair changed by inference, and workflow-authorized pair creation. The
near misses cover ordinary standalone translation, ordinary documentation editing and review, and
inferred translation without pair scope.

`trigger-input.sha256` binds the corpus, fixture and current `SKILL.md` name/description surface.
PR121 and PR122 translate-docs runs remain historical evidence for their recorded revisions.

The `briefing-style` run uses the same isolated model runner with `--sandbox workspace-write`. The
scenario supplies a drifted committed pair, a declared `docs/style.md`, and a clean-context handoff
for the translation step. The run generated the change-local briefing, read the style and full
terminology table separately, and handed off without editing the counterpart or record. Its six
assertions pass; the retained trace and scenario definition bind the current skill revision.
