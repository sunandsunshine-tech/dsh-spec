# Contributing

This repository develops the skill set it ships. A change lands through a pull request on `main`, and the commands below run before that pull request is opened.

By the time a pull request is opened, its commits carry a `Signed-off-by:` trailer that names their author, and the work is offered under the repository's MIT license. Two pages beside this one take two kinds of report off the issue tracker: a security report belongs in [`SECURITY.md`](SECURITY.md), and a conduct report in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Gates to run before a pull request

Each command below runs from the repository root and prints what it checked. `md-links`, `notes` and `translation-pair` act on the paths they are handed; the rest read their whole subject.

```sh
node --test 'tests/**/*.test.ts'
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts check --all --root .
node scripts/verify-port-provenance.ts
node scripts/verify-skill-structure.ts --root skills/<name>
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts md-links check <markdown...> --root .
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes check <note...> --root .
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts translation-pair check <pair...> --root .
```

`node --test 'tests/**/*.test.ts'` is the functional suite: what each check does with a scope, a seeded defect and a dispatch.

`check --all` is the whole-tree form of the checks that assert over a tree. `--root .` is the project those tree assertions walk.

`node scripts/verify-port-provenance.ts` reads the provenance registry against the pinned `submodules/dsh` checkout: every ported file names its dsh origin, and the registry agrees with the submodule.

`node scripts/verify-skill-structure.ts --root skills/<name>` runs **once per skill directory the diff touches**: the entry conforms, the resources are placed, and every reference is reachable from the entry.

`md-links check` takes the Markdown this change touched. A relative link, image or definition whose target or `#fragment` does not resolve fails it. The asking side of a link is decided per file — a target deleted under an untouched referrer is caught by a run over the referring file, not by the run that covered the delete.

`notes check` takes the Agent Notes the change touched, and asserts their in-file format. The tree assertions, the frozen archive and the pairing record have their own commands, given in [the Agent Notes contract](.agents/dsh-spec/notes/README.md).

`translation-pair check` takes a document whose counterpart the change touched. Every named pair is complete, recorded, and structurally identical.

Every change owes the checks whose subject it touches, and a change that reaches the skills, the engine or a shipped reference owes the file scans above in full, however small the diff is. `check --base <ref> --root .` reports the subset a change owes and prints every skip with its reason; that subset is never a substitute for the commands above before a push.

Node 22.19 or newer is the only requirement: the engine is TypeScript that Node strips by itself, the suite runs on `node --test`, and there is no build step.

## Pull request lifecycle

A pull request description carries four sections, in this order:

```markdown
## What this PR does
## Why
## How
## Reviewer notes
```

`## What this PR does` states the behavior a reader gets after the merge — the deliverable and its effect, in a paragraph or, where a picture carries the mechanism more clearly than prose, a small ASCII diagram of it. `## Why` states the problem and the decision that answers it. `## How` names the mechanism and the choices a reviewer should weigh; the commit record carries the milestones. `## Reviewer notes` carries the uncertainty met while implementing, whether the change is breaking, how far it reaches, and the migration it suggests.

The checks run on every pull request, so their run is the verification and no section repeats it.

The description is written for an outside contributor's eye. It states the change rather than the author's route to it, and it names a file the way a reader outside the repository can open it — a URL or the repository path in code, never a relative link.

A pull request is opened as a draft and it stays the implementer's working state: the branch is folded into milestones before acceptance, the implementer accepts the change and folds whatever the acceptance asked for back in, and the draft is marked ready once that handover is authorized. The repository's maintainer reads it from that point, not before, and an agent that implements the change does any of this only on the implementer's authorization.

Every pull request is squash-merged on GitHub, by fast-forward, so `main` gains one clean commit per pull request. Commits before review may be rebased, reworded, dropped and force-pushed freely; commits appended during review are fixups, and they are folded into their milestone before the squash; the branch is rebased only when its base moves.

An agent that opens a pull request stops at that act. Merging it, and publishing a release, happen only after the maintainer authorizes that specific act.

## AI involvement

AI involvement is allowed. It is disclosed in the commit message with an `Assisted-by:` trailer, naming every machine that took part:

```
Assisted-by: DeepSeek Harness (dsh)
```

The commit message itself describes the change. An autonomous agent's pull request needs the maintainer's approval **before** its branch is pushed; a pull request opened by a person who used an agent needs the trailer and nothing more.

## Developer Certificate of Origin

Every commit carries a `Signed-off-by:` line that matches its committer:

```sh
git commit --signoff
```

`Signed-off-by:` is the [Developer Certificate of Origin](https://developercertificate.org/) 1.1 certification that the contributor has the right to submit the work under the repository's license. The line names the person who submits the work and no one else; an agent does not sign on another person's behalf, and a person does not sign for an agent. A commit whose sign-off is missing, or names someone other than its committer, is sent back.

The DCO is the whole inbound-rights arrangement from the first pull request onward. **There is no Contributor License Agreement.**

## License

Contributions are accepted under the MIT license the repository already carries, whose full text and copyright line are in [`LICENSE`](LICENSE). The upstream DeepSeek Harness notice, the ported files and the bundled npm packages are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Bilingual documents

A bilingual pair is one document in two files — an English side and a `.zh.md` counterpart — with an `.i18n.yaml` record beside them holding the last agreed hash of each side. Either side may be the authored one for an update; both carry equal authority.

The type carries the structure, and the translator carries the meaning. Each side is written the way its own language says it, in an order a reader can follow. The pairing gate compares a structural signature — heading depths and order, list kinds, ordered-list starts and item counts, table row and column counts, semantic link targets with query and fragment, and code blocks verbatim — rather than wording, so structural drift fails and wording drift does not. Whether both sides say the same thing is the reviewer's half.

An edit to one side is followed by the matching edit to the other and a renewed record in the same change:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts translation-pair check <pair...> --root .
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts translation-pair write <pair...> --root .
```

`translation-pair brief <pair...> --root .` prints the changed spans, the terminology the pair shares, and the sections that owe an update, which is the briefing an agent works from. `translation-pair check` afterwards is what proves the pair complete, recorded and structurally identical. The pairing contract the record follows is in [`i18n-contract.md`](skills/dsh-translate-docs/references/i18n-contract.md).

`SECURITY.md` and `CODE_OF_CONDUCT.md` are single-language English documents. `CODE_OF_CONDUCT.md` is the official English text of Contributor Covenant 2.1, which no translation may stand in for. The three policy pages have no `.zh.md` counterpart and no `.i18n.yaml` record, so they declare no pair: `translation-pair check` asserts nothing about them, and a policy page named to that command falls outside its scope rather than passing it.

## Where a change lands

- The deliverable is `skills/`. `.agents/skills/` is the installed copy this project runs, tracked in git; it is written only by an install, and an edit there is lost at the next one.
- A lasting decision's rationale goes in `.agents/dsh-spec/notes/` in the same change, in the format [the contract](.agents/dsh-spec/notes/README.md) states.
- What belongs to this repository rather than to the package — `scripts/`, `tests/`, `docs/` — is described in [`README.md`](README.md#working-on-this-repository).
- An outside text quoted in a change — a page, an issue, a transcript or a tool's output — enters as evidence with its source named.
