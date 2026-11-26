# Agent-experience behavior and trigger evidence

The host-configured Codex CLI was `codex-cli 0.171.0-alpha.13`; the configured model was
`deepseek-flash`. Behavior and trigger runs were rerun on 2026-11-26 against
`skills/dsh-spec-agent-experience/SKILL.md` at
`855d9677ca8148abf427a74aa1595c17443cc3bc1390b20bd668edffbe7074a7`. The canonical name and
description surface hash is
`bf545950a4c72526dbae7dfdb6179a94432f2a0bb10f4f8c70484a423b329564`.

## Behavior runs

The repository runner staged the complete target skill and each scenario's declared fixture files
into a fresh Git project. It invoked Codex with an isolated project, Codex home, response directory
and temporary directories. The source repository and scenario answer definitions were outside the
model namespace.

| Scenario | Assertions | Evidence |
|---|---:|---|
| `minimal-context-and-explicit-discovery` | 5/5 | Prompt and resource contract |
| `tool-parameter-rules-stay-with-parameters` | 5/5 | Tool definition schema |
| `bounded-results-with-local-context-and-retrieval` | 5/5 | Bounded result and retrieval contract |

The minimal-context run writes a starting system prompt with the purpose and critical customer-data
constraints before action guidance, followed by the available actions. Refund and escalation details
are described and deferred to exact `read_resource` paths. It does not paste the policy handbook
into the prompt.

The tool-definition run keeps the tool description to the operation and result. It puts the
`replicas` default and bounds on the parameter, pairs `start_at` with `timezone`, conditionally
requires `canary_percentage` for `canary` with its own default and bounds, and requires
`approval_ticket` only for production.

The bounded-output run requires stable thread and message identifiers, a small adjacent-message
window, explicit match and context omissions, exact range or page follow-ups, and a check that
another broad search adds needed evidence. It does not reproduce whole threads.

Each scenario directory records typed `evidence.json` and `execution.json`, the current scenario
definition and input hashes, all installed-skill hashes and modes, capabilities, the final response,
normalized trace, changed paths, patch, retained artifact and reviewer-assigned assertions.

## Trigger runs

The trigger corpus has five positive surfaces: a system prompt, a tool definition, an existing
skill's instructions, context-loading instructions, and a multi-step workflow. Its four near misses
are whole-skill creation, whole-skill rewriting, ordinary prose trimming, and ordinary
implementation review.

Each query ran in a separate temporary project with only `dsh-spec-agent-experience` installed.
Each process used a fresh isolated `HOME` and `CODEX_HOME` containing only the model-provider
configuration, model catalog and read-only sandbox policy; host MCP servers, plugins, sessions and
user skills were not loaded. The project was read-only. Every trace has exactly one
`turn.completed` event as its final event, and every retained stderr log is free of
`rmcp::transport::worker`, `AuthRequired`, and `Transport channel closed`.

All nine probes reached the expected selection. Existing skill instruction text still loads this
skill when the skill's role and structure remain settled. Whole-skill creation and rewriting do not.
The same `reshape-skill-instructions` and `rewrite-whole-agent-skill` requests are negative and
positive, respectively, in the `dsh-spec-skill-forge` trigger corpus. Together the two matrices
record the shared routing boundary from both sides.

`trigger-input.sha256` binds the corpus, fixture, and current name/description surface. Each
`trigger/<id>/` directory retains the final response, normalized `codex exec --json` trace and
stderr. One run per query records these examples; it is not a repeated-sample trigger-rate estimate.
