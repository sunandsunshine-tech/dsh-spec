---
name: dsh-spec-merging-stacked-prs
description: "Use when landing dependent GitHub PRs that form a stack (A ← B ← C), merging a PR whose base is another open PR's branch, or when a request mentions stacked PRs, PR stack, dependent PRs, or merging related PRs in sequence. Requires GitHub's official stacked-PR feature and gh stack; never merge and retarget individual PRs. 用于在 GitHub 上合并堆叠 PR、依赖 PR 链或按序合并相关 PR。需要 GitHub 原生堆叠 PR 能力与官方 gh stack 扩展，不得用逐 PR 合并与重定基模仿堆叠语义。"
compatibility: "Requires the GitHub CLI (gh) with the official gh stack extension and access to GitHub; every head branch must be in the same repository."
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# Landing an official GitHub PR stack

Land dependent PRs through GitHub's native stack object and `gh stack merge`. Do not reproduce stack semantics by merging and retargeting individual PRs with `gh pr merge` and `gh pr edit`. The landing repository's own instructions (its `AGENTS.md` or equivalent) own the merge-forward and rebase histories it allows. Review-fix propagation is outside this skill: after any push that rewrites heads, re-audit unresolved threads, approvals, mergeability and checks before merging, as § Refresh only when needed requires.

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

Follow `pageInfo.hasNextPage` with an `after` argument when the stack is larger than the page. Establish the expected bottom-to-top order from the live PR bases: the bottom targets the trunk, and each higher PR targets the head branch immediately below it. The trunk is the repository's default branch (`gh repo view --json defaultBranchRef`).

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

Do not rewrite branches merely because a refresh mechanism exists. When the live merge state or the repository's rules require the branch to be updated onto the trunk, choose one of the histories below that the landing repository's instructions allow.

- **Native cascading rebase.** Check out the remote stack with `gh stack checkout <pr-or-stack>` when it is not tracked locally, then run `gh stack sync`. The command may rebase and lease-protected force-push every active layer before local validation, so immediately inspect the rewritten scope, run the relevant checks for every affected layer, and do not merge or claim readiness until they pass. If sync detects a rebase conflict, use `gh stack rebase`, resolve and validate it, then publish with `gh stack push`. If checkout or sync reports divergent local and remote stack compositions, cancel and ask rather than deleting or recreating the remote stack automatically.
- **Incremental merge-forward.** Merge the trunk into the bottom affected branch, then propagate each updated parent into its child in bottom-to-top order and push normally. If the base advances during an in-progress merge, preserve that checkpoint before merging the newer tip.

A history rewrite is allowed after review where the landing repository's instructions allow it, but it invalidates commit-OID assumptions. Re-fetch exact heads and re-audit unresolved review threads, approvals, mergeability and checks after the push. Never use raw `--force`, and never overwrite a concurrently advanced remote head. Read the landing repository's instructions before choosing a history; when they name no allowed history, ask the user or stop rather than choosing one on the repository's behalf.

## Preflight the merge range

Re-query the official stack immediately before merging. Require every selected PR to be open, non-draft, in the expected order, and compliant with the repository's review and check requirements. Read that compliance from the same metadata: a `mergeStateStatus` other than `CLEAN` (a still-computing `UNKNOWN` included) or a `reviewDecision` of `CHANGES_REQUESTED` is a blocker.

"Land the stack" selects the whole stack; a partial landing requires an explicit boundary PR and includes every layer from the bottom through that boundary. Treat each PR's state independently: a ready top layer does not prove its dependencies are ready.

The merge method is the landing repository's policy: pass the method its instructions prescribe or its GitHub merge settings name. When neither prescribes one, use `merge`.

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
- [ ] Any rewritten layer passed the relevant checks, and review threads, approvals, mergeability and checks were re-audited after the push.
- [ ] Re-querying the official stack before the merge finds every selected PR open, non-draft, in order, with `mergeStateStatus: CLEAN` and no changes-requested review.
- [ ] The whole stack, or the explicitly bounded prefix, was merged through `gh stack merge` with the landing repository's method; no per-PR merge command was used.
- [ ] Every selected PR reports `MERGED`; after a partial landing, the remaining layers form the expected official stack.
- [ ] Branch deletion happened only in the final pass, after merged-state and zero-dependent verification.
