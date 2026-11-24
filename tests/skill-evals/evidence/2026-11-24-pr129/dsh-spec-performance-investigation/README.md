# Performance investigation model evidence

The five candidate scenarios run through `tests/skill-evals/run-model-eval.mjs` with the current
`dsh-spec-performance-investigation` skill installed in an otherwise minimal project.

- `backend-budgetless-latency`: real HTTP benchmark, profiling, a behavior-preserving optimization,
  interleaved control runs and a byte-identical response.
- `frontend-input-to-paint`: built browser application, real CDP input, visible frame completion,
  browser phase metrics, preserved results and a controlled reintroduction.
- `browser-measurement-unavailable`: the browser capability is masked; the run keeps source analysis
  separate from measurement and hands off a resumable browser run.
- `end-to-end-external-boundary`: a read-only checkout diagnosis that separates the complete client
  path, local transform and controlled external delay.
- `private-corpus-remains-aggregate`: an authorized telemetry inspection that reports only aggregate
  workload dimensions and verifies that raw prompts, outputs, paths, identities and credentials do
  not enter the response, fixture or artifacts.

The no-skill baseline under `baseline-backend-budgetless-latency/` uses the same backend fixture and
prompt without the skill. It proves the model can already optimize this small fixture; the skill's
additional value is the enforced measurement contract, interleaved control, browser boundary and
capability-absent handoff, not a claim that the model cannot improve ordinary code without help.

The trigger corpus contains five positive runtime-performance requests and six near misses covering
test reliability, coverage, pre-push selection, visual review and general code review. All eleven
probes matched the expected `SELECT:` marker. The host-configured Codex CLI was
`0.171.0-alpha.13`; the configured model was `deepseek-flash`.
