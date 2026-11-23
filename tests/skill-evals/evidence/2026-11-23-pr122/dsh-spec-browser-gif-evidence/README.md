# PR #122 browser GIF evidence

This directory records the absent-capability profile for the current
`dsh-spec-browser-gif-evidence` skill tree.

The scenario declared `capabilities.browser: false` and `capabilities.media: false`. The runner
therefore omitted the Chromium mount and the ffmpeg directory and PATH entry. In the isolated
project, `command -v` found Node.js and Git but neither `ffmpeg`, `ffprobe`, nor a browser driver.

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-browser-gif-evidence \
  --scenario missing-capture-capability-hands-off \
  --output tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-browser-gif-evidence/missing-capture-capability-hands-off \
  --sandbox workspace-write \
  --replace
```

| Scenario | Assertions | Status | Time |
|---|---:|---|---:|
| `missing-capture-capability-hands-off` | 4/4 | pass | 20.49 s |

The response names the missing browser and media capabilities, refuses to substitute source
inspection for rendered evidence, preserves the UI change, and provides a resumable evidence step.

The retained scenario hash is
`ea2abfb75b96a22ac165adb8f5505ce270291c423e053500379e266d33becb5a`. The complete current skill
manifest is:

```text
ddbc40b91ce7f5d8dfab90ffd1e26e59105cdcf69b4bdaef8fc2b2fc24f7a4c2  skills/dsh-spec-browser-gif-evidence/SKILL.md
89a158693904616dd1b86eb5d3ba6081a5f9e36436cb5b8a72fdc190c5e75552  skills/dsh-spec-browser-gif-evidence/THIRD_PARTY_NOTICES
f55530d6c7b58ec9c9dc8a6d865bb817d33d49e385466462292cc8d984a55642  skills/dsh-spec-browser-gif-evidence/references/publication.md
b54cd4b536e863b6ed643ca76159fdddca6e22461ebf3491186a1d1913225417  skills/dsh-spec-browser-gif-evidence/scripts/encode-browser-gif.mjs
```

Its aggregate SHA-256, without a trailing newline, is
`2d12c22318ef1368413ac188f5d62838d3c3aa39253f14e84c0dce26d97e218b`. The trace has one
completed turn and 8 completed command records, remains answer-blind, and produced no project changes.
