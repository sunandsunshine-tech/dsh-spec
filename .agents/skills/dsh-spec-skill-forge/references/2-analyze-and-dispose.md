# 2. Collect, analyze and dispose of the three elements


1. **Anchor**
   - Audience and domain: target audience, domain, naming conventions and terms. Required tools, directories, constraints and missing conditions. When upstream targets another domain or state, list each difference and let disposition decide it.
   - Environment: runtime, tools and constraints. Write them into `compatibility`, and into the script header when there is a Script.
   - Declaration location: does the target audience have one? Read its custom values. Otherwise use skill defaults.
   - Terms: settle referent, domain meaning and home for each term the body uses. When unclear, use a ruling and record it.
2. **Collect**: gather Docs, SOP and Script from the request, project context or upstream. Keep only design-changing material. Stop when new material no longer changes it. Record uncollected leads and their expected value.
3. **Source constraints**: every "must", "must not" or "only" is a source constraint, whatever the wording. List each and its location. Merge duplicates by purpose and keep every location. Without an upstream, use the request's requirements. When a disposition's fact is unconfirmed, use a ruling and record it. Do not invent.
4. **Deconstruct**: look upstream for paragraphs smaller than the whole that state a way of working and are followed by several concrete instructions. One paragraph is one unit. Extract steps, decision rules, roles and structure. Concrete rules alone are not a paragraph. Without such paragraphs, dispose of each constraint one by one.
5. **Disposition**: for each source constraint not covered by a deconstructed unit, take the first applicable mode in order.
   - **Keep**: the constraint holds in original wording and sense. Carry it, adjusting only language and layout.
   - **Adapt**: referent exists and only its value differs, for example path, command, parameter, limit or name. Instantiate the target value. Keep defaults in the skill, take custom values from the target declaration.
   - **Re-bind**: no referent or a different name. Abstract to purpose, find an equivalent means, and make it a concrete executable expression.
   - **Dissolve**: none holds. Do not carry it. Record the target fact, how to check it, and what takes over the responsibility.
   - The table has one unit per row: upstream location, disposition, location and basis. Basis is a target-domain or environment fact, the skill's purpose, the upstream text or a ruling. A deconstructed unit records purpose and covered constraints. A change states what part is kept, its purpose and the forcing fact. Dissolve states the check.
6. **Coverage**: a deconstructed unit covers all constraints its paragraph states. Each remaining unit covers one. Each constraint is covered by exactly one unit.
7. **Honesty**: do not assert installed skills. State responsibility and try order when needed. Introduce examples with "for example". When an example is unclear, use a ruling and record it.

**Complete**: the three elements are identified, each source constraint has a disposition, location and basis, and no content lacks a home.

**Check**: every material later recomposition needs is located, the coverage rules hold, and no disposition repeats or conflicts.

**Failure**: fill dispositions, narrow the scope, record the gap or resolve the conflict. When undecided, use a ruling and record it.
