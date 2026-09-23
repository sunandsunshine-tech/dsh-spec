# Recall batteries

Probes for [the taxonomy](../SKILL.md#taxonomy), tuned during the 2026-08 purge. Every hit needs semantic judgment — the batteries over-match by design, and they under-match by nature: each review round of the purge found cases no battery caught, so pair them with an unpatterned read of the densest prose in scope. A zero-hit pattern proves nothing until it matches a known positive, and a noisy one proves nothing until it rejects a near-miss negative. Bound complete phrases: `\bthis PR\b` must match "this PR adds" without matching "this project", "this process", or "this provider". Target authoring-language probes at the opposite-language surface — Chinese residue in otherwise-English Markdown and comments, and Chinese change narration inside `*.zh.md` — because a generic ASCII search for English residue in Chinese prose is too noisy around code and identifiers.

## Exclusions

Generated, quoted and frozen text is not authored prose, and a search that reads it returns hits nobody should act on. Leave these out, and leave the exclusions last so a later inclusion cannot re-admit them:

- `vendor/**`, `vendor-*`, `node_modules/**` — vendored dependencies. This repository's bundle is `vendor-mdast.mjs`; there is no `vendor/` directory.
- `.agents/dsh-spec/notes/archived/**` — the frozen archive, a historical snapshot that must not mix into active decisions.
- `.agents/skills/dsh-trim-cot-leakage/**` — this skill's own files, which quote leaked wording as calibration.
- A recorded fixture or snapshot directory in scope — its output is evidence, not usage.

`.agents/` is corpus rather than an exclusion: an Agent Note is where this purge finds its misses, so a search that cannot reach a dot-directory reads the wrong tree.

## English battery

Each line is one pattern; the comment names what it targets and whether it is case-insensitive. The commands are one rendering of them with the exclusions above applied last — `-i` on the natural-language lines so sentence-initial capitals hit, and no `-i` on the first line, where it would turn `\bT\d\b` and `\bP-I\b` into noise.

```sh
# Decision, audit and planning residue (case-sensitive)
rg -n --hidden '\(decision \d|\(audit [A-Z]\d|design §|plan §|design ledger|\(B ruling|\bP-I\b|\bW\d\b|\bT\d\b' ...

# Stack or review vantage (case-insensitive)
rg -n --hidden -i '\bthis PR\b|\bthis branch\b|\bthis stack\b|\blater PRs?\b|\bprevious commits?\b|\bthis commit\b' ...

# Change narration (case-insensitive)
rg -n --hidden -i '\bused to\b|\bno longer\b|\bpreviously\b|\bthe old\b|\bwas renamed\b|\bwas moved\b' ...

# Planning residue (case-insensitive)
rg -n --hidden -i '\bv1\b|this cut|\bcut \d|\btoday\b|\bfor now\b|roadmap' ...

# Review choreography (case-insensitive)
rg -n --hidden -i 'rejected in review|review round|reviewer|as of v\d' ...

# Hedging (case-insensitive)
rg -n --hidden -i 'probably |should be enough|should suffice|it simply|is safe —|is safe --' ...

# Section citations with no committed owner (case-sensitive)
rg -n --hidden '§\d' ...
```

## Chinese batteries

Each line is one pattern; the comment names the surface it belongs to.

```sh
# Change or review narration — run against *.zh.md only
rg -n --hidden '评审|上一?轮|旧版|老的|不再|以前|本版|遗留' --glob '*.zh.md' ...

# Chinese authoring-language slips — run against Markdown that is not *.zh.md
rg -n --hidden '设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|(^|[^a-zA-Z])端([^a-zA-Z]|$)' --glob '*.md' --glob '!*.zh.md' ...

# Chinese authoring-language slips in code comments and API documentation
rg -n --hidden '(^[[:space:]]*(//|/\*|\*)|//|/\*)[^\r\n]*(设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|端)' --glob '*.{ts,tsx,js,jsx,mjs,cjs,css}' ...
rg -n --hidden '#[^\r\n]*(设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|端)' --glob '*.py' ...
```

## Known false-positive families

Judged and kept during the purge; expect them again:

- **Instrumental "used to"** — "the key used to sign requests" is instrumental, not temporal. The temporal form has a subject state before it ("colors used to come from…").
- **Runtime old/new** — "the old connection drains before the new one accepts" names live objects during handover, not repo states.
- **"This PR" in process docs** — documentation *about* PR workflow ("the PR body should…", templates, this repo's process notes) legitimately says "PR"; the ban is on a doc adopting one PR's vantage about the code.
- **`v1` as protocol or path segment** — `/v1/chat` endpoints and wire-format names are identifiers, not version stamps.
- **`§N` with a committed owner** — external standards (RFC 9110 §10.1.5) and committed docs that own their §-numbering stay citable by section.
- **Contrastive "actually" and noun "wait"** — ordinary English, not hedging; no committed line probes them, so they surface only when you extend the battery with broader hedging patterns.
- **Runtime "today" and recorded timestamps** — prompts or tests that ask for the current date use natural time, not a repository version stamp; recorded CLI output keeps its voice. Wording that reaches a model or user still follows the behavior-evidence rule before any edit.
- **本版本 in zh prose** — a legitimate rendering of "this release" in versioned-artifact contexts; the banned indexical is 本版 as a bare stamp mirroring "this cut".
- **Alternatives-considered sections** — "rejected" inside an Agent Note's genre slot is the sanctioned home, not review choreography.
