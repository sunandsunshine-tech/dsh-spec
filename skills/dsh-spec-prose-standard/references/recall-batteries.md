# Recall batteries

Probes for [the leakage classes](../SKILL.md). The batteries over-match by design and under-match by nature: every hit needs semantic judgement, and a battery-led pass misses cases a full read catches. Pair them with an unpatterned read of the densest prose in scope.

The examples in this skill quote leaked wording as calibration material. A scan therefore excludes this skill's own directory, and any self-hit is judged as evidence rather than usage.

## Invocation rules

- Add the search tool's hidden-directory option so dot-directories are searched: for ripgrep that is `--hidden --glob '!.git/**'`. Decision records and agent instructions commonly live under dot-directories, and a scan that skips them misses the densest text.
- Put exclusions last so a later include cannot re-admit them: third-party trees, the project's frozen archive, this skill's own directory, and any recorded fixture or snapshot directory in scope.
- Natural-language lines carry `-i` so sentence-initial capitals hit ("This change adds…", "Probably fine…"); a line that matches code tokens stays case-sensitive — `-i` would turn phase-label and identifier patterns into noise.
- Bound complete phrases, not stems: `\bthis PR\b` must match "this PR adds" without matching "this project", "this process", or "this provider", and the same applies to every short phrase below.
- A zero-hit pattern proves nothing until it matches a known positive, and a noisy pattern proves nothing until it rejects a near-miss negative. Calibrate both before trusting a corpus result.
- Target authoring-language probes at the opposite-language surface: for example, search the project's working language inside otherwise-English Markdown, and search change narration inside translated counterparts. A generic search for the other language in the middle of code and identifiers is too noisy; where the residue is an addition to a translated pair, compare it with the counterpart instead.
- These probes are discovery aids, not the definition. Read the densest prose in scope — module documentation, READMEs, decision records — without a pattern in hand.

## English battery

Replace `<scope>` with the requested paths and `<exclusions>` with the last-position exclusions from the rules above.

```sh
# Dead design-session citations and phase labels.
rg -n --hidden '\(decision \d|\(audit [A-Z]\d|design §|plan §|design ledger|\(B ruling|\bP-I\b|\bW\d\b|\bT\d\b' <scope> <exclusions>

# Change and series vantage.
rg -n --hidden -i '\bthis (PR|change|branch|commit|series)\b|\blater (PRs?|changes?)\b|\bprevious (commits?|changes?)\b|\bin this (stack|series)\b' <scope> <exclusions>

# Change narration and version stamps.
rg -n --hidden -i '\bused to\b|\bno longer\b|\bpreviously\b|\bthe old\b|\bwas renamed\b|\bwas moved\b' <scope> <exclusions>
rg -n --hidden -i '\bv1\b|this cut|\bcut \d|\btoday\b|\bfor now\b|roadmap' <scope> <exclusions>

# Review choreography.
rg -n --hidden -i 'rejected in review|review round|reviewer|as of v\d' <scope> <exclusions>

# Reviewer-addressed justification and hedges.
rg -n --hidden -i 'probably |should be enough|should suffice|it simply|is safe —|is safe --' <scope> <exclusions>

# Section numbers of drafts.
rg -n --hidden '§\d' <scope> <exclusions>
```

## One worked example: a bilingual project

A project's language pair is its own. The probes below are one worked example of the shape, not a fixed list; replace the pair with the project's own languages.

```sh
# Change or review narration in Chinese counterparts.
rg -n --hidden '评审|上一?轮|旧版|老的|不再|以前|本版|遗留' --glob '*.zh.md' <scope> <exclusions>

# Chinese authoring-language slips in otherwise-English Markdown.
rg -n --hidden '设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|(^|[^a-zA-Z])端([^a-zA-Z]|$)' --glob '*.md' --glob '!*.zh.md' <scope> <exclusions>

# Chinese authoring-language slips in English code comments and doc comments.
rg -n --hidden '(^[[:space:]]*(//|/\*|\*)|//|/\*)[^\r\n]*(设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|端)' --glob '*.{ts,tsx,js,jsx,mjs,cjs,css}' <scope> <exclusions>
rg -n --hidden '#[^\r\n]*(设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|端)' --glob '*.py' <scope> <exclusions>
```

## Known false-positive families

These families recur in every corpus. Several restate keep rules in [the leakage section](../SKILL.md); the rest are probe-level calibration, so judge a hit before deleting it.

- **Instrumental "used to"** — "the key used to sign requests" is instrumental, not temporal. The temporal form has a subject state before it ("colors used to come from…").
- **Runtime old and new** — "the old connection drains before the new one accepts" names live objects during handover, not project states.
- **"This change" in process documents** — documentation about the change workflow (templates, process records) legitimately names a change; the ban is on a document adopting one change's vantage about the code.
- **`v1` as protocol or path segment** — versioned endpoints and wire-format names are identifiers, not version stamps.
- **`§N` with a committed owner** — external standards (RFC 9110 §10.1.5) and committed documents that own their section numbering stay citable by section.
- **Contrastive "actually" and the noun "wait"** — ordinary English, not hedging; they surface only when a battery is widened with broader hedging patterns.
- **Runtime "today" and recorded timestamps** — prompts or tests that ask for the current date use natural time, not a project version stamp; recorded command output keeps its own voice. Wording that reaches a model or a user still follows the behavior-evidence rule before any edit.
- **本版本 in Chinese prose** — a legitimate rendering of "this release" in versioned-artifact contexts; the banned indexical is 本版 as a bare stamp mirroring "this cut".
- **Alternatives-considered sections** — "rejected" inside a decision record's alternatives section is the sanctioned home, not review choreography.
