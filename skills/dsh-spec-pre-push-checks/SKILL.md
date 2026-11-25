---
name: dsh-spec-pre-push-checks
description: "Use before pushing, force-pushing, marking ready for review, or claiming checks pass on a branch, and immediately after an automated tool rewrites and publishes branches, to select the smallest tests and checks that cover the outgoing or just-published diff without reflexively running the full repository suite. 用于推送、强制推送、标记待评审或声称检查通过之前，以及自动化工具重写并发布分支之后，按变更范围选择最小充分的测试与检查，避免反射式运行完整仓库套件。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
compatibility: "Requires Git; the bundled change-scope report also requires Node.js 24.11+ on the 24 line or 26+. No install is required, and the bundled report uses no network."
---

# Pre-push checks

Use this skill to produce the local evidence a push owes, once, from the change it actually carries. Run the selected checks once before the push and do not duplicate what the repository's hooks or CI already decide: a repository's hooks are its own and usually narrow, and CI owns exhaustive coverage and the platform matrix. The one ordering exception is an automated tool that rewrites and publishes branches as a single operation; validate its result immediately afterward and do not merge until the evidence passes.

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## Inspect the outgoing change

1. Confirm the checkout and branch.

```sh
git status --short --branch
git rev-parse --show-toplevel
```

2. Verify the base the change will be reviewed against — the pull request's base, or the parent branch when the branch sits in a stack — fetch that ref, and produce the complete outgoing-scope report against it.

```sh
node <skill-dir>/scripts/change-scope.mjs --base <verified-base-ref>
```

`<skill-dir>` is the directory containing this `SKILL.md`; run the command inside the repository. The report never guesses or fetches a base: supply the ref verified from the current remote or stack state, and add `--head <ref>` to inspect a commit other than `HEAD`. It prints one versioned JSON object whose `paths.committed` holds the paths relative to the resolved merge base, while `paths.staged`, `paths.unstaged` and `paths.untracked` describe the current worktree; the committed paths are the branch's scope, and the worktree sets add work that is not committed yet. After merging a changed base into the branch, rerun the report, reassess which behavior the combined scope can affect, and rerun only the checks the merge invalidated.

## Select relevant evidence

There is no universal local baseline beyond the repository's hooks. Every behavior change needs the narrowest available test or purpose-built check that would fail for its regression; add broader checks only for the surfaces the diff actually reaches. Use the repository's own scripts and workflow files as the inventory of what can be run.

- **Tested behavior:** run the test file or focused test name that owns the changed behavior. Add adjacent tests when a shared contract changes, and leave repository-wide coverage to CI unless the change is genuinely cross-cutting or the user asks for it.
- **Machine-consumable expected failures:** run the boundary test that proves the project's existing stable machine-readable failure identity survives, the original cause or equivalent structured detail remains available, and consumers do not route on message text. When the project declares an error-handling standard, apply it (when available, use the `dsh-spec-error-handling` skill).
- **Asynchronous or resource-owning tests:** when the change adds or changes an asynchronous, resource-owning or subprocess test, fixture, helper or CI execution path, first determine the project's applicable test-reliability requirements: whether restoration, negative-control, quiescent-teardown or concurrent-process evidence applies to the failure it could cause (when available, consider using the dsh-spec-ci-test-reliability skill). This skill still selects the commands and does not repeat evidence that already passed.
- **Browser-rendered UI:** inspect the actual assembled page across affected states and consumers, and produce or reuse the project's required rendered evidence. Keep the project's existing tests, media evidence and approval triggers in scope; a passing test suite or source inspection does not establish visual acceptance. Report any missing scene, capability or required approval as an unfinished check (when available, use the dsh-spec-client-ui-ux skill).
- **Observable output:** when the change is visible to a model, an editor, a CLI or a terminal, run the focused snapshot or the real runnable-example scenario that owns that output.
- **Documentation and decision records:** run the repository's documentation check — the link check, documentation build or sync its workflow names — and the full lint when the documentation workflow requires it.
- **Type checking and generated types:** a typed change runs the repository's typecheck before it is handed off. An unbuilt or stale generated declaration is not strict evidence: rebuild missing, stale or partial generated declarations before diagnosing remaining errors, and keep a local typing exception in test support, never in production types or ambient flags. Before claiming completion of a change whose types or build inputs moved, run the check that consumes the current build output after the build that produces it; stale output is not evidence.
- **Build and packaging:** when the change reaches package manifests, public exports, build configuration, entry points, worker or bin entries, or built runtime paths, run the build, the repository's packaging and hygiene checks, and the smoke that exercises the built artifact.
- **External behavior:** run the owning end-to-end target when its credentials or environment are available, and never print secrets.

Pass test-runner filters the way its launcher forwards them: for `pnpm run`, a file or name filter goes directly after the script name, because a standalone `--` can reach the underlying runner and disable name filtering; other launchers keep their own forwarding syntax. Check the reported selected test count before treating a filtered run as focused evidence.

