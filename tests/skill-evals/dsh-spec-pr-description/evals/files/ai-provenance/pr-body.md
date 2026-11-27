# Bound log retries

## Motivation

Prevent an unbounded retry loop when log writes keep failing.

Fixes #41.

## Changes

**Interface changes**

`LogWriterOptions.maxAttempts` accepts `1 | 2 | 3` and defaults to `3`.

**Behavior changes**

Failed transient writes retry within the cap; failed committed writes do not
retry.

## Testing

**Test design**

The cases cover each retry cap and distinguish a committed failure from a
transient failure.

**Test entries**

`npm test` passed two tests locally.

## AI Usage

<!-- ai-declaration:start -->
[![AI-DECLARATION: pair](https://img.shields.io/badge/䷼%20AI--DECLARATION-pair-ffedd5?labelColor=ffedd5)](https://ai-declaration.md)

**AI declaration** ([v0.1.2](https://ai-declaration.md/en/0.1.2)): `pair`
<!-- ai-declaration:end -->

| Stage | Level | AI involvement | Decision record |
|:--|:--|--:|:--|
| breakdown | assist | 20% | The author selected the retry-cap problem and scope; the AI traced the affected paths. |
| design | pair | 40% | The author supplied the retry limit and committed-failure boundary; the AI wrote the mechanism. |
| testing | pair | 40% | The author required the cap and committed-failure scenarios; the AI wrote the cases. |
| implementation | pair | 40% | The AI wrote the implementation and tests; the author reviewed the change. |
| review | pair | 40% | The author decided the reviewer's committed-failure finding; the AI fixed it. |
