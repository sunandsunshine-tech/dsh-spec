# Archive contract

The archive is the frozen record of decisions the project has finished with. It exists as evidence: what was decided, what it beat, what it cost. A sealed unit is never modified again, so the archived bytes stay the bytes that shipped, and an append-only manifest records exactly what was sealed.

The archive is not authority for current behavior: new decisions and facts belong in an active note or current documentation. Active prose may link into it when intentionally citing history, and must otherwise name current authority instead. Documentation gates skip archived sources, including their outbound links.

## What enters

Only an `implemented/` note may enter. Before archiving, apply [the pruning criteria](notes-contract.md#pruning-the-active-tree) and the [supersession check](notes-contract.md#when-to-write-one):

- **Archive** a substantive historical decision that is complete and unlikely to guide future work, but whose rationale still warrants preservation.
- **Keep active** a note whose rationale, alternatives, negative guarantees, durable or wire semantics, ownership boundary, security rule or reintroduction condition still guides work.
- **Delete** a unit that only describes small presentation or mechanical changes; do not archive it.
- **Never archive a proposal** — reject it instead. Handle a rejection by its own guardrail rule.

Establish whether a rationale still owns or constrains anything from the project's current code, configuration, package documentation, generated catalogs, newer notes and inbound links — never from the age of the record. The decision is semantic. Word count, age and a target quota are never archive criteria; inspect every note in scope and record genuinely borderline cases for the handoff. These archetypes calibrate the line without deciding it:

- **Delete:** a closed presentation adjustment (a collapsed control rail, a renamed label); a completed function or file relocation with unchanged behavior.
- **Keep:** a foundational authority or durability boundary; a cross-product ownership rule; a durable storage or identity policy; a gate-scheduling rule still tuned in practice; a dropped capability that states a coordinated reintroduction condition.
- **Rejected:** keep a rejection whose losing proposal is still a tempting merge; delete one whose premise is obsolete; delete one a later decision already resolved.

## Path and units

The archive root is always `{notes root}/archived`, a frozen branch of the same notes tree; there is no separate archive location. The path is `{notes root}/archived/{class}/{stem}`; `implemented` is deliberately absent from it because only implemented notes can enter.

- A **unit** is the note plus every companion the project declares for it (translations in any language, consistency records, diagrams — declared with repeated `--companion <suffix>`). The unit moves, seals, and is deleted as one.
- The six class directories (`feature`, `bug-fix`, `simplification`, `architecture`, `process`, `testing`) are required. `init` creates them with `.gitkeep` placeholders in empty class folders; the gate ignores those placeholders inside class folders, and they never enter the manifest. A root-level `.gitkeep` is not a placeholder.
- Class directories contain regular files only. The gate rejects an unknown class directory and any root file other than `manifest.json` or an optional, ignored `AGENTS.md`.
- An empty class directory is allowed and holds no unit; the gate rejects unknown kinds, gaps in the six known directories, and unknown root files.
- The manifest lives at `archived/manifest.json`. The archive's rules live in this skill; an `archived/AGENTS.md` is permitted for a project that keeps one, but it is not required, ignored by the gate and not sealed.

## The archival change

An archival change makes exactly these moves and edits:

1. Initialize the tree once if the project has no notes tree: `node <skill-dir>/scripts/notes.mjs init` creates the lifecycle and class folders and the six archived class folders with ignored placeholders, and never overwrites an existing file.
2. Move the complete unit from `implemented/{class}/` to `archived/{class}/`.
3. Make no body edits. Insert `Archived: YYYY-MM-DD` immediately below the sole `Status: implemented` line in every Markdown side of the unit, using the archival date, identical on every side. The date may not predate the note's filename date.
4. Re-record the companions' consistency records through the project's own pairing mechanism; the metadata edit changes their hashes.
5. Search for inbound links from active prose. Redirect them to current authority, retarget them to the archived path only when the historical snapshot is intentionally cited, or delete them. Never inspect, verify or repair links out of the archived note.
6. Seal, stage and verify:

   ```sh
   node <skill-dir>/scripts/notes.mjs archive --write --companion <suffix>
   git add <notes root>/archived
   node <skill-dir>/scripts/notes.mjs archive
   ```

   `--write` first proves every existing seal against the baseline, enforces every declared companion suffix for a newly sealed unit, refuses an artifact added to an already sealed unit, and appends only the new hashes; it writes nothing when a check fails. In CI, pass the trusted pre-change commit with `--base-ref <ref>`.

Existing title punctuation, blank-line layout and language-switcher wording do not block archival; preserve them with the body. Nothing else about the unit changes. In particular, do not translate, reformat, update facts, repair links inside the note, or fold the archive step into another unrelated edit.

## The frozen guarantee

Once a unit is sealed it is permanently frozen: never edit, update, move, translate, reformat or delete it, and never add a companion to it. It remains a valid inbound-link target as a historical snapshot, never as current authority.

The guarantee rests on `archived/manifest.json`:

```json
{
  "version": 1,
  "files": {
    "feature/2026-01-05-an-example-decision.md": "sha256:…",
    "feature/2026-01-05-an-example-decision.zh.md": "sha256:…",
    "feature/2026-01-05-an-example-decision.i18n.yaml": "sha256:…"
  }
}
```

- `version` is `1`; `files` maps each sealed artifact path, relative to `archived/`, to its lowercase SHA-256 content hash.
- The manifest is append-only: every sealed path keeps its hash and new paths are appended. A changed, missing or removed entry is a broken seal.
- The manifest is rendered deterministically (two-space JSON, sorted paths, trailing newline) so a reseal is a no-op when nothing changed.
- The baseline is the manifest at the trusted pre-change commit, read at the manifest's project-relative resolved path. Locally that is `HEAD`; in CI pass the protected branch's commit with `--base-ref`. A baseline without the manifest means the archive starts empty; a baseline that cannot be read is a handover, not a pass.
- Verification trusts the working tree, the Git index and the project's branch history. A local actor who can fabricate `.git` layouts, plant a manifest at the correct path without committing it through review, or rewrite history is outside the guarantee; the project's CI and protected history are the anchor. The gate does not enumerate worktrees, gitfile views or `core.worktree` spoofs: it checks that the notes root resolves inside the project checkout and outside the project's Git directory, that the archive root belongs to the same absolute Git directory, and that a non-empty manifest is tracked by Git.

Verification proves the manifest is well formed, every listed artifact is present and unchanged, every archived artifact is listed, the closed class tree is intact, and the manifest did not lose or alter an entry relative to the baseline. Seal-time checks decide a newly sealed unit's metadata and completeness; verification does not re-validate frozen history or replay a declaration, so adding a language later does not require editing or re-verifying frozen units. A manifest committed through the project's review and CI is the trusted baseline; a manifest planted or left untracked in a local working tree is not. The project's CI and protected history are the anchor, not an adversarial local editor. It does not reconstruct the archive from arbitrary Git history and it grants no seal exceptions. The project's own CI, protected history and review are the trust for the baseline; rewriting history without an external reference makes the freeze unprovable, and that is a handover.

## Sealing and verification

Run from inside the project's Git checkout; `<skill-dir>` below stands for this skill directory, and the gate finds the project root through Git. Git is required. The notes root and archive root must resolve inside the project root outside the project's Git directory, and the archive root must belong to the project's absolute Git directory. The gate does not enumerate Git layouts: linked worktrees, submodule checkouts and separate Git directories are ordinary checkouts when those invariants hold; a bare repository, or a directory that is not a checkout, is a handover.

```sh
node <skill-dir>/scripts/notes.mjs init
node <skill-dir>/scripts/notes.mjs archive --write
node <skill-dir>/scripts/notes.mjs archive
```

`init` creates the required six class directories and their ignored placeholders in empty class folders; a project without them fails the archive check until it initializes. The initialized skeleton needs a commit before the first seal, because the baseline is read from Git. The default notes root is `.agents/dsh-spec-agent-notes/`; `--root <dir>` selects another directory inside the project root. The archive root is always `<notes root>/archived`.

`--write` runs every verification first and writes nothing when any check fails; then it appends the new unit's hashes and rewrites the manifest only if the rendering differs. Without `--write`, an unsealed artifact is a violation that names the sealing command, and a non-empty manifest must be tracked by Git (staged or committed) so a first seal cannot verify against an empty baseline before it enters the branch. The flow is seal, stage or commit the archive, then verify. Verification is declaration-free: it compares the manifest and never re-validates archive metadata, companion grouping or new-unit completeness over frozen history.

Options: `--root <dir>` for a non-default notes root, `--base-ref <ref>` for the trusted pre-change commit, `--companion <suffix>` repeated for declared companion files, `--json` for a machine-readable summary. Exit codes: `0` every check passed, `1` the archive violates its rules, `2` usage error.

Every archive invocation decides:

- the archive tree has the six known class directories, regular files only, and only the allowed root files;
- every sealed artifact is present and has the sealed content;
- no archived artifact is missing from the manifest and no listed artifact is missing;
- no manifest entry was removed or changed relative to the baseline, and no unsealed addition is present;
- the manifest schema is exactly `version` and `files`, every hash is a well-formed SHA-256, and a non-empty manifest is tracked by Git in the project.

`--write` adds the seal checks before appending: a newly sealed unit is complete under the declared companion suffixes, its filename pattern and source note are present, its Markdown sides carry exactly one `Status: implemented` line with `Archived: YYYY-MM-DD` immediately below it and one identical valid date, and an already sealed unit cannot gain an artifact. A frozen artifact whose suffix is no longer declared is left untouched; a new non-Markdown artifact with no declared suffix is rejected, while a new undeclared Markdown file is classified as its own note. Historical units are not re-validated against their metadata or the declaration that sealed them; verification reads the manifest instead.

Judgment still decides whether a unit belongs in the archive at all.

## Handover

Stop and report instead of repairing when:

- a sealed artifact is missing, changed or unlisted, or the manifest would lose or change an entry;
- the manifest is malformed, the notes root or archive root resolves outside the project root after symlinks are followed, the archive root is not part of the project's Git directory, or the notes root or archive root is inside the project's Git directory;
- the manifest lists artifacts but is not tracked by Git in the project (stage or commit the seal before verifying);
- the project has rewritten the history the manifest was sealed against and cannot supply an external trusted `--base-ref`;
- the baseline commit cannot be read, or there is no Git repository;
- a needed change touches a sealed unit, or a companion would be added to one. That is a maintainer-owned migration or a new active note, never an in-skill exception.

## Reporting

Report units archived, units kept, units deleted, proposals rejected, rejections kept or deleted, and every genuinely borderline case with its outcome. Do not claim archived outbound links are valid: the archive verifier intentionally never checks them.
