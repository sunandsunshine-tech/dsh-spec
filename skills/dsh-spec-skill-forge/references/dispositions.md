# Dispositions

Read this before the two disposition passes in step 3. It owns the ladder, the constraint table's schema, the basis kinds, the burden of proof, and the coverage rule. A **disposition unit** is one source constraint, or one deconstruction passage; every row of the table is one unit.

## The ladder

Each source constraint not covered by a deconstruction unit takes the first rung that holds:

| Disposition | Holds when | Action |
|---|---|---|
| **Keep** | the constraint holds for the target audience's domain as written and as worded | carry it with its wording unchanged, apart from language and layout |
| **Adapt** | that domain has the referent and only values differ: path, command, parameter, limit, name | instantiate it with the target audience's values: the default stays in the forged skill, and the target audience supplies the instance value in their declared place. A pure tunable needs no configuration surface: a sensible default and that override are enough |
| **Re-bind** | that domain has no referent, or a different one | abstract the constraint to its purpose, find an equivalent means in that domain, and re-concretize an executable expression |
| **Dissolve** | no rung above holds | do not carry it; the row records the target-audience fact that makes it inapplicable, how that fact is checked, and what carries the responsibility instead |

## The constraint table

The record holds one row per disposition unit, filled in as the passes run:

| Column | Content |
|---|---|
| upstream | for a constraint, a locating reference plus a one-line gist; for a deconstruction, the passage's location and every constraint it covers |
| disposition | one of the four rungs, or "Deconstruction" |
| location | where in the forged skill it is written, as a reference; for Dissolve, what carries the responsibility instead |
| basis | one or more of the four kinds below; for Dissolve, the basis also says how the fact is checked |

## Basis kinds

| Basis | Content |
|---|---|
| target-audience fact | a fact as defined in the forge skill's "Terms" |
| purpose | what a change would break |
| upstream | the upstream's text |
| decision | a decision made in this forging: the driver's, or a ruling when no driver answers |

## Burden of proof

A row that changes a constraint bears the burden of proof. An Adapt, Re-bind or Dissolve row states the purpose it preserves and what forced the change: a target-audience fact, an upstream requirement, or a decision. A Deconstruction row states the purpose of the way of working and the constraints it covers.

## Coverage

A source constraint is covered by a unit when that unit's decision applies to it. A deconstruction unit covers the constraints its passage states; every other unit covers exactly one constraint. Every constraint is covered by exactly one unit.

## Honesty rules

These govern what the forged skill's text may assert about skills and examples.

- Do not assert which skills the target audience has installed. When the forged skill needs a responsibility, state the responsibility and the order to try: a known skill that bears the responsibility (for example, a code-review skill), then any skill with a similar responsibility. A name in an example is a hint for matching, not a claim that the skill exists.
- Examples stay examples: introduce them with "for example", never let one read as an instruction or a closed classification, and when one leaves the intent ambiguous, ask the driver and record the answer.
