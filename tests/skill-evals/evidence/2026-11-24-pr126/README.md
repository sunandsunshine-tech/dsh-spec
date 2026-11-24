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
stable selection marker and matched the expected decision.

`trigger-input.sha256` binds the trigger corpus, fixture and current `SKILL.md` name/description
surface. The earlier trigger runs remain historical records under the former skill identities.
