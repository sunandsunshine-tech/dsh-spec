# Contributing

This repository develops the skill set it ships. A change lands through a pull request on `main`, and the commands below run before that pull request is opened.

By the time a pull request is opened, its commits carry a `Signed-off-by:` trailer that names their author, and the work is offered under the repository's MIT license. Two pages beside this one take two kinds of report off the issue tracker: a security report belongs in [`SECURITY.md`](SECURITY.md), and a conduct report in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Gates to run before a pull request

Each command below runs from the repository root and prints what it checked.

```sh
pnpm run format:check
pnpm test
node scripts/verify-dco.ts --base=origin/main
```

`pnpm run format:check` checks the TypeScript sources against the project's Oxfmt settings.

`pnpm test` is the functional suite: what the DCO check decides about a range, the payload the vendored-notices submission posts, the skill gate, the draft lifecycle and the installed-copy refresh.

`node scripts/verify-dco.ts --base=origin/main` reads a commit range and asserts that every commit carries a `Signed-off-by:` trailer matching its author; a commit claiming a bot identity is verified against GitHub as well.

Every change owes these checks. CI runs the suite and the DCO check on every pull request; the format check needs the Vite+ toolchain locally.

Node 22.19 or newer, pnpm and the Vite+ toolchain are the requirements: the checks are TypeScript that Node strips by itself, the suite runs on `node --test`, and running them needs no build step.

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

A pull request is opened as a draft and it stays the implementer's working state: before acceptance, before review and before the merge the branch is tidied — folded into milestones, with the pull request's description kept current — the implementer accepts the change and folds whatever the acceptance asked for back in, and the draft is marked ready once the handover to review is authorized. The repository's maintainer reads it from that point, not before, and an agent that implements the change does any of this only on the implementer's authorization.

Every pull request is squash-merged on GitHub, by fast-forward, so `main` gains one clean commit per pull request. Commits before review may be rebased, reworded, dropped and force-pushed freely; commits appended between tidies are fixups, and the tidy before the merge folds them into their milestone; the branch is rebased only when its base moves.

An agent that opens a pull request stops at that act. Marking it ready for review and merging it happen only after the maintainer authorizes that specific act, and an authorization is asked for and answered: the agent puts the act to the maintainer as a question — naming the act and carrying the change's description — and waits for the answer, because a consent the agent reads out of its own statement is not an authorization.

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

The type carries the structure, and the translator carries the meaning. Each side is written the way its own language says it, in an order a reader can follow, and an edit keeps the two structurally identical — heading depths and order, list kinds, ordered-list starts and item counts, table row and column counts, semantic link targets with query and fragment, and code blocks verbatim. Whether both sides say the same thing is the reviewer's half.

An edit to one side is followed by the matching edit to the other and a renewed record in the same change.

`SECURITY.md` and `CODE_OF_CONDUCT.md` are single-language English documents. `CODE_OF_CONDUCT.md` is the official English text of Contributor Covenant 2.1, which no translation may stand in for. The three policy pages have no `.zh.md` counterpart and no `.i18n.yaml` record, so they declare no pair.

## Where a change lands

- The deliverable is `skills/`. `.agents/skills/` is the installed copy this project runs, tracked in git; it is written only by an install, and an edit there is lost at the next one.
- A lasting decision's rationale goes in `.agents/dsh-spec/notes/` in the same change, in the format [the contract](.agents/dsh-spec/notes/README.md) states.
- What belongs to this repository rather than to the package — `scripts/`, `tests/`, `docs/` — is described in [`README.md`](README.md#working-on-this-repository).
- An outside text quoted in a change — a page, an issue, a transcript or a tool's output — enters as evidence with its source named.
