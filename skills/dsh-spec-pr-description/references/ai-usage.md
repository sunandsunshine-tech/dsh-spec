# AI Usage section

Every change-request description carries an AI Usage section. The section records how much the AI took part in each stage of the change and who made the decisions, and it carries the AI-DECLARATION block. This reference carries the model: the levels, the stages and their criteria, the grading rules, the badge and declaration block, the section format, the update timing, and an example.

The AI-DECLARATION specification (0.1.2) defines a repository-root `AI-DECLARATION.md` file; this section pins that version and uses its level vocabulary and badge. Every change-request description carries the section.

## Levels

Levels are ordered from least to most AI involvement; each level has an English name that stays fixed, and a description written in another language adds its rendering beside it. AI involvement is how much the AI participated in the decisions and work of that stage, recorded as a multiple of 5% within the chosen level's range. It is not a measure of code volume, time, or tokens.

| Level | Meaning | AI involvement |
|---|---|---|
| `hint` | A human does the work; the AI takes no part or only offers passive suggestions that the human accepts or rejects | 0–10% |
| `assist` | A human supplies the main content or every key decision; the AI completes part of the work | 15–25% |
| `pair` | A human gives the key direction or constraints and revises the AI's output several times; the human understands the internals | 30–50% |
| `copilot` | The AI completes the whole task; a human reviews, selects, or rejects, and decides or clarifies key points without supplying substantive content | 55–85% |
| `auto` | The AI completes the task autonomously; a human only sets the goal or accepts the output | 90–100% |
| `n/a` | The stage does not exist or has not happened yet | — |

This model's lowest level is `hint`. The specification's `none` level is not adopted here, and `n/a` is this model's addition for a stage that does not apply.

## Stages and criteria

Stages appear in a fixed order; each stage has an English name that stays fixed, and a description written in another language adds its rendering beside it. The criteria below cover `assist` through `auto`; judge `hint` by its meaning in the level table.

### breakdown

After the problem appears, whether a human takes part in breaking it down, or the AI acts on it directly. Confirming that a problem should be fixed belongs to this stage, not to design.

- `auto`: the AI acts on the problem directly.
- `copilot`: the AI identifies the subproblems, root cause, and scope; a human only confirms them or removes items from the AI's list.
- `pair`: a human contributes one or two key facts, such as a suspected direction, a key subproblem, a trigger condition, or a scope limit, or requires tracing the root cause; the AI identifies the rest.
- `assist`: a human supplies the list of problems or subproblems that make up the change's scope, or the root-cause judgment, and sets the scope; the AI traces the root causes or works from that list.

### design

Who supplies the logical design, and how many trade-offs and detailed changes the human makes. Grade by who supplied the design structure that was adopted, not by who proposed candidates first: when the AI proposed candidates and the human then supplied the adopted structure, the stage is `assist`. Design structure means the module split, data flow, key interfaces, or state transitions; for documentation, the directory, page split, and responsibility layering. Constraints stated as observable outcomes are constraints, not structure. A structure that the human reached through successive corrections counts as supplied by the human.

- `auto`: a human adopts the AI's design as proposed, or only confirms an option the AI recommends.
- `copilot`: a human chooses among the AI's designs, or rejects parts of one.
- `pair`: the AI proposes the design structure; a human gives key constraints, names, or several revisions.
- `assist`: a human supplies the design structure (module split, data flow, or key interfaces); the AI fills in the mechanism or writes it up.

### testing

Who sets the acceptance goals, test cases, and test matrix, and who checks the results. For documentation-only changes, the acceptance goals are content requirements. Instructions that only order the work, such as writing tests before the fix, do not count.

- `auto`: the AI sets the goals and cases; a human at most approves publishing or confirms a scope the AI recommends.
- `copilot`: a human reviews or comments on the cases, the test matrix, or the results the AI reports.
- `pair`: a human sets quantified targets or required scenarios, such as a trigger condition or a before-and-after contrast that must be covered, or, for documentation-only changes, content requirements; the AI designs the concrete cases.
- `assist`: a human defines the test matrix, its dimensions or rows, and runs or tries the result to check it; the AI may fill in the values and cases.

### implementation

Human intervention in the changed content, including production code, documentation (READMEs, API documentation, decision records, comments), CI configuration, and release scripts.

- `auto`: the AI writes every change, and the records show no human diff review.
- `copilot`: a human reviews the diff, including staging it piece by piece, and accepts it or makes a few comments that do not require redoing work.
- `pair`: a human requires reverting or redoing any part of the work, or specifies a refactoring or an implementation approach.
- `assist`: a human writes the key parts in the diff; the AI completes the rest. Dictating content for the AI to write is not writing it.

### review

Who decides whether each handled review comment is fixed or declined. Comments from bots and from people both count; grade by who decided, not by who posted the reply. When no review comment has been handled, the row stays `n/a`, even if comments exist or arrived after merge.

- `auto`: the AI decides on and replies to every comment.
- `copilot`: a human gives only a blanket authorization or category-level instructions, or responds to only a few items on a handling list the AI prepared and leaves the rest to the AI.
- `pair`: a human responds to every item other than wording, in the threads or on the AI's list, deciding to fix, decline, or defer, even with a short acceptance; merged duplicate comments count as one item, and wording comments may be handled by category; the AI carries out the decisions and replies.
- `assist`: a human posts replies to reviewers directly, or leads the discussion of disputed items; deciding while the AI posts the replies is `pair`.

