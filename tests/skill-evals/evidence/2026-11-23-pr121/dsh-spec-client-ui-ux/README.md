# dsh-spec-client-ui-ux evidence

Candidate skill: `skills/dsh-spec-client-ui-ux/SKILL.md`.
Model: host-configured Codex model; Codex CLI 0.171.0-alpha.13.

## Method

Both final reruns used the isolated model runner in read-only mode. For each run, the runner created
a fresh project, installed the complete skill under `.agents/skills/dsh-spec-client-ui-ux`, copied
only the scenario's declared fixture files, and mounted the workspace through `bwrap`. The command
shape was:

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-client-ui-ux \
  --scenario <scenario-id> \
  --output <scenario-evidence-directory> \
  --sandbox workspace-write \
  --replace
```

The shared-widget run read `/workspace/.agents/skills/dsh-spec-client-ui-ux/SKILL.md` before
reviewing the fixture. Its prompt prohibited launching another browser; no browser, BrowserSkill or
`bsk` invocation occurred. The review decoded and inspected every GIF frame from the supplied
recording.

The responsive-draft run used the same isolated runner and read the installed target skill before
reviewing the form source. The fixture had no browser bootstrap, browser binary, package test
command, or test files, so the review reported the missing rendered evidence rather than inferring
visual acceptance from source.

## Responsive rule applicability

The shared-widget scenario has no viewport or pointer-mode transition while an in-progress draft
exists, so the draft-preservation rule is not exercised as a separate assertion. Its supplied
recording also has no simulated coarse-pointer input state. The search field inherits the fixture's
16 CSS pixel root size, but the field is not an affected state of the shared-button change, so the
coarse-pointer floor was checked for applicability and not turned into an invented scenario
assertion.

The responsive-draft scenario exercises both rules. Replacing the form markup at the layout
transition would discard the in-progress value, and the 14px input size is below the 16px
coarse-pointer floor that applies when the project declares no input-size rule.

## Result

| Scenario | Result |
|---|---:|
| Shared widget: consumers, rendered states, gaps | 5/5 |
| Responsive draft and touch input | 4/4 |

The shared-widget review identified `SearchPage` and `SettingsPage` as the current consumers,
inspected the assembled states present in the recording, separated rendered evidence from source
and markup-test claims, named the remaining state gaps, rejected the simulated focus treatment,
and labelled `variant=before` as a controlled comparison rather than historical provenance. It ran
the fixture's markup test and still treated that result as non-rendered evidence. The trace also
contains one rejected command that attempted to remove a temporary review directory; the model
recovered with non-destructive file deletion and the run completed successfully.

The responsive-draft review identified draft and focus loss from the `root.innerHTML` replacement,
recommended mutating the existing layout class, and raised only coarse-pointer input text to 16px.
It named the unverified wide, narrow, transition, focused-input, and coarse-pointer states and
reported that no rendered evidence was captured. It did not treat its source corrections as
rendered acceptance.

There are no failed scenario assertions.

## Evidence layout

Each scenario directory contains:

- `final.md`: the final review.
- `assertions.txt`: the scenario's canonical assertions and grades.
- `assertions.expected.txt`: the canonical passing text emitted by the runner.
- `trace.jsonl`: the raw isolated `codex exec --json` event stream.
- `scenario-definition.json` and `scenario-definition.sha256`: the exact scenario used.
- `input-manifest.sha256`: declared scenario inputs and their hashes.
- `skill-hashes.txt`: hashes for every installed skill file, including the target `SKILL.md`.
- `changed-paths.txt`, `patch.diff` and `artifacts.sha256`: retained and empty because the reviews
  changed no project files.
- `status.txt`, `time.txt` and `usage.txt`: grading, timing and token usage.
- `stderr.log`: runner diagnostics.

The full skill hashes and input and scenario hashes identify the exact revision exercised. This
evidence applies to the named scenario behavior at that revision, not to later unrelated edits.
