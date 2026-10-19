# Rules for a forged skill

These rules bind the forged skill and the draft written while forging it.

## Terms and designators

- A term has one meaning inside the forged skill.
- A concept is cited by one designator: use the exact designator, never a synonym.
- When an everyday word could mean several things, state the meaning it carries where the term is defined.
- Disambiguate once, where the term is first defined.

## Single source and homes

Every definition, rule, and fact goes in the home the table gives. A **home** is defined in the forge skill's "Terms"; every other mention cites it.

| Content | Home |
|---|---|
| the forged skill's concepts and rules | the forged skill, where they are used; at the top of `SKILL.md` only when several steps share them |
| the record's contents, as "The record" lists them | the record |
| the target audience's domain facts and terms | the record as working material; the forged skill defines the terms it uses |
| the target audience's environment (runtime and tools), when the forged skill needs them | the forged skill's `compatibility` and, when there is a script, its header; the record keeps the working facts |
| a value | its default in the forged skill; its instance value supplied in the target audience's declared place when one exists, under the same designator |

- A value is not a definition or rule; the table gives its homes.
- **Check a home**: for each rule, ask where its authoritative text is — which file, which place. An answer that is not unique is a violation.

## Formatting and layout

- Write items that stand together — definitions, rules, options, steps — as a list or a table.
- Write a condition and its branch as a list or a table, not as one sentence joined by punctuation.
- Titles, hierarchy and layout follow the content, taking the form that fits the purpose best: not a template, and not the upstream's own formatting.

## The description

- The description is the skill's trigger: it says what the skill does and when it is used.
- Use words that carry their ordinary meaning. The description is read before the body, so a term defined only there cannot carry a trigger.
- Carry the keywords that identify the relevant tasks, including keywords in the request language when one is set.