## Grading rules

- Grade from the change's session records and task records. A human message sent to a delegated agent session counts; an instruction an agent writes to a delegate is not a human message.
- Count only work that ends up in this change, including work from earlier sessions that ends up in it. A human's request to revert or redo work counts even when the reverted work does not remain in the change.
- In `breakdown`, `design`, `testing`, and `implementation`, the human is the author working with the AI; reviewers' approvals and comments count only in `review`.
- Process and ordering instructions, such as branching, working order, staging, and when to commit, push, or open the change request, do not count as human involvement in any stage.
- When the records suffice, grade at the level with the most human involvement whose criterion the records meet, and express the human and AI shares through the AI involvement value. Only when the records do not suffice, take the level with less human involvement that the records support.
- When a stage covers several changes, grade by the main change and state how the other changes differ in the description. The main change is the one with the largest share of the diff and review effort; when no single change dominates, grade by the change with the most human involvement. When later work changes which change is main, regrade the stage.
- Within the chosen level's range, choose a lower AI involvement value the closer the human involvement comes to the criterion of the level with more human involvement, and a higher value the closer it comes to the level with less.

## Badge and declaration block

The block pins AI-DECLARATION specification version 0.1.2. Use the badge URL for the level selected in [Section format](#section-format); the badges follow [AI-DECLARATION](https://ai-declaration.md).

| Level | Badge URL |
|---|---|
| `hint` | `https://img.shields.io/badge/䷼%20AI--DECLARATION-hint-ecfccb?labelColor=ecfccb` |
| `assist` | `https://img.shields.io/badge/䷼%20AI--DECLARATION-assist-fef9c3?labelColor=fef9c3` |
| `pair` | `https://img.shields.io/badge/䷼%20AI--DECLARATION-pair-ffedd5?labelColor=ffedd5` |
| `copilot` | `https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2` |
| `auto` | `https://img.shields.io/badge/䷼%20AI--DECLARATION-auto-ede9fe?labelColor=ede9fe` |

The badge level is the level with the most AI involvement among the stage rows; ignore rows with `n/a`. This follows the specification's rule that the global level is the highest declared level. Keep the `ai-declaration` markers so an existing declaration can be replaced in place without duplicating it.

When the specification changes, update every version reference in this skill. Any copy in a project's change-request template is the project's artifact, and the project's own update rule applies to it.

## Section format

The section starts with the AI-DECLARATION block, followed by one table row per stage in the fixed order:

```markdown
## AI Usage

<!-- ai-declaration:start -->
[![AI-DECLARATION: <highest level>](<badge URL>)](https://ai-declaration.md)

**AI declaration** ([v0.1.2](https://ai-declaration.md/en/0.1.2)): `<highest level>`
<!-- ai-declaration:end -->

| Stage | Level | AI involvement | Decision record |
|:--|:--|--:|:--|
| <stage name> | <level name> | <AI involvement> | <description> |
```

The stage and level identifiers stay English in every language. When the description's language is not English, translate the table header and the review-row statement, and write the rendering in the description's language beside each identifier.

## Decision records

The decision-record rules are stated in the entry (§AI Usage). The example at the end of this file shows the shape a record takes.

## Update timing

- When creating the change request, the review row reads `| review | n/a | — | `, with the rendering in the description's language beside each identifier when the description is not English, followed by a statement, in the description's language, that no review comments have been handled yet.
- When the description is updated after the change request exists, rewrite the affected rows so that they cover all work so far, including earlier stages whose decisions or human share the later work changed; do not append a history of changes.
- The review row records only handled review comments; it omits approvals, merge timing, and unhandled comments.
- A handled review round ends as the entry defines it; comments that arrive after merge do not trigger an update.

## Example

Filled in from a change that added a bounded retry budget to an HTTP client; the description's language is English, so the identifiers stand alone and the table header is English.

```markdown
## AI Usage

<!-- ai-declaration:start -->
[![AI-DECLARATION: pair](https://img.shields.io/badge/䷼%20AI--DECLARATION-pair-ffedd5?labelColor=ffedd5)](https://ai-declaration.md)

**AI declaration** ([v0.1.2](https://ai-declaration.md/en/0.1.2)): `pair`
<!-- ai-declaration:end -->

| Stage | Level | AI involvement | Decision record |
|:--|:--|--:|:--|
| breakdown | pair | 40% | The author named the two failing paths, timeout and server error, and set the retry cap; the AI traced the failure paths. |
| design | assist | 20% | The author supplied the design structure: one retry budget per client, backoff owned by the transport, and no retry on non-idempotent requests; the AI filled in the mechanism. |
| testing | pair | 40% | The author required the timeout and server-error scenarios and a no-retry test for non-idempotent requests; the AI wrote the cases. |
| implementation | pair | 35% | The AI wrote the code and tests; the author required one rework of the backoff placement and specified the budget field. |
| review | pair | 40% | The author decided each review comment, such as keeping the cap configurable and declining a shared helper; the AI fixed and replied. |
```
