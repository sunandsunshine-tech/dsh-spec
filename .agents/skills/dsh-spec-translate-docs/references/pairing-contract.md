# Pairing contract

The rules the skill's script enforces and the workflow follows. The check verifies **existing
pairs**; creation and update are driven by the project's declaration or the user's instruction.
Nothing here requires a source to be paired.

## The pair

A pair is:

- a source document `foo.md`, with no language suffix;
- one counterpart per target: `foo.zh.md` for the default target, `foo.<lang>.md` otherwise;
- one **aggregate** record for the source: `foo.i18n.yaml`, holding every target language.

A source may have counterparts in any subset of the declared targets; different sources may carry
different target sets. There is no completeness rule and no "required" pair.

The source language is a property of the source file: it is the code on the source hash line
of every record section once one exists. When the first record is written it is supplied with
`--source-lang <code>[=<display>]`, defaulting to `en` only when the flag is omitted; the record
stores the code and never the display. A source filename must not carry a target suffix;
`foo.fr.md` is the fr target's counterpart, not a source. Mixed source languages are created by
writing each source separately, not by one `write --all` command.

The default target is `zh` (display name `中文`). An explicit non-default target must carry a
display name (`--target ja=日本語`); `--target zh` alone resolves to `中文`.

## The record

One aggregate record per source, flat: every section has one source hash line and one target
signature line per target. No nested blocks and no per-target source version.

    # Pairing consistency record for guide.md (references/pairing-contract.md): per heading
    # source hash plus one target signature per target; a target signature binds the source hash.
    # Re-record with:
    #   node <skill-dir>/scripts/translate-pair.mjs write docs/guide.md --target <lang>
    /guide:
      fr: 41d772192075e133
      ja: 0b7d5e4f8a9c1d2e
      zh: dda91c6c670cfd9d

- H(source, target) is SHA-256 over the UTF-8 string source + a newline + target, truncated to the
  first 16 hexadecimal characters. source and target are the 16-hex content hashes of the two
  sides. A recorded target signature is H(sourceHash, targetContentHash), so it binds the exact
  source version it was confirmed against.
- A section's content hash covers its translated blocks, excluding fenced code and generated
  regions; a section with no translated content on either side has no entry.
- The canonical comment and blank lines are ignored when the check compares the body; body order
  and formatting are enforced. Section order is the current source document's heading order;
  sections no longer present are dropped. Canonical body order is the source hash line first
  (keyed by the source language code), then target signature lines sorted by target code.
- Section keys are heading paths; repeated paths get ~2, ~3, ... in document order.
- write --target <lang> updates the source hash line and only that target's signature. If the
  source changed, the other targets' signatures are bound to the earlier source and the check
  reports them out of sync; they are not silently confirmed. Translating targets one at a time is
  supported: edit a counterpart, write --target, then continue with the next; untouched targets
  stay red until written. Writing a target before editing it confirms the unchanged content, so
  write only after the edit. Concurrent writes for one source are read-modify-write races; run them
  sequentially.
- write --all updates every existing target signature of the selected source in one render and
  drops a recorded target whose counterpart is gone. When the last target is dropped the record
  file is removed. A named write --target never drops a target.
- A target counterpart without a target signature line, or a target signature line without a
  counterpart, is an incomplete pair for that target.
- The record path is always foo.i18n.yaml; there is no per-target record file.
- The record is generated. Do not hand-edit it; write is the only record mutation. write --all is
  the migration path: it replaces an old or unreadable record body for a selected source by
  rendering the current aggregate record, while a named write --target refuses a malformed record.

## Selection, arguments and empty results

Named arguments:

| Argument | Selects |
|---|---|
| `foo.md` or `foo` | every target that has a counterpart or a record entry for the source; `--target` narrows |
| `foo.zh.md` | that target's pair |
| `foo.i18n.yaml` | every target of that source that has a record entry; `--target` narrows |

`--select <glob>` and `--skip <glob>` narrow a corpus-wide run to existing pairs by source path;
they are selection only. They never demand or forbid pairing, never create an "excluded artifact"
violation, and never change link normalization.

