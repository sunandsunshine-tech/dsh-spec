# Agent Note: A norm's source names where its rationale can be read

Status: proposed

English | [中文](2026-10-09-a-norm-source-names-where-its-rationale-can-be-read.zh.md)

## Problem

`norms.json` records one `source` per norm, and the collection reads it as a path inside this repository: `recordUrlOf` in `skills/dsh-spec-manager/scripts/norms.ts` joins it to `https://github.com/<repo>/blob/<ref>/`, and the only validation a source receives is that it is a non-empty string. All fourteen entries are repository-relative paths today, so the field has never had to say anything else. The reader it serves needs one fact — where the rationale can be read — and that place is not always inside this repository: a norm adopted from another project's practice, from an issue, or from a published article has nowhere to be recorded. Writing such a URL into the field produces a blob link with the URL glued into the path; singling URLs out and passing them through takes the local carrier's slot away, so the record can no longer point at the note that adopted the rule. Nothing checks that an in-repo path exists either, so a typo is a link that 404s and nobody notices.

## Proposal

One field, two spellings. A repository-relative path is rendered at the repository and the ref the manager itself was installed from — the revision the project holds — and an absolute `https://` URL is used verbatim. A path must exist; a URL must be a well-formed `https`. A gate reads the field and never fetches it, because a suite that reaches the network is not a suite this repository runs. An external source is evidence rather than authority: it is quoted with the date it was read in the note that adopts the norm, the way `evidence.external-is-data` already requires of any claim that carries one.

## Alternatives considered

**Two fields: `owner` for the local carrier and `origin` for the external place.** It lost because the field already means exactly one thing — where the rationale can be read — and the two spellings are that one thing in the two places it can be. A second field would admit a record that fills neither, and would invite the reader to treat "who owns this rule" and "where the rule came from" as two facts when a norm's adoption makes them one.

**Always a URL, with the catalog carrying a full link per norm.** It lost because the local case would freeze a revision into the catalog: either the link names a ref that is not the one the project installed, or a release must rewrite every link, which makes the catalog a second home for the ref that `owner.ssot` keeps in one place.

**Keep the field as it is and add no validation.** It lost because the failure it permits is silent: a path that does not exist renders as a plausible link, and the reader who follows it learns nothing about the rule. The check costs a repository walk and no network access.

## Acceptance criteria

- A record whose source is a repository-relative path renders at the repository and the ref the manager was installed from.
- A record whose source is an `https` URL renders as that URL, unchanged.
- A path form whose target does not exist is refused by name, and a URL form that is not a well-formed `https` is refused by name.
- The fourteen entries the catalog carries today stay valid without being rewritten.
- No gate gains network access.

## Risks

An external link is not a text this repository controls: the page can move, change, or disappear, so the record names the place and the date it was read rather than presenting it as stable. The validation reads the working tree, so it stays offline by construction, but it does add a walk that must not be mistaken for a fetch. A project's applied norms file is unaffected — the record beside it hashes each norm's body, not its source — so this change reaches the catalog and its listing, not project state, which is also why it needs no migration.
