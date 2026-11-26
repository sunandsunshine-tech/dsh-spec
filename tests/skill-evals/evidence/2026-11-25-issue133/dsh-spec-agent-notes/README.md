# Agent Notes proposal-first model evidence

These three current behavior runs use the final `dsh-spec-agent-notes` revision and the merged
evidence-policy runner. Each run retains typed `evidence.json` currentness and provenance, its exact
scenario and input manifests, capability and execution profiles, trace, final response, patch and
graded assertions.

| Scenario | Result | Behavior |
|:--|--:|:--|
| `proposal-first-issue-links-active-note` | 5/5 | Rejects the branch-local draft as authority, creates one proposed design owner, links the issue and note both ways, and preserves the work-record reintroduction threshold. |
| `proposal-unavailable-hands-off-inventory` | 4/4 | Leaves the project unchanged and hands off the missing target-branch inventory and execution tracker. |
| `proposal-checkpoint-keeps-partial-moves-complete` | 5/5 | Keeps the partial export proposal in `proposed/`, moves the complete retention unit and companions to `implemented/`, updates both tracker links, and preserves project-root-relative pair records. |

The runs were produced with:

```sh
node tests/skill-evals/run-model-eval.mjs --skill dsh-spec-agent-notes --scenario proposal-first-issue-links-active-note --output tests/skill-evals/evidence/2026-11-25-issue133/dsh-spec-agent-notes/proposal-first-issue-links-active-note --sandbox workspace-write --arm target-present --replace
node tests/skill-evals/run-model-eval.mjs --skill dsh-spec-agent-notes --scenario proposal-unavailable-hands-off-inventory --output tests/skill-evals/evidence/2026-11-25-issue133/dsh-spec-agent-notes/proposal-unavailable-hands-off-inventory --sandbox workspace-write --arm target-present --replace
node tests/skill-evals/run-model-eval.mjs --skill dsh-spec-agent-notes --scenario proposal-checkpoint-keeps-partial-moves-complete --output tests/skill-evals/evidence/2026-11-25-issue133/dsh-spec-agent-notes/proposal-checkpoint-keeps-partial-moves-complete --sandbox workspace-write --arm target-present --replace
```

The initial checkpoint attempts exposed fixture defects: restart persistence was process-local, and
the scenario did not install the translation mechanism needed to maintain its bilingual unit. The
fixture now uses file-backed persistence, proves resume in a second process, and the scenario installs
`dsh-spec-translate-docs`. The retained checkpoint run is the graded rerun after those input fixes.

After #162 changed the activation wording in `dsh-spec-translate-docs`, only the checkpoint scenario
was rerun because it installs that dependency skill. The two target-only runs retained the same
scenario, input, target-skill and dependency-tree digests, so their evidence remained current.

The current checkpoint scenario declares `evals/files/checkpoint` as its project root. The runner
stages and commits that directory as `/workspace`; the committed terminology table and bilingual
records are available before the run. The retained consistency records therefore carry
project-relative write paths and replay from the same root. Both bilingual bodies are already
current, so the checkpoint changes only lifecycle status and heading tokens; the test compares both
counterparts against that mechanical transform and rejects translation, briefing, subagent or
terminology activity.
