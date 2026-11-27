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
[![AI-DECLARATION: auto](https://img.shields.io/badge/䷼%20AI--DECLARATION-auto-ede9fe?labelColor=ede9fe)](https://ai-declaration.md)

**AI declaration** ([v0.1.2](https://ai-declaration.md/en/0.1.2)): `auto`
<!-- ai-declaration:end -->

| Stage | Level | AI involvement | Decision record |
|:--|:--|--:|:--|
| breakdown | auto | 100% | The AI derived the issue scope and selected the bounded retry-cap problem. |
| design | auto | 100% | The AI selected the bounded retry-cap implementation; no human supplied design structure. |
| testing | auto | 100% | The AI chose the test matrix covering each retry cap and committed versus transient failures. |
| implementation | auto | 100% | The AI wrote the implementation and tests without human diff review. |
| review | auto | 100% | A review AI required no retry after a failed write; the authoring AI accepted the finding and added the regression test. |
