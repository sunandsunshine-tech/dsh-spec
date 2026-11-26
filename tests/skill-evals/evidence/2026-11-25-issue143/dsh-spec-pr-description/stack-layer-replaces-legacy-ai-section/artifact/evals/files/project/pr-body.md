# Cap idempotent HTTP retries at three attempts

## Motivation

Idempotent HTTP requests could exceed the intended retry limit. No issue tracker applies because this project declares none.

## Changes

**Interface changes**

- `HttpClientOptions.maxAttempts` accepts `1 | 2 | 3` and defaults to `3`.

**Behavior changes**

- Only idempotent `GET` and `HEAD` requests retry. The client returns a non-retryable response without another attempt, and `maxAttempts` caps total attempts at three by default.
- **Retry boundary:** The author set three as the maximum and limited retries to idempotent methods so the retry path cannot replay non-idempotent requests.

**Module responsibilities and dependencies**

None.

## Testing

**Test design**

| Scenario | Behavior before | Behavior after | Covering test |
|:--|:--|:--|:--|
| `GET` returns `503` with `maxAttempts: 3` | The client can retry beyond the intended three-attempt cap. | The request stops after exactly three attempts. | `GET respects the configured attempt cap` |
| `POST` returns `503` with `maxAttempts: 3` | A non-idempotent request can enter the retry path. | The request makes one attempt. | `POST does not retry` |

**Test entries**

- **`GET respects the configured attempt cap`** — ran `npm test` locally; the test passed and verified the three-attempt cap.
  <details><summary>Proof</summary>

  `✔ GET respects the configured attempt cap`; `tests 2`, `pass 2`, `fail 0`.

  </details>
- **`POST does not retry`** — ran `npm test` locally; the test passed and verified that a non-idempotent request makes one attempt.
  <details><summary>Proof</summary>

  `✔ POST does not retry`; `tests 2`, `pass 2`, `fail 0`.

  </details>

## AI Usage

<!-- ai-declaration:start -->
[![AI-DECLARATION: pair](https://img.shields.io/badge/䷼%20AI--DECLARATION-pair-ffedd5?labelColor=ffedd5)](https://ai-declaration.md)

**AI declaration** ([v0.1.2](https://ai-declaration.md/en/0.1.2)): `pair`
<!-- ai-declaration:end -->

| Stage | Level | AI involvement | Decision record |
|:--|:--|--:|:--|
| breakdown | pair | 40% | The author identified the retry-cap scope and set the layer boundary; the AI traced the affected client paths. |
| design | assist | 20% | The author supplied the option name, the three-attempt maximum, and the decision to retry only idempotent methods; the AI filled in the mechanism. |
| testing | pair | 35% | The author required idempotent-only and retry-limit cases; the AI wrote the cases. |
| implementation | pair | 40% | The AI wrote the code and tests; the author required one rework to keep non-retryable responses out of the retry path. |
| review | n/a | — |  |

No review comments have been handled yet.
