---
name: dsh-spec-merging-stacked-prs
description: "Use when landing official stacks of dependent GitHub PRs (A ← B ← C), merging a PR based on another open PR's branch, or sequencing related PRs. Requires GitHub stacked-PR support and gh stack. Not for review-fix propagation, single-PR merges, manual target changes, or non-GitHub chains; never merge and retarget individual PRs. 用于落地 GitHub 官方堆叠：相互依赖的 PR（A ← B ← C）、基于另一个开放 PR 分支的 PR，或按序合并相关 PR。需要 GitHub stacked-PR 支持与 gh stack。不适用于评审修复传播、单 PR 合并、人工更改目标分支或非 GitHub 依赖链；不得逐个合并 PR 并更改其目标分支来模仿堆叠语义。"
compatibility: "Requires the GitHub CLI (gh) with the official gh stack extension and access to GitHub; every head branch must be in the same repository."
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# Landing an official GitHub PR stack

Land dependent PRs through GitHub's native stack object and `gh stack merge`. Do not reproduce stack semantics by merging and retargeting individual PRs with `gh pr merge` and `gh pr edit`. Rebase with rerere is the default branch refresh; merge-forward requires the PR author's explicit request and a policy that allows it. The landing repository's instructions remain authoritative. Review-fix propagation is outside this skill: after any push that rewrites heads, re-audit unresolved threads, approvals, mergeability and checks before merging, as § Refresh only when needed requires.

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## Require native stack support

Run `gh stack --version` before changing GitHub state. If the extension or the server-side stacked-PR feature is unavailable, stop and report it; do not fall back to merging and retargeting PRs one at a time. GitHub stacks require every head branch to live in the same repository, so a cross-fork chain is a stop.

Use a clean dedicated worktree. Fetch current PR metadata and exact head OIDs rather than trusting branch names or an earlier report:

```sh
gh pr view <pr> --json number,author,baseRefName,baseRefOid,headRefName,headRefOid,isCrossRepository,state,isDraft,reviewDecision,mergeStateStatus,statusCheckRollup
```

## Find the official stack

The official stack object is the membership authority; base-branch inference alone is not. Query `PullRequest.stack` and `stackEntry.position` for at least one PR in each apparent chain, and paginate `entries` when `size` exceeds the returned page:

```sh
gh api graphql -F owner=<owner> -F name=<repo> -F number=<pr> -f query='
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      number
      author { login }
      baseRefName
      headRefName
      stackEntry { position }
      stack {
        number
        baseRefName
        size
        entries(first: 100) {
          pageInfo { hasNextPage endCursor }
          nodes {
            position
            pullRequest { number author { login } baseRefName headRefName state isDraft }
          }
        }
      }
    }
  }
}'
```

Follow `pageInfo.hasNextPage` with an `after` argument when the stack is larger than the page. Establish the expected bottom-to-top order from the live PR bases: the bottom targets the trunk, and each higher PR targets the head branch immediately below it. The trunk is the stack's `baseRefName`, or the bottom PR's `baseRefName` when linking a chain; it need not be the repository default branch.

## Link missing stack members

First compare any existing stack entries with the expected chain. One existing stack may contain an order-preserving subset of the requested chain; multiple stack numbers, an unexpected entry, or a conflicting order requires user direction before any mutation.

When any dependent PR is not yet in that official stack:

1. Compare every `author.login` exactly.
2. If all authors match, link the chain automatically in bottom-to-top order. Before running it: pass pull-request URLs — the extension pushes branch arguments and can create PRs, and a numeric argument that matches no PR is treated as a branch name; obtain each URL with `gh pr view <pr> --json url`, or compose `https://github.com/<owner>/<repo>/pull/<n>`; link only open pull requests, and treat a closed or merged entry as a stop and ask before changing state.

   ```sh
   gh stack link --base <trunk> <bottom-pr-url> ... <top-pr-url>
   ```
3. If authors differ or any author is unavailable, ask the user whether to link before changing GitHub state.
4. Re-query GraphQL and require one stack number, the expected trunk, the complete PR set, and the expected positions and base chain.

Never dissolve, reorder or rebuild an existing stack automatically; `gh stack link` is additive. Do not attempt to unstack merged or queued entries; treat such a stack as a stop and ask.

## Refresh only when needed

Do not rewrite branches merely because a refresh mechanism exists. When the live merge state or the repository's rules require the branch to be updated onto the trunk, enable rerere with `git config rerere.enabled true`, ensure `rerere.autoUpdate` is unset or false so replayed resolutions stay unstaged, then rebase. Inspect every replayed resolution before staging it. Use merge-forward only when the PR author explicitly requests it and the landing repository allows that history.

