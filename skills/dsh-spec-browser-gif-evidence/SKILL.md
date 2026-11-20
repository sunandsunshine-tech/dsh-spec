---
name: dsh-spec-browser-gif-evidence
description: "Record and verify browser-interaction GIF evidence for user-visible UI changes from one isolated run of the adopter's real build. Use for GIF requests or required UI-change evidence; hand off when browser, media, or runtime capability is unavailable. 用于记录并验证用户可见浏览器 UI 变更的交互 GIF 证据；使用真实构建和单一隔离运行。用户要求录屏、生成 GIF 或项目需要 UI 变更证据时使用；浏览器、媒体或运行环境不可用时明确交接。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
compatibility: "Requires Python 3, ffmpeg, ffprobe, a runnable build, and a browser-control capability or a project-declared Playwright setup. GitHub attachment also requires gh on github.com with write access."
---

# Browser GIF evidence

Produce one truthful GIF from one isolated run of the changed build. This skill owns capture, encoding, verification and optional publication. Whether the UI is acceptable is a separate judgment.

## Default

When a change alters user-visible browser UI behavior, generate and verify GIF evidence by default. When the task also creates or updates a pull request, attach the verified GIF there. Without a pull-request task, keep the evidence local.

The project's explicit instructions may select equivalent evidence or waive the default for a named change. A fixture recording is allowed only when the user explicitly asks for one.

Do not claim completion when the build, browser, real scenario, media tools or publication facility needed by the requested evidence is unavailable. Preserve completed work and hand off the missing capability, unfinished evidence and next step.

## Establish evidence scope

- Identify the exact commit and tree that will be demonstrated. A clean working tree is preferred; otherwise record every uncommitted path included in the build.
- Read the project's build, start, browser-control, evidence-directory and publication instructions. Missing instructions permit a working default, not an invented project mechanism.
- Use one isolated application run: fresh application state, workspace, session data and browser storage. Existing user browser state is an explicit exception, not an invisible default.
- Keep every frame and artifact from one run. If capture fails, discard the run and start again; never splice a newer outcome into an older capture.
- Use a short story of three to six meaningful states. Wait on semantic page state rather than fixed sleeps; a fixed wait may hold a verified frame for reading, but cannot establish readiness.
- State whether the run used the real product path and real external services, a fixture, a mock or another substitute. Never expose credentials, personal data, unrelated tabs or notifications.

## Capture

Use the project's browser-control capability first. When continuous video is available, record video in the same browser context that exercises the application. When only screenshots are available or the user requests a storyboard, capture verified states from one isolated run in a stable filename order.

When browser control is unavailable and the project declares an isolated Playwright fallback, use that declaration rather than installing another driver. Match `viewport` and recorded-video dimensions explicitly so text is not scaled down silently. Retain the page video handle before closing the context and await the context close before saving or encoding the video.

Store raw video, screenshots, capture notes and QA frames in a project-declared ignored path. When the project declares none, use a fresh temporary directory outside the tracked tree and report its path. Do not commit evidence media to a branch.

## Encode

The bundled encoder requires Python 3, `ffmpeg` and `ffprobe`. It refuses to install missing media tools.

```sh
python3 scripts/encode_gif.py \
  /absolute/path/to/demo.webm \
  /absolute/path/to/demo.gif \
  --start 2 --end 32 --speed 2 --final-hold 3
```

Video flags select one continuous interval. For a screenshot directory, use `--pattern` and `--durations` instead:

```sh
python3 scripts/encode_gif.py \
  /absolute/path/to/frames \
  /absolute/path/to/demo.gif \
  --pattern '*.png' \
  --durations 1.5,1.5,1.5,3.5
```

Read the JSON summary. Shrink `--max-width` first, then `--colors` or `--fps`, when the artifact exceeds the default 5 MiB limit. Disclose any trimming, speed change or final hold beside the published evidence.

Encoder maintenance uses `scripts/test_encode_gif.py`:

```sh
python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

These tests require the same media binaries as the encoder and skip when either binary is absent.

## Verify

1. Confirm the encoded path, interval or screenshot count, speed, frame count, dimensions, duration and byte size from the encoder summary.
2. Inspect the encoded GIF itself. If the viewer shows only its first frame, decode representative frames with `ffmpeg`.
3. Confirm that the sequence shows the intended cause and outcome, remains legible and contains no sensitive data.
4. Run `git status --short` and confirm raw media and the GIF lie only under ignored or untracked evidence paths.
5. State whether the evidence is real, fixture-based or otherwise substituted.

## Publish

Publication occurs only when the task includes creating or updating a pull request. Read [the publication contract](references/publication.md) before attaching evidence.

Immediately before publication, re-read the demonstrated pull request's live head and compare it with the commit recorded for the evidence. Re-record when the head moved.

## Completion

Evidence is complete when one verified GIF exists, its run and source are identified, its content is legible and safe, and every publication step requested by the task has succeeded. Otherwise report the exact missing capability or artifact and the resumable next step.
