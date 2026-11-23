---
name: dsh-spec-browser-gif-evidence
description: "Record and verify browser-interaction GIF evidence for user-visible UI changes from one isolated run of the adopter's real build. Use for a browser interaction recording or required UI-change evidence; not for generic image animation, format conversion, or static visual review. Hand off when browser, media, or runtime capability is unavailable. 用于记录并验证用户可见浏览器 UI 变更的交互 GIF 证据；使用真实构建和单一隔离运行。仅用于浏览器交互录制或所需的 UI 变更证据，不用于普通图片动画、格式转换或静态视觉审查；浏览器、媒体或运行环境不可用时明确交接。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
compatibility: "Requires Node.js 24.11+ on the 24 line or 26+, Git, ffmpeg, ffprobe, a runnable build, and a browser-control capability or a project-declared Playwright setup. GitHub attachment also requires gh on github.com with write access."
---

# Browser GIF evidence

Produce one truthful GIF from one isolated run of the changed build. This skill owns capture, encoding, verification and optional publication. Whether the UI is acceptable is a separate judgment.

## Default

When a change alters user-visible browser UI behavior, generate and verify GIF evidence by default. When the task also creates or updates a pull request, attach the verified GIF there. Without a pull-request task, keep the evidence local.

The project's explicit instructions may select equivalent evidence or waive the default for a named change. A fixture recording is allowed only when the user explicitly requests it or the project's evidence policy selects that form. Do not use a mock transport, synthetic interaction, or test-only hook unless the user or project policy explicitly requires that substitute.

Do not claim completion when the build, browser, real scenario, media tools or publication facility needed by the requested evidence is unavailable. Preserve completed work and hand off the missing capability, unfinished evidence and next step.

## Establish evidence scope

- Identify the exact commit and tree that will be demonstrated. A clean working tree is preferred; otherwise record every uncommitted path included in the build.
- Record the application origin, transport and any mode override or browser-state exception.
- Read the project's build, start, browser-control, evidence-directory and publication instructions. Missing instructions permit a working default, not an invented project mechanism.
- Use one isolated application run: fresh application state, workspace, session data and browser storage. Existing user browser state is an explicit exception, not an invisible default.
- Keep every frame and artifact from one run. If capture fails, discard the run and start again; never splice a newer outcome into an older capture.
- Use one demonstrated page and a short story of three to six meaningful states. Wait on semantic page state rather than fixed sleeps; a fixed wait may hold a verified frame for reading, but cannot establish readiness.
- Preserve animations and scrolling that carry the demonstrated state, and review the complete selected interval including intermediate states.
- When demonstrating a tool call, rejection or recovery, expose the tool identity, status or stable error code, downstream result and any transient running state that carries the behavior.
- State whether the run used the real product path and real external services, a fixture, a mock or another substitute. Never read or expose credential values, personal data, unrelated tabs or notifications.

## Capture

Use the project's browser-control capability first. When continuous video is available, record video in the same browser context that exercises the application. When only screenshots are available or the user requests a storyboard, capture verified states from one isolated run in a stable filename order.

When browser control is unavailable and the project declares an isolated Playwright fallback, use that declaration rather than installing another driver. Match `viewport` and recorded-video dimensions explicitly so text is not scaled down silently. Retain the page video handle before closing the context and await the context close before saving or encoding the video.

Store raw video, screenshots, capture notes and QA frames in a project-declared ignored path. When the project declares none, use a fresh temporary directory outside the tracked tree and report its path. Do not commit evidence media to a branch.

Close browser contexts, stop servers started for the run and remove transient browser profiles on both success and failure. Stop a server by its recorded PID or an exact command-line match; a broad `pkill -f` pattern can match and kill the shell that launched it. Keep the captured evidence and report the first incomplete cleanup step.

## Encode

The bundled Node encoder requires `ffmpeg` and `ffprobe`. It refuses to install missing media tools.

```sh
export SKILL_DIR=/absolute/path/to/this/skill
node "$SKILL_DIR/scripts/encode-browser-gif.mjs" \
  /absolute/path/to/demo.webm \
  /absolute/path/to/demo.gif \
  --start 2 --end 32 --speed 2 --final-hold 3
```

Video flags select one continuous interval. Choose `--start` and `--end` from observed source-video times, not guessed wall-clock offsets. For a screenshot directory, use `--pattern` to match filenames with `*` or `?`, then use `--durations`:

```sh
node "$SKILL_DIR/scripts/encode-browser-gif.mjs" \
  /absolute/path/to/frames \
  /absolute/path/to/demo.gif \
  --pattern '*.png' \
  --durations 1.5,1.5,1.5,3.5
```

Read the JSON summary. Shrink `--max-width` first, then `--colors` or `--fps`, when the artifact exceeds the default 5 MiB limit. Disclose any trimming, speed change or final hold beside the published evidence. The encoder writes and verifies a temporary GIF before moving it into place. `--force` replaces an existing output only after encoding and validation succeed; a failed run leaves the previous output unchanged.

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
