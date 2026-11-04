# Calibration examples

Use these examples to identify the governing principle, not as text templates. "Balanced" preserves every load-bearing proposition with the least explanation needed at that location.

The leakage cases deliberately quote leaked wording as calibration material. This file is evidence, not a license to write that way anywhere else.

## Editorial judgement

### Preserve every factual clause

**Original:** "The coordinator carefully serializes writes per session, flushes buffered events before disposal resolves, and reports backend failures to the caller."

**Over-trimmed:** "The coordinator serializes persistence."

**Balanced:** "The coordinator serializes writes per session, flushes buffered events before disposal resolves, and reports backend failures to the caller."

Remove decoration and repetition, not propositions. Actor, per-session scope, disposal ordering, and failure visibility are separate facts.

### Explicit skill scope is functional

**Over-trimmed:** "Read the sources and use judgment."

**Balanced:** "This skill is guidance, not a complete checklist. Use judgment beyond the named checks; documented requirements still apply."

**Over-detailed:** Several paragraphs defending why lists cannot replace independent reasoning.

Keep the explicit limitation because it changes how an agent applies the workflow. Trim repeated persuasion, not the guardrail.

### A cookbook keeps action and verification

**Over-trimmed:** "Add tests for the tool."

**Balanced:** "Test registration and disposal at unit level, exercise the tool through the real loader path, and add a snapshot when its rendered output changes. Verify the assertion observes the external result rather than the tool's own report."

**Over-detailed:** A walkthrough of every fixture file and assertion already visible in the example code.

Keep the test tiers, required action, real entry path, and observable verification. Remove fixture narration.

### Preserve ownership and timing

**Over-trimmed:** "Provider work is cancelled during teardown."

**Balanced:** "The runtime requests provider cancellation before releasing the child scope; the provider remains responsible for joining its workers before disposal resolves."

**Over-detailed:** A chronological account of every promise and callback used to implement teardown.

The actor, ordering, point where ownership changes, and completion guarantee are separate factual clauses.

### Document event order and its consequence

**Over-trimmed:** "Composes and caches the request prefix."

**Balanced:** "Composes the request prefix once before the first pre-request step and model request. Listener appends join the current request, and request accounting receives the composed prefix."

**Over-detailed:** A walkthrough of the loop helpers, cache fields, and promise callbacks that implement the ordering.

Event order and its current-request consequence are caller-visible behavior, not implementation narration.

### Orient complicated code without narrating it

**Over-trimmed:** "Worker isolation support."

**Balanced:** "Owns the isolated worker and its host bridge. Initialization is single-shot; disposal terminates the worker and rejects later calls. See the worker-isolation decision record for the protocol rationale."

**Over-detailed:** A paragraph-by-paragraph preview of the classes and helper functions below.

Keep the module's role, dependencies, responsibilities, and non-obvious lifecycle behavior. Link architecture rationale and let the code show local control flow.

### Public documentation includes failures

**Over-trimmed:** "Returns the realm global."

**Balanced:** "Returns the initialized realm global. Throws if initialization has not completed or the realm has already been disposed."

**Over-detailed:** The internal state-machine branches and exact helper calls that lead to each throw.

Throws and state preconditions are caller-visible contract facts.

### Keep a concise implementation mapping

**Over-trimmed:** "Search provider backed by an external API."

**Balanced:** "Maps each provider result to the shared search-result fields, preserving the title, URL, and text while omitting provider-only ranking metadata."

**Over-detailed:** A field-by-field restatement of the mapping code, including fields with identical names and obvious assignments.

Keep mapping details that explain where an adapter drops or changes information.

### Link rationale while keeping the local contract

**Over-trimmed:** "Disposal is documented in the lifecycle decision record."

**Balanced:** "Disposal aborts the run and waits for provider quiescence. See the lifecycle decision record for ownership and race handling."

**Over-detailed:** Repeating the record's promise choreography and rejected ownership models beside every disposer.

Keep the behavior and completion guarantee where callers need them. Link aggressively for the algorithm and rationale; a link cannot replace the local contract.

### Implemented decision records retain verification contracts

**Over-trimmed:** Deleting the entire Testing section because the decision has already shipped.

**Balanced:** "Unit tests cover cancellation before and after publication, disposal quiescence, and provider reload. A built-artifact smoke test covers the real loader path; snapshot coverage is deferred because the transport is process-specific."

