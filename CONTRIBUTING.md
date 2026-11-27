# Contributing

This repository develops the skill set it ships. The commands below run before a change is pushed.

Commits carry a `Signed-off-by:` trailer that names their author or committer, and the work is offered under the repository's MIT license. Two pages beside this one take two kinds of report off the issue tracker: a security report belongs in [`SECURITY.md`](SECURITY.md), and a conduct report in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Commit and pull-request subjects

This repository's live GitHub squash-title setting is `COMMIT_OR_PR_TITLE`. A pull request with exactly one non-merge commit takes the prospective squash subject from that commit subject; a pull request with any other non-merge commit count takes it from the pull request title. Merge commits do not decide the source. Both sources use `type(scope): imperative summary`: `type` and `scope` stay conventional tokens, and `summary` states the resulting change in the imperative mood where the language marks one. Human-readable summaries and bodies may be Chinese or English; use the current user's preferred language. Keep code identifiers, commands, APIs, paths, and machine-readable fields in their required repository or English forms. Leave tracker and review references in the pull request body.

Do not add a trailing tracker suffix such as `(#136)` to the pull request title or any branch commit subject. GitHub supplies exactly one canonical space-prefixed suffix with the pull request number when it creates the squash commit. The DCO gate rejects the entire trailing suffix run in those branch inputs, including one suffix, suffixes without preceding whitespace, and adjacent, spaced, or mixed duplicate groups. It reads Git's rendered subject, so leading blank lines do not hide a suffix. A post-squash merged commit may be checked separately with `--mode=squash-commit`; that mode requires exactly one commit with one parent and one canonical ` (#N)` suffix whose issue number matches `[1-9][0-9]*`. The suffix must end the subject: zero and zero-padded issue numbers, or trailing whitespace such as a nonbreaking space, are rejected.

Commit subjects use the same shape and describe the resulting change rather than review, rebase, or session mechanics. The gate checks only the suffix shape; review decides whether a subject describes the change rather than its session mechanics. Write the pull request body through the [four-block description contract](skills/dsh-spec-pr-description/SKILL.md) and its [AI Usage contract](skills/dsh-spec-pr-description/references/ai-usage.md); those references own the body structure rather than this guide. Keep the fixed English headings those contracts define. Account ownership does not establish language preference, and no gate judges the human language.

## Draft pull requests

Draft intermediate pushes use `[skip ci]` in the commit message unless remote CI on that exact head is currently needed as evidence. A skipped head has no complete remote-check evidence. Before marking the pull request ready, push a new head without `[skip ci]` and wait for full CI to succeed on that exact commit. Do not use skip to bypass known failures, CI configuration changes, or integration boundaries.

## Gates to run

Each command below runs from the repository root and prints what it checked.

```sh
pnpm run check:corpus
pnpm run check:static
pnpm run skill:verify-bundles
pnpm test
node scripts/verify-dco.ts --base=origin/main
```

`pnpm run check:static` checks formatting with Oxfmt, lint rules with Oxlint, and the TypeScript program with `tsrs`.

`pnpm test` is the functional suite: what the DCO check decides about a range, the payload the vendored-notices submission posts, the skill gate, the Agent Note gate, the change-scope report, the draft lifecycle, the installed-copy refresh and the shipped pairing mechanism.

`node scripts/verify-dco.ts --base=origin/main` reads a commit range and asserts that every unfolded `Signed-off-by:` in the final trailer block matches the commit's author or committer; CRLF and CR line endings follow the same folding rules as LF. A commit naming an allowlisted bot is verified through GitHub's committer account and signature; author attribution and `verification.verified` alone are not enough. The one fixed-address exception is Dependabot's `dependabot[bot] <support@github.com>`, accepted only when GitHub reports the committer as that bot and GitHub-signed; its rationale is in [the Dependabot decision record](.agents/dsh-spec-agent-notes/implemented/process/2026-10-13-dependabot-signs-with-a-fixed-address.md). Pull-request CI supplies the current title in default PR mode, which rejects every manual tracker suffix in the title and branch commit subjects and reports whether the prospective subject comes from the sole non-merge commit or the title. To include the title locally, run `DCO_PR_TITLE="$(gh pr view --json title --jq .title)" node scripts/verify-dco.ts --base=origin/main`.

A ready change owes these checks passing on its exact head. CI installs the pinned toolchain and runs the corpus gate, `check:static`, the bundle check, the suite and the DCO check on every pull-request head without `[skip ci]`; it runs the corpus gate, `check:static`, the bundle check and the suite on every push to `main`. The bundle and static checks need the Vite+ toolchain locally; the corpus gate needs Node and the Git checkout, with no install or build.

The repository develops and checks on Node.js 26. Shipped script bundles support Node.js `^24.11.0 || >=26.0.0`; Node 22 is not supported. The root `packageManager` pins pnpm and the root `vite-plus` devDependency pins the Vite+ toolchain, installed with `pnpm install`; the checks are TypeScript that Node strips by itself, the suite runs on `node --test`, and running them needs no build step. CI runs both supported Node lines. The pnpm version is recorded in three places — `packageManager`, the checks workflow's `pnpm/setup` version and the lockfile's self-management document — and `tests/toolchain.test.ts` fails when they disagree, so bump all three together.

## AI involvement

AI involvement is allowed. Every AI-assisted commit carries an `Assisted-by:` trailer for each machine that took part:

```
Assisted-by: DeepSeek Harness (dsh)
```

The trailers sit together in the final trailer block; a blank line starts a new paragraph and makes an earlier `Assisted-by:` invisible to Git's trailer parser. `Assisted-by:` records machine participation; `Signed-off-by:` still names the human author or committer who submits the work.

## Developer Certificate of Origin

Every commit carries at least one `Signed-off-by:` line in its final trailer block. Each line names the commit's author or committer; when those identities differ, either one is accepted:

```sh
git commit --signoff
```

`Signed-off-by:` is the [Developer Certificate of Origin](https://developercertificate.org/) 1.1 certification that the contributor has the right to submit the work under the repository's license. The line names the commit's author or committer, never a third party; an agent does not sign on another person's behalf, and a person does not sign for an agent. A commit whose final block lacks a sign-off, or contains one naming neither recorded identity, is sent back.

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