Empty results by verb:

| Verb | No existing pair / no selection | Exit |
|---|---|---|
| `list` | report zero rows | 0 |
| `check` | "nothing to check is not a green check" | 2 |
| `write --all` | "nothing to record" | 1 |
| `write <pair>` | a named pair whose artifacts are all absent names no pair | 2 |
| `brief` (no pair, nothing drifted) | "nothing to brief" when pairs exist and all are consistent | 0 |
| `brief` (no pair, no pairs exist) | no pair to consider | 2 |
| `brief <pair>` consistent | a named pair is consistent | 2 |

A named pair with some artifacts present but a missing counterpart is incomplete: `check` exits 1,
`write` exits 2, `brief` exits 2. The script never reads a project config file; the declaration's
facts arrive as flags.

## Language switchers

The switcher is the unique paragraph in the H1 section whose labels and links match the canonical
line. Position is free: a format-mandated `Status:` paragraph may precede it. The source side is

`<source label> | [<target label>](<counterpart path>) | ...`

listing every existing counterpart in language-code order; the counterpart side is

`[<source label>](<source path>) | <target label>`.

- A destination is the relative counterpart path or an absolute URL whose pathname ends with that
  repository-relative path.
- A declared target pins its label; an undeclared existing target's label is learned from its
  counterpart's trailing text.
- The source label is learned from the counterpart backlink. The write-only --source-lang display
  is not stored and does not pin it; the counterpart's link label is authoritative.
- Zero matches, two matches, a wrong label, an extra link or an inline-code quote are violations.
- Only the matched switcher paragraph's links are exempt from the signature and locale checks.
- A source declared with `--generated <glob>` waives only its own switcher; the counterpart
  backlink is still required.

## Structure and links

The check compares the two sides' structural signature: heading depths and order, fenced code
bytes, table row and column counts, list kinds, ordered-list starts and item counts, and semantic
link targets. Paragraph order, inline emphasis and prose wording are review's domain.

Paired-document links normalize to one semantic target. Resolve a destination to its base source
path; that document is a paired document when it has at least one counterpart file or any aggregate
record entry. `--select`/`--skip` do not affect this predicate; only existence does. Adding or
removing a pair changes normalization for links that point at it, so affected existing pairs must
be re-recorded in the same change.

## Generated regions

The marker shell follows the upstream shape; the layout rules are this skill's:

```markdown
<!-- BEGIN GENERATED config-catalog:@scope/package -->
| ... |
<!-- END GENERATED config-catalog:@scope/package -->
```


- BEGIN and END occupy their own line at column 0. The exact shell is
  `^<!-- BEGIN GENERATED (\S+)(?: [^>]*)? -->$` for BEGIN and
  `^<!-- END GENERATED (\S+) -->$` for END: the slug is one non-whitespace
  token, BEGIN may carry a trailing note, END may not. A line that starts like a marker after
  optional leading whitespace or an inline comment but does not parse as one is a malformed marker.
- A marker must be its own block: blank lines or document boundaries around the region as a whole;
  region content may abut its markers.
- Markers inside fenced code are ordinary code, including a fenced marker sample inside a region.
- Nested BEGIN, END without BEGIN, slug mismatch, an unclosed BEGIN, a duplicate slug in one file,
  a malformed marker-shaped line, a marker inside a list or paragraph, and a marker-shaped line
  inside a region's content are violations.
- Before sectioning, structure-signature computation and record hashing, every region line is
  replaced by spaces of the same length; line numbering and offsets are preserved. A generated
  heading therefore never creates a section, signature entry, locale violation or record input.