**Over-detailed:** A file-by-file walkthrough of fixtures and assertions with no additional behavioral distinction.

Remove migration tasks and test narration. Keep the tiers, behaviors they pin, real entry path, and named coverage gaps.

### A security boundary may need one concrete example

**Over-trimmed:** "Mounted plugins share the host's authority."

**Balanced:** "Mounted plugins share the host's authority; for example, access to the shell service permits commands with the host executor's privileges."

**Over-detailed:** A list of every service a plugin could misuse and every hypothetical exploit.

Keep one example when it makes an otherwise abstract security limit operationally clear.

### Delete reasoning transcripts entirely

**Over-detailed:** "First the loop checks whether the value is absent. If it is absent, the next branch returns early. Otherwise it continues, which is why the final assertion is safe."

**Balanced:** No comment when the code already expresses those branches. If the early return protects a non-obvious invariant, state only that invariant.

Do not compress a reasoning transcript into shorter narration; remove it.

### Configuration comments explain what the tree cannot

**Over-detailed:** "This entry loads the local filesystem provider, followed by the policy plugin, followed by the read, write, and edit tools," when the adjacent entries already show that order.

**Balanced:** "Load policy before the model-facing tools so their write and edit calls pass through the read-before-mutation gate."

Keep the consequence of order, a surprising scope rule, or a security boundary. Let the configuration show its own inventory.

### Do not trim for word count alone

**Current:** "The adapter converts provider errors into the shared error type so callers can handle authentication, rate-limit, and transient failures uniformly."

**Shorter but worse:** "The adapter normalizes provider errors."

**Balanced decision:** Keep the current sentence unless a link or surrounding contract already lists the failure categories. The shorter version loses the consequence and distinctions without improving structure.

### Visible text follows ownership

**Over-trimmed:** "The tool returns errors when a call fails."

**Over-detailed:** Copying another package's schema and renderer strings into this backend's README.

**Balanced:** Quote stable prompt, result, and error text owned by this package. Link the generated tool catalog for schemas and the consumer README for text another package owns; state only this package's conditions or deltas locally.

Wording that reaches a model is behavior, but duplication still drifts. Exactness belongs at the owner.

A prose-only audit may identify suspect wording but must not silently change it when no owning runnable scenario exists. Leave it unchanged and report the deferral, or expand the authorized change to include the owner scenario and the required behavior evidence.

### Generated summaries must stand alone

**Over-trimmed:** "Approval request and policy service." The owner explains policy order and audit logging later, but the catalog exports only its first sentence.

**Over-detailed:** Moving the service's full lifecycle and prompt-notice behavior into the extracted sentence.

**Balanced:** "Approval service that applies session policy before answerers and logs every ask/outcome pair to the requesting session." Keep non-catalog detail in later sentences.

Know what the generator extracts. That fragment must preserve the contract needed on its generated output.

### Limitations are contracts, not debt inventories

**Over-trimmed:** Omitting a process-lifetime cache that makes configuration changes require plugin reload.

**Over-detailed:** Listing private helper cleanup and unused test-only accessors with no caller or maintainer consequence.

**Balanced:** "Provider selection is cached for the plugin lifetime; installing or repairing a provider requires reload." Keep ordinary cleanup in its TODO or decision record.

Retain gaps and non-obvious constraints that affect use or safe maintenance. A package README is not a backlog dump.

## Leakage

### Dead citations

**Leaked:** "Slash input resolves against the visible catalog (decision 21)."

**Fixed:** "Slash input resolves against the visible catalog — the plain-text-reference decision, owned by the input-machine decision record at `path/to/the-record.md`."

The ordinal resolves nowhere at the current state; the decision's name and owning record path do. Name the owning record's path at least once per file — as a link where the surface supports one — and later mentions may use the searchable name alone.

**Leaked:** "The registry rejects duplicate names (decision 7: names are flat, no namespacing)."

**Fixed:** "The registry rejects duplicate names; names are flat, with no namespacing."

No committed artifact owns "decision 7", so the citation is deleted — but its factual clause (flat names) is restated to stand alone, not deleted with it.

**Leaked:** "Rendering is pure: same snapshot, same string (audit R3)."

**Fixed:** "Rendering is pure: same snapshot, same string."

There is no audit document in the project; the code is pure session shorthand carrying zero propositions.

**Leaked:** "Layering follows the design (v2 §3.2): the core is pure."

