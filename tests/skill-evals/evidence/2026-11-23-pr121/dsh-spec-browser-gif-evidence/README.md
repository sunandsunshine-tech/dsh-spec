# Browser GIF evidence: PR 121

> **Historical status:** this run used the pre-final fixture and is retained as provenance only.
> Current same-run evidence is under
> `tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-browser-gif-evidence/real-ui-change-uses-one-isolated-run/`.

This run executes `real-ui-change-uses-one-isolated-run` through the isolated runner with
`--sandbox workspace-write --replace`. The target `SKILL.md` SHA-256 is
`ddbc40b91ce7f5d8dfab90ffd1e26e59105cdcf69b4bdaef8fc2b2fc24f7a4c2`; the canonical scenario
SHA-256 is `ded49e2d0fd766f608cba965037a99f1fe4c66cbef99f59f72a7aa6f693d86fa`.
All four files in `candidate-real/skill-hashes.txt` match the complete source skill at run time.

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-browser-gif-evidence \
  --scenario real-ui-change-uses-one-isolated-run \
  --output tests/skill-evals/evidence/2026-11-23-pr121/dsh-spec-browser-gif-evidence/candidate-real \
  --sandbox workspace-write \
  --replace
```

The candidate read the installed skill before inspecting the fixture, then followed both sets of
instructions. The run completed in 62.78 seconds with exit code 0. It used no BrowserSkill access.

## Result

| Assertion | Result |
|---|---:|
| One isolated real-build run | 4/4 pass |

`candidate-real/status.txt` records `status: pass` and `assertions: 4/4`.

The real `npm run build` succeeded in the isolated fixture checkout. One `npm run evidence`
invocation then launched one headless Chrome process and one page target through a fresh temporary
browser profile.

The run served the build at `http://127.0.0.1:44901` from a real local Node server. Only the local
`/save` endpoint participated; no external provider was used. The server and browser were stopped,
and the recorded origin no longer responded after capture.

| State | Status text | Button | Disabled |
|---|---|---|---:|
| Initial | `Unsaved changes` | `Save changes` | false |
| Saving | `Saving changes` | `Saving…` | true |
| Saved | `Changes saved` | `Save changes` | false |

The bundled encoder produced `settings-save-flow.gif` from the three PNG captures with durations of
1.5, 1.5 and 3.5 seconds. The direct encode completed on its first invocation with exit code 0 and
created the requested output. No preload, wrapper, or failed encode attempt is present in the trace.
`ffprobe` independently reports GIF codec, 720×480 dimensions, 65 frames, 10 fps, 6.5 seconds and
37,449 bytes. The GIF SHA-256 is
`28192f147ec650ff1a053ebad8e2d6d57d15f0c175c4f539d3d1a4753caee87b`.

`ffmpeg` decoded the GIF at 0.5, 2.5 and 5.5 seconds. Those frames match the retained PNG states:
enabled “Save changes” with “Unsaved changes”, disabled “Saving…” with “Saving changes”, then enabled
“Save changes” with “Changes saved”. The text is legible and the evidence contains no sensitive
content. The decoded QA frames were temporary and are not part of the declared artifact set.

The candidate produced no separate media-viewer event in its trace. The grading step therefore
decoded the retained GIF again and visually inspected the encoded initial, saving and saved frames. That
reviewer-side inspection, together with the retained source PNGs and `ffprobe` metadata, verifies
the encoded sequence and supports the third assertion. The trace invokes the capture with
`TMPDIR="$PWD/evidence-local"`, so the temporary browser profile stayed inside the project's ignored
evidence directory and was removed after capture.

## Retained evidence

`candidate-real/artifacts.sha256` covers the three source PNGs, `capture-report.json` and the GIF.
Every manifest hash matches its retained file. `changed-paths.txt` is empty because the build and
all media remained under ignored paths. The fixture's `git status --short` was clean, and
`git check-ignore` confirms the media paths are ignored.

## Evidence layout

- `candidate-real/final.md`: model report.
- `candidate-real/trace.jsonl`: raw `codex exec --json` stream.
- `candidate-real/assertions.txt` and `status.txt`: assertion-level grading.
- `candidate-real/input-manifest.sha256`: hashes of the declared scenario inputs.
- `candidate-real/skill-hashes.txt`: hashes of the complete staged skill tree.
- `candidate-real/scenario-definition.sha256` and `scenario-definition.json`: retained scenario.
- `candidate-real/artifact/`: the five retained declared outputs.
- `candidate-real/artifacts.sha256`: hashes of all retained artifacts.
- `candidate-real/changed-paths.txt`: empty because all generated outputs were ignored.
