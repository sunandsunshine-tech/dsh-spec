# Publishing GIF evidence

Use this contract only when the task includes publishing evidence to a change request. Capture and encoding remain local until this step.

## Require a publication mechanism

Read the project's declaration for its review platform and attachment mechanism. The project owns the command, authentication requirements, supported hosting service and body format.

For a GitHub pull request, `gh --attach` is the working example. Run `gh --version` before relying on it. Attachment requires `gh` 2.99.0 or later, a repository on `github.com` and write access; GitHub Enterprise Server is not supported. When the installed client does not support attachment, keep the verified local GIF and report the requirement without installing or upgrading the client.

Do not publish by committing the GIF or another media file to a branch.

## Keep the demonstrated head fixed

1. Record the demonstrated commit and tree from the clean capture worktree. When creating a pull request, record the branch tip that will be pushed.
2. Immediately before attachment, re-read the pull request's live head.
3. Stop and re-record when the live head differs from the recorded commit or uncommitted branch tip.

For evidence produced from a tooling change that demonstrates another pull request, identify that source pull request beside the embed and perform the same live-head check on the demonstrated request.

## Attach or split

Publish a GIF at or below the encoder's `--max-bytes` limit. When the artifact exceeds the limit at readable quality, split it into consecutive, non-overlapping parts from the same evidence run:

- For video, encode ordered intervals with separate `--start` and `--end` values.
- For screenshots, select consecutive subsets with `--pattern`.
- Verify every part independently and state its position and source interval or frame range beside the embed.

Write each local GIF as an ordinary Markdown image reference in the change-request body. Pass the same paths to the attachment command so the platform can replace each local reference with its uploaded URL while preserving order and alternate text.

Beside the embed, state the demonstrated commit, the tree and application origin that served it, any mode or browser-state exception, the real/local/substituted services, and whether a real model round ran. State the ordered part number and source interval or frame range when the evidence is split.

For GitHub, publish all parts in one create or edit invocation:

```sh
gh pr create --body-file <body.md> --attach <part-1.gif> --attach <part-2.gif>
gh pr edit <pull-request> --body-file <body.md> --attach <part-1.gif> --attach <part-2.gif>
```

The command is repeatable, but the same file cannot be attached twice.

A successful attachment command is not publication proof by itself. When an invocation fails
after uploading any part, report every uploaded part, every failed part, whether the body changed
and the exact remaining step. Keep every local artifact and do not describe the evidence as
published.

## Verify publication

After attachment:

1. Re-read the demonstrated pull request's live head and require it to equal the recorded commit.
2. Re-read the body and confirm every local GIF reference now resolves to the uploaded URL.
3. Render the body through the review platform's Markdown renderer and confirm every uploaded reference becomes the expected image element.
4. Fetch every uploaded URL and confirm a successful response and a GIF media type.
5. Report the pull request, demonstrated commit and artifact order beside the published embed.

Every uploaded part must have exactly one image reference in the body, in the same order as the
attachment paths. An uploaded part with no matching image reference fails publication even when the
attachment command exited successfully. When any publication check fails, leave the verified local
artifacts intact and report the failed operation and remaining step. Do not substitute a committed
branch asset.