**Fixed:** "Layering: the core is pure."

A section number of a draft nobody committed is unresolvable. Contrast: "escapes per RFC 9110 §10.1.5" stays — an external standard resolves outside the project by design, and a committed document that owns its numbering may be cited by section.

**Leaked:** "The client tree is the shell (T4); the P-I migration owns the adapters."

**Fixed:** "The client tree is the shell; the adapters live under the client adapters directory."

Phase labels index a plan that never landed. Replace the label with what the phase produced.

### Change and series vantage

**Leaked:** "A future remote backend implements this interface (the local backend is a later change in this series)."

**Fixed:** "A remote backend can implement this interface without changing the render layer."

Durable prose cannot see the series. Keep the extension-point contract; the pending work's home is the change itself, a TODO, or an issue.

**Leaked:** "This change adds cursor-based pagination to the session list."

**Fixed:** "The session list paginates by cursor."

A README outlives every change; state the mechanism as current fact.

### Change narration and version stamps

**Leaked:** "Colors used to come from widget tokens, which nothing defined, so it always rendered the fallbacks; the alias tokens fixed that (change #88)."

**Fixed:** "Colors come from the alias tokens; an undefined token renders the fallbacks."

Both live facts survive — the current mechanism and the standing failure behavior — restated in the present. The bug's biography belongs to the change and its decision record.

**Leaked:** "The probe field is gone with the removal cut; badges ride the generic projection pair now."

**Fixed:** "Badges use the generic projection pair."

Readers who never saw the probe field learn nothing from its absence. "Now" contrasting with a deleted past is a version stamp.

**Leaked:** "This used to double-encode multibyte labels."

**Fixed:** "Without the byte-length guard, multibyte labels double-encode."

The regression pin survives as a present-tense counterfactual that names the guard; "used to" pins it to project archaeology instead.

**Leaked:** "Batch rendering is synchronous this cut; the async path is roadmap work."

**Fixed:** "Batch rendering is synchronous." (The deferral lives in `TODO(widget-batch):` at the call site.)

"This cut" and "v1" go stale the moment they merge. A historical stage name inside a decision record's change-story section ("the first cut shipped X") is current-state-safe; the indexical form never is.

### Review choreography

**Leaked:** "Rejected in review: caching the resolved spec. We keep resolution per-call."

