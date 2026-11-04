# Contributing

This repository develops the skill set it ships. The commands below run before a change is pushed.

Commits carry a `Signed-off-by:` trailer that names their author, and the work is offered under the repository's MIT license. Two pages beside this one take two kinds of report off the issue tracker: a security report belongs in [`SECURITY.md`](SECURITY.md), and a conduct report in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Gates to run

Each command below runs from the repository root and prints what it checked.

```sh
pnpm run check:corpus
pnpm run format:check
pnpm run skill:verify-bundles
pnpm test
node scripts/verify-dco.ts --base=origin/main
```

`pnpm run format:check` checks the TypeScript sources against the project's Oxfmt settings.

`pnpm test` is the functional suite: what the DCO check decides about a range, the payload the vendored-notices submission posts, the skill gate, the Agent Note gate, the change-scope report, the draft lifecycle, the installed-copy refresh and the shipped pairing mechanism.

`node scripts/verify-dco.ts --base=origin/main` reads a commit range and asserts that every commit carries a `Signed-off-by:` trailer matching its author, or its committer where the two differ; a commit claiming a bot identity is verified against GitHub as well.

Every change owes these checks. CI installs the pinned toolchain and runs the corpus gate, `format:check`, the bundle check and the suite on every pull request and on every push to `main`, and the DCO check on every pull request; the bundle and format checks need the Vite+ toolchain locally; the corpus gate needs Node and the Git checkout, with no install or build.

Node 22.19 or a Node 24+ release is the requirement: the root `packageManager` pins pnpm and the root `vite-plus` devDependency pins the Vite+ toolchain, installed with `pnpm install`; the checks are TypeScript that Node strips by itself, the suite runs on `node --test`, and running them needs no build step. The pnpm version is recorded in three places — `packageManager`, the checks workflow's `pnpm/action-setup` version and the lockfile's self-management document — and `tests/toolchain.test.ts` fails when they disagree, so bump all three together.

## AI involvement

AI involvement is allowed. It is disclosed in the commit message with an `Assisted-by:` trailer, naming every machine that took part:

```
Assisted-by: DeepSeek Harness (dsh)
```

The commit message itself describes the change.

## Developer Certificate of Origin

Every commit carries a `Signed-off-by:` line that names its author, or its committer where the two differ:

```sh
git commit --signoff
```

`Signed-off-by:` is the [Developer Certificate of Origin](https://developercertificate.org/) 1.1 certification that the contributor has the right to submit the work under the repository's license. The line names the person who submits the work and no one else; an agent does not sign on another person's behalf, and a person does not sign for an agent. A commit whose sign-off is missing, or names someone other than its committer, is sent back.

The DCO is the whole inbound-rights arrangement from the first contribution onward. **There is no Contributor License Agreement.**

## License

Contributions are accepted under the MIT license the repository already carries, whose full text and copyright line are in [`LICENSE`](LICENSE). The upstream DeepSeek Harness notice, the ported files and the bundled npm packages are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Bilingual documents

A bilingual pair is one document in two files — an English side and a `.zh.md` counterpart — with an `.i18n.yaml` record beside them holding the last agreed hash of each side. Either side may be the authored one for an update; both carry equal authority.

The type carries the structure, and the translator carries the meaning. Each side is written the way its own language says it, in an order a reader can follow, and an edit keeps the two structurally identical — heading depths and order, list kinds, ordered-list starts and item counts, table row and column counts, semantic link targets with query and fragment, and code blocks verbatim. Whether both sides say the same thing is the reviewer's half.

An edit to one side is followed by the matching edit to the other and a renewed record in the same change.

`SECURITY.md` and `CODE_OF_CONDUCT.md` are single-language English documents. `CODE_OF_CONDUCT.md` is the official English text of Contributor Covenant 2.1, which no translation may stand in for. The three policy pages have no `.zh.md` counterpart and no `.i18n.yaml` record, so they declare no pair.

## Where a change lands

- The deliverable is `skills/`. `.agents/skills/` is the installed copy this project runs, tracked in git; `pnpm run skill:refresh` writes it, and an edit there is lost at the next refresh.
- A lasting decision's rationale goes in `.agents/dsh-spec-agent-notes/` in the same change, in the format [the contract](skills/dsh-spec-agent-notes/references/notes-contract.md) states.
- What belongs to this repository rather than to the package — `scripts/`, `tests/` and the `.agents/` trees — is described in [`README.md`](README.md#working-on-this-repository).
- An outside text quoted in a change — a page, an issue, a transcript or a tool's output — enters as evidence with its source named.
