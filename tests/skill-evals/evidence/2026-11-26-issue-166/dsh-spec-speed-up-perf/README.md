# Speed-up-perf model evidence

The behavior and trigger arms were regenerated on 2026-11-27 through
`tests/skill-evals/run-model-eval.mjs` against the final `dsh-spec-speed-up-perf` revision. Every
typed leaf records `SKILL.md` SHA-256
`9e5f67bf04461b19b0c7bd7caf8033dea52c15150c0e9a3e11c14d99bcdf4d5d`. Each behavior run used a
600,000 ms deadline, the host-proxy credential boundary, `workspace-write`, no subagents, and the
capability profile recorded in its `capabilities.json`.

The eight candidate behavior scenarios pass 45 of 45 assertions. `measurement-decisions` assertion 5
passes because its retained trace contains a same-harness, seven-sample cache-only intermediate that
reintroduced the original linear-membership scan while the regional cache stayed constant, followed
by the same benchmark on the final `Set` implementation.

- `measurement-decisions`, 6/6: benchmark, project gate, profile and retained evidence remained
  separate decisions; caching region totals and replacing a linear dedupe scan removed the measured
  cost; the cache-only intermediate isolated the targeted scan; the response retained its exact
  bytes and the project gate stayed at 60 ms.
- `frontend-input-to-paint`: a temporary Chrome-for-Testing binary measured real input through the
  visible update, separated scripting, style, layout and frame boundaries, and verified preserved
  filtering, scores and ordering after removing repeated work.
- `browser-measurement-unavailable`: no browser was exposed, so the run made no measurement claim,
  changed no file, downloaded no substitute and handed off a resumable DevTools run.
- `end-to-end-external-boundary`: the complete loopback client path, local transform and injected
  shipping delay were separated; the zero-delay control isolated the external phase and the report
  retained its observational limits.
- `private-corpus-remains-aggregate`: aggregate dimensions and a synthetic measurement plan were
  reported without raw corpus content, paths, identities or credentials; unavailable tooling was
  handed off rather than downloaded or assumed.
- `cold-start-process-memory`, 6/6: fresh child processes measured cold start, while transient
  allocation and reachable retained state were measured through a fixed 32 KiB external payload per
  batch; the release control returned the measured `arrayBuffers` delta to zero, and heap and RSS
  high-water behavior remained labeled observational.
- `stable-identity-subscription-order`: whole-collection snapshots and cloned rows were diagnosed;
  the proposed narrower subscription preserved unchanged-row identity, order and the immediate
  initial event, returned isolated teardown, and included a failing current-code control.
- `authorized-deliberate-difference`: the authorized change from three decimal places to one was
  named, the owning output check was updated, row order and the fixed source total were preserved,
  and the response made no unsupported performance claim.

The no-skill baseline under `baseline-measurement-decisions/` used the same fixture and prompt,
reached the same basic optimization, and passed five of six assertions. It omitted the explicit
negative control that the skill requires. That result supports a narrow consistency claim rather
than claiming unique basic optimization ability. Its trace also contains an intermediate, but its
final response never reports that observation as the negative control.

The real-browser arm ran with a temporary Chrome for Testing 145.0.7632.6 installation outside the
repository. The capability-absent sibling uses the same fixture with browser access masked. Neither
run installs tooling on behalf of the skill; the temporary browser is evaluation-host setup.

The trigger matrix contains six positive runtime-performance requests and seven near misses covering
test reliability, coverage, pre-push selection, visual review, general code review and capacity
planning. Benchmark/gate/profile work is a positive case; capacity forecasting is a near miss. All
thirteen selection probes returned the expected `SELECT:` marker for `dsh-spec-speed-up-perf` or
`none`.
Trigger probes ran with only the target skill installed in an isolated project and Codex home.
Each retains a query-bound trace and typed evidence that bind the exact query, trigger surface and
corpus, and each is graded `1/1`.

All nine behavior runs were regenerated with the current runner. Each trace begins with the exact
scenario binding, ends with the sole terminal turn event, and reproduces the retained `final.md`
exactly. Artifact manifests cover every retained artifact. Subagents remained disabled, so these
runs exercise the capability-absent delegation route; the optional present route remains an explicit
evidence handoff for a broad multi-domain task.

Evidence in `../../2026-11-24-pr129/dsh-spec-performance-investigation/` exercised the former name and
is retained only as historical provenance.
