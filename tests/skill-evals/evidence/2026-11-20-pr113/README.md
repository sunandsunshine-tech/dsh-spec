# PR #113 clean-context model evidence

Candidate implementation commit: `1b40307d92fb24714717ae5086df84f3640cf55b`.
Candidate skill tree: `45cbc1bb02db3bc97ae070e5b4ec1034c6ac3b91`.
Evaluation corpus tree: `46f81662cef85fbe8f0053db8c65c1884f3ebf8d`.
Trigger corpus blob: `01a40e7d8ab08a77951576b6061d1854e98720a9`.
Trigger fixture tree: `bdfe46c825900cbe1d22f109785b774863d1b0ef`.
Base: `7bd235d` (`agent/104-dsh-rc5-baseline`).
Run date: 2026-11-20.

## Method

Each run used a fresh temporary project and `codex exec --ephemeral`. Candidate runs installed the
reviewed skill at the fixture's `.agents/skills/` path. Previous-skill runs installed the
`agent/104-dsh-rc5-baseline` version; no-skill runs omitted it. The fixture was read-only, and no
parent task context or generated conversation was passed to the model.

The host used `codex-cli 0.169.1` with the configured `gpt-5.6-luna` model. Each command followed this
shape:

```sh
codex exec --ephemeral --skip-git-repo-check -s read-only -C <fixture> \
  --json -o <run>/final.md "<scenario prompt>"
```

The primary agent graded each saved response against the scenario assertions and recorded the
result in `status.txt`.

The prompts and expected assertions come from
`tests/skill-evals/dsh-spec-error-handling/evals/evals.json`. This is targeted evidence for the
changed failure-contract behavior, not a claim that every deterministic scenario in the corpus
requires a model run.

## Results

| Scenario | Profile | Assertions | Time | Input tokens | Output tokens |
|---|---|---:|---:|---:|---:|
| message-only | no skill | 4/4 | 34.4 s | 69,506 | 6,019 |
| message-only | candidate | 4/4 | 29.0 s | 116,703 | 4,782 |
| worker-boundary | no skill | 4/4 | 39.5 s | 70,578 | 6,727 |
| worker-boundary | candidate | 4/4 | 161.0 s | 182,037 | 4,099 |
| silent-handler | no skill | 4/4 | 29.0 s | 50,816 | 4,864 |
| silent-handler | candidate | 4/4 | 30.0 s | 75,754 | 4,477 |
| existing identity | no skill | 4/4 | 56.6 s | 270,512 | 11,059 |
| existing identity | candidate | 4/4 | 106.0 s | 201,881 | 8,943 |
| numeric status, no cause | no skill | 4/4 | 42.7 s | 261,750 | 7,458 |
| numeric status, no cause | candidate | 4/4 | 51.0 s | 182,070 | 8,579 |

Candidate total: 20/20 assertions. Previous-skill total: 18/20. No-skill total: 20/20.

The no-skill profiles satisfy the saved assertions too, so this run set does not establish a
candidate-versus-no-skill difference for those prompts. The previous-skill comparison remains the
revision that exposed the silent-handler regression.

| Scenario | Previous skill | Assertions | Time | Input tokens | Output tokens |
|---|---|---:|---:|---:|---:|
| message-only | `agent/104-dsh-rc5-baseline` | 4/4 | 33.4 s | 90,131 | 5,927 |
| worker-boundary | `agent/104-dsh-rc5-baseline` | 4/4 | 69.5 s | 88,744 | 11,922 |
| silent-handler | `agent/104-dsh-rc5-baseline` | 2/4 | 26.0 s | 72,006 | 3,833 |
| existing identity | `agent/104-dsh-rc5-baseline` | 4/4 | 48.3 s | 166,591 | 8,453 |
| numeric status, no cause | `agent/104-dsh-rc5-baseline` | 4/4 | 52.8 s | 246,582 | 9,395 |

## Assertion results

### Message-only failure

Both profiles added a stable `code`, kept `message` for display, and proposed a regression test that
asserts both the exact code and unchanged account state.

Evidence: `baseline-message-only/`, `previous-message-only/`, `candidate-message-only/`.

### Worker boundary

Both profiles carried a stable identity and nested cause across the worker boundary and proposed a
round-trip test. The candidate additionally distinguished the owning failure from unknown worker
defects and required the receiving side to reconstruct an equivalent owning failure.

Evidence: `baseline-worker-boundary/`, `previous-worker-boundary/`, `candidate-worker-boundary/`.

### Silent handler

The previous-skill profile split commit and notification out of the handler but still discarded every cleanup
failure, so it missed the requirement to identify only the expected missing-directory failure.

- PASS — the silent scope contains one operation.
- FAIL — the ignored cleanup failure is not identified by a stable discriminant.
- PASS — the reason states the cleanup state consequence.
- FAIL — unexpected cleanup failures are still discarded.

The candidate selected the missing-directory condition, rethrew other cleanup failures, and kept
commit and notification failures visible.

The previous-skill profile missed the stable-discriminant and unexpected-failure assertions because
it still discarded every cleanup failure. The no-skill profile narrowed the catch correctly under
the explicit state-guarantee prompt.

Evidence: `baseline-silent-handler/`, `previous-silent-handler/`, `candidate-silent-handler/`.

### Existing project identity

Both profiles preserved the project's `kind` union and rejected adding `name` or `code`. The
candidate stated the compatibility and message-reporting consequences more completely and required
tests to prove the absence of a competing identity.

Evidence: `baseline-existing-identity/`, `previous-existing-identity/`,
`candidate-existing-identity/`.

### Numeric status without a cause chain

All profiles retained numeric exit status `11` and `23` as the machine identity, gave them different
retry actions, and retained stderr as diagnostic detail. They also avoided inventing a cause or a
competing string code.

Evidence: `baseline-numeric-no-cause/`, `previous-numeric-no-cause/`,
`candidate-numeric-no-cause/`.

## Trigger evaluation

The final skill description was run against the ten queries in
`tests/skill-evals/dsh-spec-error-handling/trigger-evals.json`. A query triggered when the execution
trace contained a command that read `.agents/skills/dsh-spec-error-handling/SKILL.md`; directory
listings alone did not count.

The first near-miss batch produced one false positive: the TypeScript build-performance query read
the skill. Adding performance tuning to the description exclusions and rerunning that query removed
the read. The final matrix is 5/5 positive triggers and 5/5 near-miss non-triggers.

Each `trigger/<query>/` directory retains the final response, stderr, and a derived `trace.jsonl`
containing command records and the final token usage. The commands are copied from the ephemeral
`codex exec --json` stream; the large command outputs are omitted. This keeps the trigger decision
auditable without committing the full host trace. Every trace begins with the SHA-256 of the
installed `SKILL.md`, and the evidence test checks it against the current source.

All runs use `trigger-fixtures/AGENTS.md`, which marks `.agents/skills/` as evaluator infrastructure
and forbids reading it for task context. Five near-miss prompts name minimal files under
`trigger-fixtures/<query>/`; the positive prompts are self-contained. This separates catalog
selection from an incidental directory scan.

Runs made after the configured gateway plugin became unavailable passed
`-c 'plugins."codex-ds-gateway@codex-ds-adapter".enabled=false'` and
`-c 'mcp_servers.gateway.enabled=false'`. Those settings disable a broken tool integration; they do
not change the installed skill or its selection.

Evidence: `trigger-matrix.tsv`, `trigger/<query>/final.md`, `trigger/<query>/trace.jsonl`.
