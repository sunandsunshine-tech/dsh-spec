# Skill name alignment trigger evidence

These trigger probes bind the renamed model-facing skill surfaces:

- `dsh-spec-ci-test-reliability`
- `dsh-spec-record-browser-gif`

Each probe ran in a fresh minimal project containing only the current skill under
`.agents/skills/` and the skill's current `trigger-fixtures/AGENTS.md`. The selection-only
instruction prohibited executing the request, editing files, spawning subagents and working
outside that project. The host-configured Codex CLI was `0.171.0-alpha.13`; the configured model
was `deepseek-flash`.

The CI test-reliability corpus contains four positive examples and four near misses. The browser
GIF corpus contains three positive examples and five near misses. All 16 probes ended with the
stable selection marker and matched the expected decision at the recorded inputs.

`trigger-input.sha256` binds the trigger corpus, fixture and current `SKILL.md` name/description
surface. The CI test-reliability matrix is historical after #144 changed its trigger surface; its
[per-skill note](dsh-spec-ci-test-reliability/README.md) links the current evidence. The browser-GIF
matrix remains current for that unchanged skill. The earlier trigger runs remain historical records
under the former skill identities.
