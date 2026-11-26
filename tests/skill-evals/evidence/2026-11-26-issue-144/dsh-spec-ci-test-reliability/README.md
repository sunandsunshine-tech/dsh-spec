# CI test-reliability evidence

This directory contains current typed model evidence for the #144 scope correction.

## Trigger selection

The [trigger matrix](trigger/trigger-matrix.tsv) records 4/4 expected selections and 4/4 expected near misses. Every run retained a final `SELECT:` marker, an unchanged workspace, typed trigger metadata, the current name/description surface and the complete trigger corpus identity.

```text
trigger surface: 72328dc29f5bc516aff27b3f36d8b44c360d18b393bf5f62f39457e5887bb479
trigger corpus:  3c7f5e2f149066d13093d5d3b557c6972f9e45a6b17059c43811b0a2d0fc4ba3
sandbox:         read-only
deadline:        1800000 ms
```

All eight runs use the same execution identity:

```text
auth:                  host-proxy
model config SHA-256:  81fe0a5e2d45e2a687f9ff2d811dd45cca60b986eeb96b994e9255e9eda70e1c
model runtime SHA-256: 63279cf1860a285495fa0bad3c40f5eb38c3487f7425adb603bcbd49175fcaf8
```

## Slow-suite behavior

The [slow-suite run](redesign-slow-repeated-suite/) passed all five scenario assertions. The artifact splits the fast production contract from one representative delayed integration run and keeps the integration entry on one Node test lane.

```text
scenario SHA-256:       83c629376a183462231e26b02e83dcf68b3d14d942707f1da4ad4487113f673e
input manifest SHA-256: 9494419840943d5c22f26faf0cb61226dbb84b6514ebfce7bba37bbd55ab6d07
skill tree SHA-256:     829c25ce726d4783e5ca3fc15fce518394f33ff4b8f1444c01d09bd74052500d
sandbox:                workspace-write
deadline:               1800000 ms
```

Replay the changed artifact over `tests/skill-evals/dsh-spec-ci-test-reliability/evals/files/slow-suite/`; `npm test` passes the contract and integration entries. The retained `evidence.json` binds the exact currentness selectors and privacy scope under the #156 policy.

The recorded privacy scope is portable: stable canary set/value identities are bound, while the current-home canary contributes only its set identity. Live scans still use the executing host's actual home path.

The runner deliberately does not retain the raw provider URL, token or provider name. No production-performance claim is made.
