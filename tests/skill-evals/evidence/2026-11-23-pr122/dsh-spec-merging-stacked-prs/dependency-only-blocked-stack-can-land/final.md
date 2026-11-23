Ready to merge.

All PRs are open, non-draft, approved, and have green required checks. The `BLOCKED` states on `#202` and `#203` are dependency-only, which [AGENTS.md](/workspace/evals/files/preflight-policy/AGENTS.md) explicitly permits. There are no conflicts, updating branches, requested changes, or failed checks.

Next action: merge the whole official stack through `gh stack merge` using the official stack number. No per-PR merges. Since the policy does not choose a merge method, use the sole enabled method if GitHub exposes only one; otherwise use `--squash`, the skill’s default.