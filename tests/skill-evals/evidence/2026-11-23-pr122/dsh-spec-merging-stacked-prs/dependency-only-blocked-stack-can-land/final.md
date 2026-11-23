The official stack is ready to merge. `#201` is `CLEAN`; `#202` and `#203` are `BLOCKED` only by their unmerged parents, which the [landing policy](/workspace/evals/files/preflight-policy/AGENTS.md) explicitly permits. All three are open, non-draft, approved, and have green required checks, with no failed checks, requested changes, conflicts, or updating state reported.

Next action: perform one native merge of the entire `#201`–`#203` stack after an immediate live preflight:

```sh
gh stack merge <stack-number> --yes --squash
```

Use the repository’s sole allowed method instead if its GitHub settings expose exactly one. Do not merge or retarget the PRs individually. No GitHub state was changed.