- **Native cascading rebase (default).** Check out the remote stack with `gh stack checkout <pr-or-stack>` when it is not tracked locally, then run `gh stack sync`. The command may rebase and lease-protected force-push every active layer before local validation, so immediately inspect the rewritten scope, run the relevant checks for every affected layer, and do not merge or claim readiness until they pass. If sync detects a rebase conflict, use `gh stack rebase`, resolve and validate it, then publish with `gh stack push`. If checkout or sync reports divergent local and remote stack compositions, cancel and ask rather than deleting or recreating the remote stack automatically.
- **Incremental merge-forward (author-requested exception).** Merge the trunk into the bottom affected branch, then propagate each updated parent into its child in bottom-to-top order and push normally. If the base advances during an in-progress merge, preserve that checkpoint before merging the newer tip. Do not choose this history merely because it avoids force-pushing.

A history rewrite is allowed after review where the landing repository's instructions allow it, but it invalidates commit-OID assumptions. Re-fetch exact heads and re-audit unresolved review threads, approvals, mergeability and checks after the push. Never use raw `--force`, and never overwrite a concurrently advanced remote head. When repository policy forbids rebase, require its allowed alternative or stop; when policy is silent, the native cascading rebase default above applies.

## Preflight the merge range

Re-query the official stack immediately before merging. Require every selected PR to be open, non-draft, in the expected order, and compliant with the full base-branch protections for the stack trunk and each dependent base. Use `gh pr checks <pr> --required` for required checks; a raw `statusCheckRollup` can retain superseded failures and does not identify required checks. A `CHANGES_REQUESTED` review, a failed required check, a conflict, a still-computing `UNKNOWN`, or any `BEHIND` state is a blocker. The native stack also requires linear history: the trunk head must be an ancestor of the bottom PR head, and each lower head must be an ancestor of the next higher head. Refresh the stack when either condition fails. `BLOCKED` can describe the unmerged parent of a dependent layer and is a blocker only when its required reviews, checks, conflicts, or missing base requirements establish one. `UNSTABLE` is a blocker only when a required check failed.

"Land the stack" selects the whole stack; a partial landing requires an explicit boundary PR and includes every layer from the bottom through that boundary. Treat each PR's state independently: a ready top layer does not prove its dependencies are ready.

The landing repository's policy selects the merge method. When its instructions prescribe one, use it; otherwise, when its GitHub merge settings allow exactly one method, use that method; otherwise use `squash`.

Resolve every blocker through its owning PR or stop and report it.

## Merge through the stack API

Merge the whole stack by its official stack number, or an explicitly requested partial landing through the boundary PR. Substitute the stack number (or the boundary PR's number) and exactly one merge method chosen in § Preflight the merge range:

```sh
gh stack merge <stack-number> --yes --<merge|squash|rebase>
gh stack merge <boundary-pr> --yes --<merge|squash|rebase>
```

Do not pass `--delete-branch`, manually retarget dependents, or issue per-PR merge commands. GitHub merges the selected range bottom-up and retargets or rebases any remaining upper layers. A direct stack merge is all-or-nothing; when the trunk uses a merge queue, GitHub queues the selected range together but may land it in separate groups.

Do not bypass merge requirements. If the native merge reports a blocker, inspect and resolve it through the owning PR or stop and report it; never fall back to `gh pr merge`.

## Verify the landed state

Wait for every selected PR to report `MERGED`; a queued request is not a completed landing:

```sh
gh pr view <pr> --json number,state,mergedAt,mergeCommit,baseRefName,headRefName
```

For a partial landing, re-query the official stack and verify that every remaining PR is still linked in the expected order and targets the stack trunk or the layer below it. Layers that already report `MERGED` are already landed. Re-check current heads, review state and CI because GitHub may have rebased the remaining layers. When a merge queue reports some selected PRs as `MERGED` while others remain queued, treat the queued remainder as unlanded: re-query the official stack and report the queue state instead of waiting indefinitely.

Delete branches only in a separate final pass after the corresponding PRs report `MERGED`. Before deleting each branch, require GitHub to report no open PR still using it as a base:

```sh
gh pr list --state open --base <branch> --json number --jq length
```

Anything other than `0` blocks deletion.

## Checklist

- [ ] Native `gh stack` support is available, every PR branch is in the same repository, and the worktree is clean with live head OIDs fetched.
- [ ] Live PR bases establish one bottom-to-top chain; the official stack object reports one stack with the expected trunk, entries and order; an eligible same-author unstacked chain was linked, or user direction was asked for.
- [ ] The declared stack base, full base-branch protections, required checks, and linear trunk-to-tip ancestry pass; no selected layer is `BEHIND`.
- [ ] Any rewritten layer passed the relevant checks, and review threads, approvals, mergeability and checks were re-audited after the push.
- [ ] Re-querying the official stack before the merge finds every selected PR open, non-draft, in order, with no changes-requested review or failed required check; dependency-only `BLOCKED` is not treated as a failure.
- [ ] The whole stack, or the explicitly bounded prefix, was merged through `gh stack merge` with the landing repository's method; no per-PR merge command was used.
- [ ] Every selected PR reports `MERGED`; after a partial landing, the remaining layers form the expected official stack.
- [ ] Branch deletion happened only in the final pass, after merged-state and zero-dependent verification.
