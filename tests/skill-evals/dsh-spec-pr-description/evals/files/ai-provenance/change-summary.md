# Bound log retries

- Interface change: `LogWriterOptions.maxAttempts` accepts `1 | 2 | 3` and
  defaults to `3`.
- Behavior change: failed transient writes retry within the cap; failed
  committed writes do not retry.
- Test evidence: `npm test` passed two tests locally.
