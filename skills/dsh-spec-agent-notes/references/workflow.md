# Proposal-first workflow

This contract owns how substantial future work moves from design through execution and into an implemented Agent Note. [The notes contract](notes-contract.md) owns the active tree, note format, classification, companions, supersession and pruning; [the archive contract](archive-contract.md) owns frozen history.

The notes contract decides whether the work needs a durable record. This contract applies when it does, or when an existing proposal or execution tracker already governs the work.

## One owner for each fact

| Artifact | Owns | Does not own |
|---|---|---|
| Proposed Agent Note | Problem, intended change, alternatives, acceptance criteria and risks | Execution status or commit history |
| Execution issue or tracker item | Dependencies, status, completed and pending evidence, next checkpoint and links | Rationale, alternatives or a second copy of the complete design |
| Implementation commit or change request | The code, configuration, documentation and tests actually shipped, with their verification | A mutable design or execution status |

Each proposal links its execution tracker, and each tracker item links back to its proposal. The tracker may summarize the outcome needed for execution, but the proposal remains the authority for the complete design and acceptance criteria.

Use one proposal and one tracker item for a coherent decision. Split independent decisions into separate proposals and tracker items rather than using one proposal as a project plan or one issue as a design document.

## Retain the proposal before implementation

Before design or implementation of substantial future work:

1. Search the target branch's active `proposed/` inventory for a note that owns or constrains the decision. Search by the problem, mechanism and rejected alternatives, not only by a proposed title.
2. A note confined to a working tree, Draft change, unmerged branch or stale local revision is not active inventory. It may inform discussion, but it is not authority for implementation and cannot be resumed as though it had been retained.
3. When no retained owner exists, write one proposed note under the project's notes root and associate one tracker item. The note links that item; the item links the note's path and records execution status. If the proposal needs translation or another companion, complete the selected unit before retaining it.
4. Retain the design before implementation. A proposal-only change is reviewed and merged with `Status: proposed` under `proposed/`; approval of the design does not change its lifecycle. If review changes the decision, alternatives or accepted scope, update the proposal before implementation relies on it.
5. Start implementation from the proposal present in the target inventory. If the target branch, tracker or proposal mechanism cannot be inspected, hand over the missing discoverability step rather than treating a draft as retained.

This gate does not turn small mechanical or local work into a proposal. The notes contract's write trigger still decides whether a durable record is owed.

## Record execution evidence

An implementation commit or change request performs the work and names the execution tracker through the project's convention. A partial change uses the project's non-closing reference convention and leaves the tracker status explicit; a closing or resolving reference is reserved for a change that satisfies the tracked scope. The tracker records the evidence a later session needs to resume: which accepted criterion the change completed, which commit or change request carries it, what verification ran, and what remains.

Do not create a work record, a progress diary, per-criterion proposals, or another status store. A project decision that removed a prior work record may define a measured condition for reintroducing it; honor that condition. Without that condition, Git history and the execution tracker preserve implementation history, the proposal preserves the design, and a commit message states what shipped without becoming the live status owner.

## Checkpoint full and partial work

Checkpoint after each material implementation goal, before declaring the work complete, and whenever work pauses or resumes:

1. Read the current proposal and tracker from the target inventory.
2. Compare every acceptance criterion with the implementation actually shipped and its verification evidence.
3. Keep the note in `proposed/` if any accepted criterion, goal or required companion remains incomplete. Record the completed evidence and the next pending outcome in the tracker.
4. If implementation reveals a factual path, name or mechanism change, update the proposal's current facts and its companions. A change to the decision, alternatives or accepted scope is a design change and returns to proposal review before implementation proceeds from it.
5. Move the note to `implemented/` only at the complete checkpoint: every accepted criterion is shipped and verified, and the implemented skeleton and companions are satisfied in the same change. Update the tracker link to the implemented path.
6. When work is abandoned, reject or delete the proposal under the notes contract. Do not leave an obsolete proposal as an implicit backlog item.

Completion is not a count of commits. A partial implementation with one completed goal and one pending goal remains `proposed/`; a complete implementation with all accepted goals closed moves to `implemented/`.

## Multi-goal proposals

A coherent proposal may have several acceptance criteria or several execution-tracker goals. Track each goal's evidence in the tracker, and evaluate the proposal's lifecycle against the complete accepted set.

- If any accepted goal is unfinished, the note remains `proposed/`.
- If accepted goals are delivered in separate changes, checkpoint each change and keep the remaining goals visible.
- If a partial delivery is itself an independent, complete decision, it may receive its own implemented note while the broader proposal remains proposed and cross-linked. A subset of the same decision keeps the single proposed owner.
- If scope is reduced or expanded, update the proposal's acceptance criteria and review that design change before using the new scope to declare completion.
- Do not silently treat an unfinished goal as delivered because another goal in the same proposal shipped.

## Move the owner

Moving a proposal to `implemented/` is one lifecycle change: use the implemented status and skeleton, keep the first-proposed filename date, move the complete unit, re-record companions, and update the tracker and inbound links. The notes contract owns the format and the archive contract owns later archiving.

## Do not copy standing instructions

This workflow does not create or modify `AGENTS.md`, a generated policy file, or another standing-instruction asset. The installed skill and the project's existing instructions supply the rule; a project names only its notes root and repository conventions where those values differ.

## Report a checkpoint

Report the design owner and status, the execution tracker, the evidence for each completed goal, the remaining accepted goals, and the relevant notes and companion checks. A full checkpoint also reports the new implemented path and updated links.