Do not manually repeat a passing check merely because commit or push follows. In particular, do not run the typecheck immediately before pushing solely to duplicate a hook.

### Focus unit coverage on the affected source

Test selection and coverage selection are separate. A test filter chooses which tests run; when coverage is part of the evidence, also name the source files or packages the coverage must prove, using the runner's coverage-include mechanism. Use an exact source file when the behavior is confined to one module, pass every owning test needed to exercise the selected scope, and keep the configured per-file thresholds in force inside it.

When the owning tests are unclear, discover candidates through the runner's dependency or related mode, then inspect the selected tests before treating the run as evidence. That discovery cannot find behavior reached only through configuration, dynamic loading, subprocesses, workers, built artifacts or external providers; select those owning tests explicitly.

Never use a no-tests suppression, lower a threshold, or narrow the source scope to hide an uncovered affected file. If a selected scope fails because one focused test does not cover it, add its other relevant owning tests, or narrow the source scope only when the excluded modules cannot be affected by the change.

## Full local rehearsal

Run the complete local approximation only when the user explicitly requests it, while diagnosing a CI failure, or when the change spans the repository so broadly that no narrower set is credible. Use the current workflow and package scripts as the inventory; do not invent an aggregate check the repository does not provide.

## Protect history-rewriting pushes

Where the repository's instructions allow a history rewrite, rebase with rerere is the default refresh for a standalone branch and for a branch in a stack, including after review. Before rebasing, enable `git config rerere.enabled true`, ensure `rerere.autoUpdate` is unset or false so replayed resolutions stay unstaged, and inspect each replayed resolution before staging it. Before a standalone history rewrite, fetch the current remote branch and record its exact OID; publish with `--force-with-lease=<branch>:<observed-oid>` so a concurrent update aborts the push. A stack tool or other automation that publishes branches it manages supplies lease protection for the branches it manages; if it does not, record the OID and use the lease yourself. Raw `--force` is never allowed.

After any rewritten push, fetch the live heads again and re-audit unresolved review threads, approvals, mergeability and checks. Commit hashes and inline-comment anchors from before the rewrite are not current evidence.

### Validate after an automated rewrite and publish

Some tools fetch, rebase and push as one operation, so local validation cannot sit between the rewrite and the publication; `gh stack sync` is one such tool. Before running one, require a clean worktree and record the published order and the exact remote heads. After it returns:

1. Re-query every branch head and the published order.
2. Inspect the changed scope of every rewritten branch against its live base.
3. Run the relevant evidence this skill selects for each affected branch.
4. Keep every change unmerged and report validation as pending until all selected checks pass.

If post-publication evidence fails, leave the lease-protected published heads in place, repair the failure, validate the repair, and publish the correction. Do not claim the operation made the change ready merely because it succeeded.

## Handle failures

If a relevant check fails before an ordinary push, stop and fix it or explain the blocker. Do not push and hope CI differs. For a failure after an automated rewrite and publish, block the merge and follow the repair procedure above.

If a failure looks environment-specific, prove it:

- Record the exact command, failing test and platform-specific mismatch.
- Confirm the relevant non-platform evidence.
- Prefer fixing cross-platform nondeterminism when the check is required.
- Bypass a local hook only when the user explicitly asks or agrees, and report exactly what failed and why CI is expected to differ.

## Push procedure

For an ordinary push or a standalone rebase push:

1. Run the selected relevant checks once.
2. Commit normally and inspect any files changed by the pre-commit fixer before continuing.
3. Push normally, or with the exact lease for an authorized rewritten branch, so the repository's own hooks run.
4. Verify the remote ref matches local `HEAD`.

```sh
push_ref=$(git rev-parse --symbolic-full-name '@{push}')
git rev-parse HEAD "$push_ref"
```

The push remote is the one selected by the branch's upstream or explicit push configuration; it need not be named `origin`.

Inspect the review platform's checks after the push; when the platform is GitHub, `gh pr checks` reports them. Report pending checks as pending, and inspect failures before attributing them to the branch or the environment.

When the platform reports no checks for the pushed commit, distinguish a workflow that did not start from a conflict. On GitHub, query the Actions runs for the exact pushed SHA; only when the count is zero should you read mergeability before suspecting a dropped event. A conflicting pull request can create no pull-request workflow runs. Read mergeability with:

```sh
gh pr view <number> --json mergeable,mergeStateStatus
```

Resolving the conflict is the only fix: empty commits, `--allow-empty` pushes, draft/ready toggles and revert-and-restore bounces add history and leave the run count at zero. When a conflict is the cause, confirm the paths with `git merge-tree --write-tree HEAD <push-remote>/<base>` after resolving the actual push remote and base branch.

For an automated rewrite and publish, use the post-publication sequence instead of pretending the ordinary order was possible.
