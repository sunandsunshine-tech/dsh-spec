# Task-Card Specification

The card is the contract between the Lead's plan and a member's work. It is the task's `description`, written at `team_task_create` and completed at `team_task_update`.

## 1. Fields

### Context and scope — the Lead

- **Objective** — the change the holder produces, in one sentence.
- **Workspace** — the directory the work and its commands run in; omit it for the shared checkout.
- **Base ref** — the ref the diff and the gate selection are measured against.
- **write_scopes** — the path prefixes the card expects to touch. Advisory: they diagnose overlap and never lock a file.
- **Decision record** — the note this delivery updates or creates, or `none`.
- **Depends on** — the task ids that must be completed first.
- **Max retries** — 2 by default.
- **Open decisions** — none at hand-off; filled when implementation raises one.

### Acceptance criteria — the Lead writes them, the Reviewer holds them

- **Verification command** — the one command the Worker and the Reviewer both run, copied unchanged into the review card.
- One criterion per line: a command with its expected exit, or a statement verifiable by inspecting a named file.

### Execution evidence — the Worker

- **Summary** — what changed, in two or three sentences.
- **Command run** — the exact command, copied.
- **Output** — the exact text it printed, in a fenced block.
- **Diff summary** — the files touched, with the reason for each.

### Review verdict — the Reviewer

- **Verdict** — `PASS` or `REJECT`.
- **Command re-run** — the card's verification command, run by the Reviewer.
- **Failing criterion and lines** — required on `REJECT`.

## 2. Invariants

1. **Evidence is re-run.** The command in the evidence section is a claim; the Reviewer and the Lead run it again.
2. **Write scopes are advisory.** They diagnose overlap; they never block a claim and never authorize a write.
3. **Criteria are checkable.** A criterion that cannot be run or inspected is a wish.
4. **A rejection names its criterion** and the lines that fail it.
5. **Blast radius.** A card's change touches only what its objective requires; drive-by formatting and opportunistic refactors belong in a separate card.
6. **The verification command is copied unchanged.** The review card carries the same string as the implementation card, and the Reviewer runs that string rather than one it composes.
