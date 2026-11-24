# AI involvement

- breakdown: pair, 40%. The author identified the retry-cap scope and required the telemetry boundary; the AI traced the affected client paths.
- design: assist, 20%. The author supplied the option name, the three-attempt maximum, and the decision to retry only idempotent methods; the AI filled in the mechanism.
- testing: pair, 35%. The author required idempotent-only and retry-limit cases; the AI wrote the cases.
- implementation: pair, 40%. The AI wrote the code and tests; the author required one rework to keep non-retryable responses out of the retry path.
- review: n/a. No review comments have been handled.
