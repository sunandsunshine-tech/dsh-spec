# Translation rules

How to write the counterpart of a pair. Both sides carry equal authority; the authored side is the
source for that update, and these rules govern producing or updating the other side. The project's
own style and its existing translated documents calibrate voice and formatting; this file states
the language-neutral requirements every side must meet. Rule levels follow RFC 2119 usage: **MUST**
and **MUST NOT** are check- or review-blocking, **SHOULD** needs a stated reason to deviate, and
**MAY** is discretionary.

## Fidelity

- The counterpart MUST state exactly what the authored side states: no added behavior,
  prerequisite, warning, version claim or example, and none dropped. When the pair disagrees on
  substance, neither language wins by default: fix the side that is wrong, then bring the other
  along in the same change.
- The counterpart SHOULD read as natural technical writing in its own language, not a word-by-word
  gloss. Translate meaning, restructure sentences where the target grammar wants it, and keep the
  author's register: terse stays terse.
- Do not translate the untranslatable: when a sentence leans on an idiom of the source language,
  translate the idea, not the idiom.

## Voice and style calibration

- A project's standing instructions may name a style file in any location or format; that file replaces the
  skill's default [style-examples.md](style-examples.md) wholesale. When they name
  none, the default is used. The script never reads style files; only the agent does.
- Source meaning, required structure, the terminology table and these rules always outrank the
  style file. Apply the project's own prose standard or writing guide to both sides; it may not add
  or drop source propositions (when available, use the `dsh-spec-prose-standard` skill). Style samples calibrate voice and wording only; they never override source meaning,
  structure, terminology or protected content. Where a sample and a descriptive voice rule
  disagree, the sample wins only inside those bounds.
- Do not invent a sample or a rendering to justify a phrasing choice; a sample is reviewed
  material, and a decided term belongs in the terminology table through the project's procedure.

## Structure preservation

The two sides MUST match one to one in the structure the pairing check compares:

- heading hierarchy: same depths, same order (heading text is translated),
- fenced code blocks: byte-identical, including comments and the info string,
- tables: same columns and row order (header cells translated per terminology),
- lists: same kind, ordered-list start and item counts,
- inline code spans: verbatim, never translated or reformatted,
- relative document links: the same semantic target and the exact query/fragment suffix; a link to
  a paired document uses the counterpart locale on the counterpart side and the source locale on
  the source side, while the switcher links are the cross-locale exception,
- generated regions: never translated, never edited, byte-identical across the pair after paired
  document link normalization. The generator writes both sides; the check compares them.

Beyond the signature, verify manually: list and table order, noncanonical numbering, inline code,
emphasis, meaning, terminology and tone.

## Terminology

- The project's terminology table binds both directions. Load it before translating, not when a
  term feels uncertain; the terms not noticed are the ones that drift.
- Every listed term renders as its row says, including the first-occurrence form the table
  declares; later occurrences use the bare form.
- A term the table does not list needs a citable precedent in the target language's technical
  writing, or stays in the source language and is listed among pending terms; a source term with
  no unambiguous established equivalent keeps a short explanatory note and is listed as pending.
  Never invent a rendering inline.
- A decided term belongs in the terminology table through the project's procedure, not only in one
  document. Where the project reserves that decision, propose the row; do not add it.

## Writing mechanics

- Follow the project's Markdown formatting conventions; when it declares none, the default style file uses one physical line per paragraph. Code blocks, tables and list structure keep their formatting.
- Write only the final text: no drafts, notes or review markers in the document.
- Preserve the document's frontmatter contract exactly. A span the project's standing instructions mark as
  owned by a generator is the generator's to maintain; a generated source may pair when they
  say so (`--generated` waives only its source-side switcher), but no region is ever
  translated by hand.

## Quality bar

A counterpart is ready for review when the source comparison (nothing added, nothing dropped,
terminology, code, links, structure), the read-alone pass (natural phrasing), and the project's
checks are all satisfied. Translation quality, terminology decisions and tone remain the
reviewer's; the check proves the pair is complete and consistent, not that it reads well.
