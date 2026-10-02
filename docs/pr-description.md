# Pull-request descriptions

This file carries the descriptions for the two pull requests in the stack. It is a working file: its
content moves into the pull requests, and the file is deleted in the last commit of the stack. The
final acceptance asserts that it is gone.

---

## Lower pull request — the norms catalogue

### What this PR does

Rewrites the norms catalogue: twenty rules in five groups become fourteen that hold for any project,
and every norm gains a one-line red line. `norms.md` becomes generated — an update overwrites each
block from the catalogue, and the `AGENTS.md` hook is rendered from the red lines rather than written
by hand. Personalization goes: a block edited by hand is reported as drift and the update exits
non-zero until it is run with `--force`, and a norm the catalogue dropped is pruned from both the file
and the record. This repository now applies the catalogue itself.

### Why

The catalogue had grown to twenty rules whose overlap needed a three-way merge to resolve, and that
merge was what made a hand edit indistinguishable from a stale one: an adopter could not tell which
blocks they owned. The rules that only made sense for one repository were mixed in with the generic
ones, so the catalogue could not be applied without contradicting the project applying it. Fourteen
rules that hold anywhere, one red line each, and a file that is generated rather than merged is the
end of both problems.

### How

- `references/norms.json` — fourteen norms in five groups; each carries `title`, `titleZh`, a one-line
  `invariant`, the `body` written into the project, and the `source` document that owns the rule.
- `scripts/norms.ts` — `invariant` is required and validated; `norms explain` prints the red line.
- `scripts/norms-apply.ts` — hashing normalizes line endings and trailing whitespace; a block whose
  hash no longer matches its record is `drifted` and the update refuses (`--force` takes the catalogue
  text); a norm the catalogue dropped is `removed` and pruned; the hook is a flat list rendered from
  the invariants; `kept`/`personalized`/`conflict` are gone, and a legacy record's `kept` mark is read
  and dropped rather than refused.
- `scripts/dsh-spec.ts` — `--force` replaces `--take`/`--keep`; a run that leaves a drifted block
  exits non-zero.
- `scripts/help.ts`, `references/cli.md` — the reference follows the flags.
- This repository applies the catalogue: `.agents/dsh-spec/norms/norms.md` and `applied.yaml` are
  added, `AGENTS.md` carries the hook, the note that recorded the opposite decision is cross-linked,
  and the test that held it is reversed.

### How this was verified

Run in this worktree:

```sh
TMPDIR=$PWD/.suite-tmp node --test 'tests/**/*.test.ts'
# ℹ tests 137  ℹ pass 137  ℹ fail 0

node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts check --all --root .
# verify-agent-note-classification: 42 Agent Note(s) checked, structure consistent.
# verify-agent-note-format: 42 Agent Note(s) checked, all conform …
# verify-archived-agent-notes: 9 frozen artifact(s) checked across 6 kind(s).

node scripts/verify-port-provenance.ts
# verify-port-provenance: 16 ported file(s) reconciled against submodules/dsh at dsh-v0.1.7-rc.2 (477b4f42).

node scripts/verify-skill-structure.ts --root skills/<each skill the diff touches>
# the package entry conforms and all N resource file(s) are placed and routed.

node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts status --root .
# ok 9 skill(s) at feat/norms-catalog-v2
```

### Reviewer notes

- The two cases that carry the behaviour change are in `tests/norms-apply.test.ts`: a hand-edited
  block drifts and only `--force` takes the catalogue text, and a norm the catalogue dropped is pruned
  from the record and the file.
- `norms update` on a clean project must stay a no-op: the record's hash is the comparison, so an
  install followed by an update reports `4 norm(s): 4 ok` and rewrites nothing.
- A record written by the previous format carries ` kept` at the end of a line; it is read and
  dropped. An adopter mid-upgrade therefore does not have to edit the record by hand.

---

## Upper pull request — the team workflow skill

Stacked on the lower one.

### What this PR does

Adds `dsh-agent-team-workflow` as the tenth skill: the division of labour inside a team that was
already requested — role contracts for a Lead singleton and Worker, Reviewer and Texter pools, the
task card a piece of work is handed over in, and the derivation of which obligations a step owes from
the norms. Registers it in the installer's manifest, moves every count in the READMEs and `AGENTS.md`,
and records the decision.

### Why

Delegation in this repository worked because a prompt asked for it and the orchestrating context
happened to hold the constraints. Nothing in the skill set carried them, so the next session
re-derived the division — or did not split at all. The skill is the carrier the prompt can rely on.

### How

- `skills/dsh-agent-team-workflow/SKILL.md` — the activation trigger, the roles, the hand-over
  contract, and the rule that a delegated result is a claim until whoever commits runs the acceptance
  command.
- `skills/dsh-agent-team-workflow/references/task-card.md` — the fields a task card carries.
- `references/manifest.json` — the tenth skill.
- `README.md`, `README.zh.md`, `AGENTS.md`, the mechanisms note — every count and inventory.
- Two decision records: the skill shipping, and the delegation note that owns what activates
  delegation, cross-linked.

### How this was verified

```sh
node scripts/verify-skill-structure.ts --root skills/dsh-agent-team-workflow
# the package entry conforms and all 1 resource file(s) are placed and routed.

TMPDIR=$PWD/.suite-tmp node --test 'tests/**/*.test.ts'
# ℹ tests <N>  ℹ pass <N>  ℹ fail 0

node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts status --root .
# ok 10 skill(s) at feat/agent-team-workflow
```

### Reviewer notes

- The obligations the skill derives come from the applied norms; if a norm changes, the skill's list
  changes without an edit to the skill. Read the derivation section for that mapping.
- The two counts in `AGENTS.md` and the five in each README are registration, not policy; if a tenth
  skill is wrong, the manifest is the place to argue with.
- `tests/management.test.ts` now derives its expected skill count from the manifest list rather than
  the literal `9`, so the next skill does not need three assertions edited.
