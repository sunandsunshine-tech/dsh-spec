# PR #121 Agent Notes evidence

This directory records three clean-context behavior runs against the consolidated Agent Notes
entry.

## Method

Each scenario was rerun with the isolated runner:

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-agent-notes \
  --scenario <scenario> \
  --output <result-directory> \
  --sandbox workspace-write \
  --replace
```

The runner stages the declared fixture, installs the current `dsh-spec-agent-notes` tree, commits the
fixture, and invokes Codex inside OS-level Bubblewrap isolation. Only the staged project is mounted at
`/workspace`; the source repository and scenario answer manifest are hidden. The trace is checked so
the run cannot read `evals/evals.json`, `tests/skill-evals`, or `expected_output`. BrowserSkill was not
used. All three runs recorded the current `dsh-spec-agent-notes` tree, whose `SKILL.md` hash is
`5366ac18eb7e83fde3e7a762094f251bd0595c67b1965ef9fe4f8dcfa308d6b2` and whose
`references/notes-contract.md` hash is
`66446353c218136fd279b98e1abc9ca774b014486ffaae1c718c555d48f4fe5c`.

Each result retains the final response, JSON trace, input manifest, scenario-definition hash, full
installed-skill hashes, patch, retained artifacts, changed paths and timing. Assertions are graded from
the produced files and trace, not from the final response alone.

## Results

| Scenario | Result | Evidence |
|---|---:|---|
| `no-peer-uses-user-language` | PASS 4/4 | Japanese was selected from the primary agent's user language, not from the Chinese CLI default. The English source note was completed without a translation companion. The handoff names the pending Japanese member, the unavailable working separation and the resumable translation context. |
| `archive-readiness-required` | PASS 4/4 | Seal preparation wrote no manifest. The required readiness command exited 1, left the candidate unsealed and preserved the manifest bytes. The handoff names the failed step and the safe `archive --prepare` then `archive --write` recovery. |
| `external-companion-mechanism` | PASS 4/4 | The note and nested, different-stem review sidecar form one unit. The active-tree check passed with the exact `--member` path mapping. No Translate Docs skill, translation companion or aggregate pairing record was introduced. |

Current total: 12/12 assertions pass.

The scenario id in each directory is the behavior id. Later edits invalidate only the behavior they change.
