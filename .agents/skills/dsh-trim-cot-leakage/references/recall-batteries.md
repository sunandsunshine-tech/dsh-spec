# Recall batteries

Probes for [the taxonomy](../SKILL.md#taxonomy), tuned during the 2026-08 purge. Every hit needs semantic judgment — the batteries over-match by design, and they under-match by nature: each review round of the purge found cases no battery caught, so pair them with an unpatterned read of the densest prose in scope.

## Running the batteries

The patterns below are the durable part; how they are run is not. Use your own search tool where the environment gives you one, and the shell rendering at the end of this section where it does not.

- **Search hidden paths explicitly.** `.agents/` is where the skill set's own text lives, and the purge's biggest miss risk was Agent Notes; most tools skip dot-directories and hidden files unless told otherwise.
- **Exclude generated, quoted and frozen text, and exclude it last.** A vendored bundle is not authored prose, this skill's own files quote leaked wording as calibration, and `.agents/dsh-spec/notes/archived/` is a frozen snapshot that must not mix into active decisions. Where the tool takes include and exclude globs, put the exclusions after the inclusions so a later include cannot re-admit them — in this repository that is `!vendor/**`, `!vendor-*`, `!node_modules/**`, `!.agents/dsh-spec/notes/archived/**` and `!.agents/skills/dsh-trim-cot-leakage/**`, plus a recorded fixture or snapshot directory in scope; where it takes none, narrow the search to the directories that matter.
- **Case matters per line.** The lines marked case-insensitive are the natural-language ones, so sentence-initial capitals hit ("This PR adds…", "Probably fine…"); the first English line matches code patterns and stays case-sensitive, because case-insensitivity turns `\bT\d\b` and `\bP-I\b` into noise.
- **Bound complete phrases.** `\bthis PR\b` must match "this PR adds" without matching "this project", "this process", or "this provider".
- **Calibrate before trusting.** A zero-hit pattern proves nothing until it matches a known positive, and a noisy pattern proves nothing until it rejects a near-miss negative.
- **Target authoring-language probes at the opposite-language surface.** Search Chinese residue in otherwise-English Markdown and code comments or API documentation, and search Chinese change narration within `*.zh.md`. A generic ASCII search for English residue in Chinese prose is too noisy around code and identifiers; compare the prose additions against their counterpart instead.

## English battery

Each line is one pattern; the comment names what it targets and whether it is case-insensitive.

```sh
# Decision, audit and planning residue (case-sensitive)
\(decision \d|\(audit [A-Z]\d|design §|plan §|design ledger|\(B ruling|\bP-I\b|\bW\d\b|\bT\d\b

# Stack or review vantage (case-insensitive)
\bthis PR\b|\bthis branch\b|\bthis stack\b|\blater PRs?\b|\bprevious commits?\b|\bthis commit\b

# Change narration (case-insensitive)
\bused to\b|\bno longer\b|\bpreviously\b|\bthe old\b|\bwas renamed\b|\bwas moved\b

# Planning residue (case-insensitive)
\bv1\b|this cut|\bcut \d|\btoday\b|\bfor now\b|roadmap

# Review choreography (case-insensitive)
rejected in review|review round|reviewer|as of v\d

# Hedging (case-insensitive)
probably |should be enough|should suffice|it simply|is safe —|is safe --

# Section citations with no committed owner (case-sensitive)
§\d
```

## Chinese batteries

Each line is one pattern; the comment names the surface it belongs to.

```sh
# Change or review narration — run against *.zh.md only
评审|上一?轮|旧版|老的|不再|以前|本版|遗留

# Chinese authoring-language slips — run against Markdown that is not *.zh.md
设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|(^|[^a-zA-Z])端([^a-zA-Z]|$)

# Chinese authoring-language slips in code comments and API documentation
(^[[:space:]]*(//|/\*|\*)|//|/\*)[^\r\n]*(设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|端)
#[^\r\n]*(设计稿|评审|上一?轮|旧版|老的|不再|以前|本版|遗留|私有|端)
```

## Shell rendering

Where no search tool is available, `grep` runs the same patterns: one pattern at a time, `-r` over the tree, `-n` for line numbers, `-E` for the pattern dialect above, `-i` only on the lines marked case-insensitive, and `--exclude-dir` for the exclusions. GNU `grep` reads `\b` directly; a POSIX-only one needs `-P` or a rewritten pattern. Name the hidden directories you mean (`grep -rn … . .agents`) rather than assuming recursion reaches them. Where `rg` is installed, `rg -n --hidden -g '!vendor/**' …` renders the same thing.

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