**Fixed (in a decision record's alternatives section):** "**Caching the resolved spec.** Rejected: the spec depends on per-call cwd, so a cache keyed by request would serve stale roots."

The alternatives-considered genre is the sanctioned home; the reviewer and the round are not part of the rationale.

**Leaked:** "As of v5 of this note, the loader also validates manifests."

**Fixed:** "The loader validates manifests."

An implemented record states shipped reality; its own revision history lives in the project history.

### Reviewer-addressed justification

**Leaked:** "The cast is safe — the SDK constructed the object, it simply doesn't declare the optionals strictly enough."

**Fixed:** "The SDK constructs this object with every optional populated; the declared type is looser than the runtime guarantee."

State the invariant a maintainer must not break. "It simply…" is a voice answering an objection nobody at the current state raised. If the invariant is visible in the code, delete the comment instead.

**Leaked:** "This is correct because the reviewer confirmed the wrapping order."

**Fixed:** (deleted; the wrapping order is stated in the function's return documentation.)

Correctness claims cite invariants or tests, never people.

### Restatement and derivation

**Leaked:** "First we normalize the label, then we truncate it, then we wrap it."

**Fixed:** (deleted.)

The three lines below the comment say the same thing in code.

**Leaked:** "This test creates a session, sends two messages, waits for the second reply, and then asserts the log has four entries."

**Fixed:** "Two round-trips must produce exactly four log entries — the projection dedupes the shared prefix."

Keep only the non-obvious assertion rationale; the walkthrough restates the test body.

### Hedges and planning residue

**Leaked:** "Probably fine to render eagerly for now."

**Fixed:** (deleted; the deferral already has its `TODO(widget-batch):` marker.)

A hedge without an owner is planning residue. If no marker exists, write one (`TODO(name): coalesce per animation frame`) instead of keeping the hedge.

**Leaked:** "A 64 KiB buffer should be enough for most cases."

**Fixed:** "64 KiB holds the largest observed frame (48 KiB) with headroom; a larger frame fails loudly in decode."

Replace the hedge with the actual bound and the failure behavior when it is exceeded.

### Authoring-language slips

**Leaked:** "The renderer runs on the client 端; see the 设计稿 for spacing. ---- 私有 ----"

**Fixed:** "The renderer runs on the client side; spacing follows the design frame named widget-badges."

Working-language fragments and session separators are transcription residue. The design frame name stays: an external source that resolves outside the project by design.

**Leaked in both files:** `// 更新这里 before returning` inside a shared code block.

**Fixed in both files:** `// Update this before returning.`

Correct the block once and copy that byte-exact block into both language files. Translating the code comment differently in the counterpart breaks the pairing contract even when both comments are individually fluent.

### Behavior-visible candidates

**Suspect:** An exported doc sentence says "available for now," and a generator copies that sentence into a model-visible catalog.

**Wrong:** Rewrite only the source sentence during a prose-only pass, or hand-edit only the generated catalog.

**Right:** Trace the source's generated fan-out, update the owner, regenerate every derivative, and update the owning runnable scenario. For a user-visible string, include the project's required behavior evidence. If the authorized scope has no owning scenario, leave the wording unchanged and report the deferral.

### Keeps

**Keep:** "The cap applies to the complete rendered value, wrappers included (issue #1470 owns the follow-up)."

An unaided pass deleted this, reasoning that issue citations belong in decision records. Wrong direction: issues resolve at the current state from any surface, and "#N owns the follow-up" is the sanctioned home for deferred work in a README. What decision records and postmortems additionally sanction is citing merged changes as evidence.

**Delete:** "Badge renderer over the widget seam (see the widget-rendering RFC)."

An unaided pass kept this as "naming the owning document by topic". The test is resolvability, not form: no committed file answers to "the widget-rendering RFC", so the pointer is dead. Retarget it to the committed owner if one exists; otherwise delete it.

**Keep (after fixing):** `// lint-disable-next-line no-non-null-assertion -- the one-element literal guarantees index 0.`

The justification clause is required prose. When the stated reason is false (the original said "the loop guard above proves a frame exists" with no loop in sight), fix the reason; never delete it.

**Keep:** "Depth cap (measured: 512 nests ≈ 0.15s synchronous; 4096 blocks the loop)."

The measurement pins the constant against uninformed retuning, and "measured" identifies data rather than a guess.

**Keep:** "The old connection drains before the new one accepts."

"Old" and "new" here name two live runtime objects during handover, not project states. The change-narration ban is about project history, not lifecycle vocabulary.

**Keep:** "What is today's date?"

The prompt asks about the runtime clock; "today" does not contrast project states. Because the text reaches a model, any rewrite still requires its owning behavior evidence.

### Overcorrection traps

Every trap below is a real failure mode of an unaided trim. Enumerate a passage's propositions before trimming it.

#### Flipping an obligation into an endorsement

**Original:** "These direct registrations are exceptions pending migration to slots."

**Overcorrected:** "These direct registrations are sanctioned exceptions."

**Right:** "These direct registrations are exceptions pending migration to slots."

"Pending migration" is an obligation; "sanctioned" blesses the status quo. The trim inverted the sentence's modality while shortening it.

#### Promoting a hypothetical to a shipped feature

**Original:** "A future out-of-process shell subclasses the executor and overrides its spawn hook."

**Overcorrected:** "An out-of-process shell subclasses the executor and overrides its spawn hook."

**Right:** "A hypothetical out-of-process shell — no such shell exists — would subclass the executor and override its spawn hook."

Deleting the future-marker alone turns a design illustration into a claim that the class ships. Mark the hypothetical explicitly instead of just unmarking the future.

#### Deleting a true fact with the transcript around it

**Original:** "The gate notice narrates the check order; the notice text is also what the documentation type-check gate compiles against."

**Overcorrected:** "…" (whole sentence deleted as narration.)

**Right:** "The notice text is what the documentation type-check gate compiles against."

Half the sentence was narration; the other half was a load-bearing coupling. Delete clauses, not sentences, when propositions share a line.

#### Dropping the measurement source while keeping the number

**Original:** "The 4 MiB ceiling is measured: the largest generated type module is 3.1 MiB."

**Overcorrected:** "The ceiling is 4 MiB; the largest generated type module is 3.1 MiB."

**Right:** keep "measured".

Without "measured" the 3.1 MiB reads as a definition rather than an observation, and nobody re-measures before raising the ceiling.
