# Stack preflight

The official stack contains these open, non-draft PRs in order:

1. `#201` targets `main`, has `mergeStateStatus: CLEAN`, green required checks and an approval.
2. `#202` targets `#201`'s branch, has `mergeStateStatus: BLOCKED`, green required checks and an approval.
3. `#203` targets `#202`'s branch, has `mergeStateStatus: BLOCKED`, green required checks and an approval.

No PR has requested changes or a failed required check. The repository permits native stack landing.
