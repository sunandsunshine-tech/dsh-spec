# Agent Note: A skill can be optional

Status: proposed

English | [中文](2026-10-10-a-skill-can-be-optional.zh.md)

## Problem

The manifest was one list, and an install put all of it in place: a project had no way to say that one skill was conditional. The team workflow is exactly that case — a delivery that runs no team has nothing to load it for, and the skill owns a workspace, the delivery-plan tree, that a project may not want. Leaving a skill out by deleting it after the install does not hold, because the next `install` puts it back, and writing it into the manifest's one list makes it required with no way to say otherwise.

## Proposal

`manifest.json` gains `optional`, a subset of `skills`; the required set is the difference, derived rather than written down, so the two lists cannot disagree. The field is additive: a manifest written before it existed names nothing optional and installs everything, and a manager older than the field ignores it and installs the optional skill too — an extra install, never a failure.

`install` asks, and it never assumes. At a terminal each optional skill is listed with the first sentence of its `description`, read from the revision being installed, and the default answer is no; a shell that is not a terminal asks nobody, installs none, and prints `optional not installed: <name> — pass --with <name> to add it`; `--with <name>` may be repeated and installs without asking; `--dry-run` prints the question and the answer it would take and reads no input.

`upgrade` never asks. An optional skill the project already holds follows the set, and one it never took is not installed: holding the skill is what selects it. A project's choice is never written into the installed `manifest.json`, because `gh skill install --force` overwrites that file and the prune cleans it — the selection is the directory that is there.

The optional skill is `dsh-agent-team-workflow`, and it owns the delivery-plan surface: taking it is what creates and keeps the plan tree, its pair and the `dsh-spec:plans` hook, and leaving it out carries none of them. [A delivery records a plan and a working copy](../process/2026-10-10-a-delivery-records-a-plan-and-a-working-copy.md) owns that workspace itself; this field owns why it is conditional.

## Alternatives considered

**Split the manifest into a `required` list and an `optional` list.** It lost because it breaks the update on the day it lands: a manager older than the split reads the manifest it knows and finds no `skills`, so it fails rather than installing something. An added field is read by the old manager as nothing, and the whole set is installed.

**Install the optional skill by default and let a project remove it.** It lost because a skill that has to be deleted after every install is not optional, and `upgrade` puts it back.

**Record the project's selection in the installed `manifest.json`.** It lost because the installer overwrites that file with the revision's copy and the prune removes anything else, so a selection written there does not survive the next install. The directory the project holds already says the same thing and cannot drift from itself.

**Carry each optional skill's description in the manifest, next to its name.** It lost because the sentence belongs to the skill's own `SKILL.md`, and a copy in the manifest is a second place for it to be wrong; the question reads it from the revision being installed and shows the name alone when the revision cannot be read.

## Acceptance criteria

- `manifest.json` carries `optional: ["dsh-agent-team-workflow"]`, and the required set is derived as `skills` minus `optional`.
- A terminal install lists each optional skill with the first sentence of its description and takes no as the default answer.
- A shell that is not a terminal installs no optional skill and prints the `--with` line that would.
- `--with <name>` installs without asking, may be repeated, and refuses a name that is not an optional skill of this collection, with exit 2.
- `--dry-run` prints the question and the answer it would take, and reads no input.
- `upgrade` asks nothing: an optional skill the project holds follows the set, and one it never took is not installed.
- An adoption that takes the workflow skill creates the plan tree, its pair and the hook; one that leaves it out creates no plan tree and no hook.
- Every install scenario above is covered by the functional suite offline, through a `gh` stub.

## Risks

- Holding the skill is the whole selection, so an upgrade follows it and never second-guesses it; a project that deletes the optional directory to decline it also deletes the record of ever having wanted it.
- `install` does not follow a skill the project already holds: it installs the required set plus the answers of that run, leaves a held optional where it is, and on a non-terminal prints `optional not installed: <name> — pass --with <name> to add it` even when the skill is on disk and merely not selected that run. The line is narrower than the state; `status` reports the drift and `upgrade` converges it.
- A manager older than the field installs the optional skill without asking, so the revision that introduces `optional` can leave a project holding a skill nobody answered for; the next upgrade keeps it, because holding it is the selection.
