# Process rules

The rules that govern the forging itself: the record, the draft and the landing, the languages, escalation and rulings, and the deliverable boundary. Read them before step 1.

## The record

- Locate it by the first of these that holds:
  1. the decision mechanism the adopter's declared place names — a notes tree, an ADR set, or a decision log;
  2. the place the driver names;
  3. with no mechanism named and no driver, `<draft's parent>/forge-record/<name>.md`, the draft's parent being settled in "The draft and the landing"; create `forge-record/`;
     - if that file exists, stop and report.
- Bind the contents to the mechanism's form (a note's sections, an ADR's fields). It owes: the settings, the anchor list, the constraint table, the dispositions and bases, the verification results, the gate output, the acceptance; without a mechanism, the fallback file uses these headings.
- Write each settled decision when it is settled, before asking the next question.
- When a later decision conflicts with an earlier one:
  - ask the driver before overwriting it, and record the conflict;
  - with no driver, settle the conflict by a ruling and record the conflict and the ruling.
- Never put the record inside the forged skill's directory.

## The draft and the landing

- The draft is the working copy of the forged skill.
- Step 1 settles the name and two parent directories: the draft's parent (the draft lives as `<name>/`) and the forged skill's parent (the skill lands as `<name>/`).
  - The adopter's declared place names them; the driver names what that place leaves open.
  - With no location named and no driver, both are the working directory: the draft is `./<name>/`, and it lands there;
    - if `./<name>/` existed before the forging, stop and report.
- A rendition is its own skill directory, so the gate can check it: write it at `<draft's parent>/rendition/<name>/`, the last segment the skill name the gate requires.
- The landed artifact is the draft, or the rendition when one was made. Step 5 places it at its path under the forged skill's parent.
- In Iteration, landing replaces the existing skill; the record names what was replaced. Iteration needs a driver.

## Languages

- Step 1 settles three languages:
  - **draft language** — the adopter's language, or the request's when no adopter is present;
  - **target language** — English by default;
  - **request language** — the language of requests the forged skill should also trigger on; Chinese by default, or none.
- **Rendition** — the target-language version of the draft. Make it when the draft language differs from the target language and either condition holds:
  - the gate on the draft has passed (step 5, item 1);
  - the forged skill will be run for real: at least one real request or script executed.
- When the draft language is the target language, the draft is the landed artifact; no rendition is made, and the record says so.
- A rendition copies the draft directory: it translates `SKILL.md` and `references/`, and copies `scripts/` and `assets/` unchanged.
- A rendition keeps one concept per designator on both sides, introduces no concept or designator the draft does not have, and follows the target language's usage rather than translating word for word.

## Escalation and rulings

- **Escalate** means: stop and put the case to the driver, with a recommendation and two or three options.
- Escalate when:
  - two source constraints' purposes conflict;
  - a source purpose conflicts with a red line — a rule of the target audience's domain that nothing may override;
  - a target-audience fact a disposition needs cannot be established;
  - a designator cannot be disambiguated;
  - the upstream states no purpose that a re-bind needs;
  - a case these criteria do not cover.
- With no driver, settle the escalation by a ruling and record it. When the ruling that changes least is to stop, stop and report the blocker.
- A ruling is an instance decision: record it, and never write it back into this skill's criteria. A design change the driver asks for is a decision about the artifact, applied through the dispositions; it is not a ruling.

## Deliverable boundary

- The forged skill is the deliverable: a directory whose required file is `SKILL.md`, optionally carrying `scripts/`, `references/`, `assets/` and further files, following the specification.
- The record and the draft are not part of the deliverable.
- The forging writes the forged skill and the record; it does not write the target audience's declared place.
- Keep every relative link inside the skill root and one level deep, and name every markdown file under `references/` in `SKILL.md`; the gate enforces both.
- Cite a file the forged skill ships by its path (`scripts/<file>`, `references/<file>`). Name a file of another environment in words, not as such a path or a link, so the skill stays portable and the gate's script and link checks are not tripped by a foreign path.
