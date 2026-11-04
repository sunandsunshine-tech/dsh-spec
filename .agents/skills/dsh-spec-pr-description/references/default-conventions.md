# Default conventions a project may adopt

A project that declares no conventions of its own can take this file as its working default, adapt it, or replace it with its own. These are examples and defaults, not obligations: the skill's requirements are stated in the entry and remain in force, and a project's declared conventions win on values, forms, places and examples.

## Issue tracker and references

- GitHub: `Fixes #N`, `Closes #N` or `Resolves #N` when the change resolves the issue; `Refs #N` when it gives context.
- Another tracker: use the reference form the tracker documents; when it documents none, link the issue and name the tracker.
- The entry states what counts as an issue reference and the one-sentence path for a change with no tracked issue.

## Pull-request labels (optional examples)

- Exactly one kind label from a closed set: `kind/feature`, `kind/bug-fix`, `kind/doc`, `kind/testing`, `kind/cleanup`, `kind/dependency`; the kind records the dominant intent. Issues use the tracker's native issue type instead.
- At least one materially affected `area/*` label; the set is extensible with `area/<lowercase-kebab-case>` for a durable, reusable domain — not for one change, an incidental path, a temporary project, a status or a person.
- At most one priority label, `p0`–`p3`. A resolving change matches the highest priority among the issues it resolves; when it carries a priority, every issue it resolves has one.
- Default for a change without tracker conventions: set the labels the tracker offers and omit them where none apply; the description itself carries no label requirement.

## Project fields, statuses and dates (optional examples)

- Project single-select `Priority` and date `Start Date` fields; maintainers set the Project Priority manually, and the tracker's own issue priority field is not the same value.
- Statuses: `Inbox`, `Backlog`, `Ready`, `In progress`, `In review`, `Done`, `No action`.
- Opening the change initializes an empty `Start Date` for every referenced issue, informational references included, from the creation date in the project time zone; existing values are preserved. Opened, reopened or body-edited changes can advance resolving issues to `In progress`, a review request to `In review`, and a changes-requested review back to `In progress`.
- Default for a change without tracker conventions: record the fields and statuses the tracker already shows and otherwise let the tracker's defaults stand; the description does not restate them.

## Structure and language (pointer)

- The default structure, the four content blocks and the language order are stated in the entry; with no declaration, the default applies as written.

## Drafting and tools (optional examples)

- Body: a path the project does not commit (its ignored path, otherwise a temporary directory).
- GitHub examples: `gh pr create --body-file <file>`, `gh pr edit <number> --body-file <file>`, save with `gh pr view <number> --json body --jq .body`, and `--attach` when the description embeds media.

## Disclosures and AI Usage (pointers)

- The disclosure duty, its placement and its typical categories are stated in the entry.
- The AI Usage section and its model are stated in the entry and `references/ai-usage.md`.
