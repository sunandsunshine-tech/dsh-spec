# Browser GIF publication fixture

The fixture is a local replacement for the review platform. It is used with the
`dsh-spec-record-browser-gif` model scenarios to verify publication decisions, split ordering,
remote-body state and fail-closed handling without uploading media or contacting GitHub.

`prepare-publication-fixture.mjs` materializes tiny verified GIF parts and, for `split`, a temporary
over-limit GIF outside the project. `bin/gh` implements the narrow `--version`, `pr view` and
`pr edit` surface used by the skill. It writes only under the selected case directory. The case
state is an input; invocation and remote-state files are outputs.
