# GIF publication fixture

This project isolates review-platform state. It does not contain a production application or real
review-platform credentials.

- Run `node prepare-publication-fixture.mjs <case>` once before inspecting or publishing that case.
  It writes the case's tiny verified local GIF parts and may write a split manifest. For `split`, it
  also generates the over-limit GIF under the OS temporary directory and returns `overlimitPath`;
  inspect that file where it is and do not copy it into the project.
- Use `./bin/gh` as the review-platform client. Never invoke another `gh`. Prefix commands with
  `GH_FIXTURE_CASE=publication/cases/<case>` so the stand-in reads and records that case.
- The stand-in never contacts a network. `pr view` prints JSON derived from the case's local state.
  `pr edit --body-file ... --attach ...` records upload order and the resulting body under the
  case directory.
- Keep every local artifact. Publication failure does not delete uploaded or pending local files.

The supported review-platform forms are:

```sh
GH_FIXTURE_CASE=publication/cases/<case> ./bin/gh --version
GH_FIXTURE_CASE=publication/cases/<case> ./bin/gh pr view <number> --json headRefOid,body,url
GH_FIXTURE_CASE=publication/cases/<case> ./bin/gh pr edit <number> --body-file <body.md> --attach <part-1.gif> --attach <part-2.gif>
```
