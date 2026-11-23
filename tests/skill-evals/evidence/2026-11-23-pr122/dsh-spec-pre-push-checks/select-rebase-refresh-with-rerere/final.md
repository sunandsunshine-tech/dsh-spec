Use a **rebase refresh**, not merge-forward:

```sh
git status --short --branch
git config rerere.enabled true
git config --unset-all rerere.autoUpdate  # only if currently set
# Verify the live stack order and record all three remote-head OIDs.
gh stack sync
```

`gh stack sync` rewrites and publishes in one operation, so validation follows publication. Replayed `rerere` resolutions must be inspected and staged manually.

After sync, run this sequence:

1. Re-query the published stack order and all three remote heads; verify each local head matches its remote.
2. For each layer, bottom to top, inspect only its outgoing diff against its live parent/trunk base:

   ```sh
   node .agents/skills/dsh-spec-pre-push-checks/scripts/change-scope.mjs \
     --base <verified-live-base> \
     --head <rewritten-layer-head>
   ```

3. Run the narrowest owning test for each affected layer. Add adjacent tests only for shared contracts. Add typecheck, build/package smoke, documentation checks, browser evidence, or generated-output checks only when that branch’s paths reach those surfaces. Do not run the full suite merely because this is a refresh.
4. Re-audit unresolved review threads, approvals, mergeability, and CI checks because every commit hash changed. Keep all three PRs unmerged until every selected check passes.

The current fixture contains only the base checkout and has no stack branches, remotes, or project test scripts, so concrete per-layer test names cannot be selected here.