Audited and fixed [README.md](/workspace/evals/files/leakage-keeps/README.md). Removed the change storyline, branch/review history, duplicate label-processing walkthrough, and future wrapper-removal plan.

Retained durable facts:

- Issue `#1470` as the follow-up reference.
- The manifest-depth cap covers the complete rendered value, including wrappers.
- Without the byte-length guard, multibyte labels double-encode.
- The depth cap is 512 nested objects; 4096 blocks the event loop.
- Measured evidence: 512 nests take approximately 0.15 seconds.
- During connection handover, the old connection drains before the new one accepts.
- Badges use the generic projection pair.
- Resolved specs are not cached.
- Labels are normalized, truncated, and wrapped in that order.

The leakage probe now only matches the runtime “old/new connection” language, which is a documented behavior keep. `git diff --check` passed, and the diff contains only this README. No exclusions or deferred cases.