- Both sides' regions must have the same slugs, order and content after paired-document link
  normalization, and each region must sit under the same authored section on both sides (the
  nearest preceding authored heading's ordinal; a region before the first heading has ordinal 0).
  A mismatch says "regenerate both sides".
- Regenerating both sides changes neither the record nor the section keys. A briefing excludes
  regions: aligned regeneration says nothing to brief; disagreeing current regions are a
  precondition failure.
- Only the generator edits a region. The skill exposes `region render` and `region splice` as a
  correctness-enforcing CLI for generators; it exposes no JavaScript generator API. `render --slug
<slug> --body <file|->` prints the two marker lines and the body, validated against the shell and
  rejecting a body that contains a marker-shaped line. `splice <file> --slug <slug> --body
<file|->` requires the file to contain exactly one region with that slug, replaces only that
  region, validates the whole resulting document against the marker grammar (own block, fence,
  duplicate slug, unclosed), and writes only on success. It never creates, moves, inserts or removes
  a region; zero or multiple matches exit 2, as does an invalid body.

## Discovery

The script walks the repository from its root, entering hidden directories, skipping `.git` and
symlinks, and matching `.md` and `.i18n.yaml` files. The default prune trees are:

`node_modules`, `vendor`, `dist`, `build`, `out`, `target`, `coverage`, `__pycache__`,
`.venv`, `.cache`, `.pnpm-store`, `.agents/skills`, `.agents/dsh-spec-translate-docs`.

A bare prune name matches a directory at any depth. A frozen or vendored tree is kept out of the
work by the declaration and `--skip`; it is not a corpus exclusion state.

## Project data

- **Terminology.** Default root `.agents/dsh-spec-translate-docs/`; default files `terminology.md`
  for the default target and `terminology.<lang>.md` for another target. `--terminology
  <lang>=<path>` overrides the path; location and naming are otherwise the project's. The table
  format is fixed: source term, target rendering, first-occurrence form, forbidden renderings, note.
  `init` writes the template for one target and never overwrites an existing file. `brief` requires
  the target's table and exits 2 with the init hint when it is missing.
- **Style.** [style-examples.md](style-examples.md) is the skill's default style file: guidance plus reviewed English-to-Chinese samples, read before every translation including a lightweight update. The project's declaration may name its own style file in any location or format; that file replaces the default whole file. The binding priority lives in [translation rules](translation-rules.md); the style file points to it. No project path is required and the script never reads style files.

## The script

Verbs:

| Verb | What it does |
|---|---|
| `list` | report existing pairs as `ok`, `out-of-sync` or `missing`; exit 0 |
| `check [pairs]` | verify named pairs or every existing pair; 0 clean, 1 violations, 2 usage or empty selection |
| `write [pairs] \| --all` | recompute the selected targets' recorded hashes; `--all` also drops recorded targets whose counterpart is gone; 0 written, 1 nothing to record, 2 a named pair is incomplete or a record is malformed |
| `brief [pairs]` | print the minimal-update briefing; `--apply` for a code-fence-only change; 0 nothing to brief, 1 the mechanical splice would violate structure, 2 a precondition |
| `init` | write one target's terminology template; 0 created or already exists, 2 usage |
| `region render --slug <slug> --body <file\|->` | print a marker-delimited region |
| `region splice <file> --slug <slug> --body <file\|->` | replace the one existing region and validate the whole file; 0 written, 2 usage or validation |

Shared options: `--target <lang>[=<display>]` (repeatable), `--source-lang <code>[=<display>]`
(write only, first record; the code is stored, the display is not), `--select <glob>`,
`--skip <glob>`, `--generated <glob>`, `--terminology <lang>=<path>`, `--root <dir>`,
and the verb-specific `--apply` and `--all`.

Exit codes are 0 (clean or written), 1 (violations or nothing to record) and 2 (usage or a
precondition). A failed write, splice or `--apply` writes nothing.

## What the check decides, and what review owns

The check decides: pair completeness for the selected targets, recorded hashes matching current
content, canonical record body, switchers, structural signature, generated-region equality and
section anchors, generated-source exemption and link locale. It does not decide translation
quality, terminology choice, list or table order, noncanonical numbering, inline code, emphasis,
meaning or tone; review owns those. A green check means the pair was confirmed consistent at these
exact contents, not that the confirmation was sound.
