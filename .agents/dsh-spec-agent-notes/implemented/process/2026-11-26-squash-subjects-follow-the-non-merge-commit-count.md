# Agent Note: Squash subjects follow the non-merge commit count

Status: implemented

English | [中文](2026-11-26-squash-subjects-follow-the-non-merge-commit-count.zh.md)

## Problem

The repository uses conventional squash subjects and four-block pull-request descriptions. Without explicit subject rules, a manual `(#136)` in a branch input becomes a duplicate when GitHub adds the pull-request suffix, and a subject can describe review or rebase mechanics instead of the resulting change. AI-assisted commits also require a machine trailer beside the human DCO. Issue #167 tracks the subject and disclosure boundary.

## Decision

GitHub's live squash-title setting is `COMMIT_OR_PR_TITLE`. A pull request with exactly one non-merge commit takes the prospective squash subject from that commit; any other pull request takes it from the pull-request title. Merge commits do not decide the source. Both sources use `type(scope): imperative summary`: the conventional `type` and `scope` tokens stay fixed, while the summary states the resulting change in the change's working language. The repository does not require English, and the form does not impose English on the summary.

Tracker and review references belong in the pull-request body. The title and every branch commit subject remain free of manual `(#N)` suffixes, including one suffix and suffixes without preceding whitespace. GitHub supplies exactly one suffix from the pull-request number when it creates the squash commit. Subject checks read Git's `%s` rendering rather than the first physical message line, so leading blank lines cannot hide a suffix. A canonical suffix must also end the subject: its issue number is a positive unpadded decimal, and trailing whitespace, including a nonbreaking space, is not trimmed away.

Commit subjects describe the resulting change rather than review, rebase, or session mechanics. The AI-disclosure and DCO decision remains owned by [Opening this repository](2026-09-24-opening-this-repository.md). At this subject use site, every AI-assisted commit names each participating machine in an `Assisted-by:` trailer and still carries the DCO `Signed-off-by:`; neither trailer replaces the other, and this record establishes no second AI or DCO policy.

The contributor rules and examples live in [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md). The root [`AGENTS.md`](../../../../AGENTS.md) gives agents the operational rule and links back. The [four-block description owner](../../../../skills/dsh-spec-pr-description/SKILL.md) and its [AI Usage reference](../../../../skills/dsh-spec-pr-description/references/ai-usage.md) remain the sole owners of the pull-request body; this record does not repeat those contracts.

The pull-request DCO step enforces the mechanically decidable boundary. In default PR mode, `scripts/verify-dco.ts` receives the live title through `DCO_PR_TITLE`, rejects every manual tracker suffix in that title and all branch commit subjects, and reports whether the prospective subject comes from the sole non-merge commit or the title. `--mode=squash-commit` is the separate check for exactly one already-landed commit with one parent and exactly one canonical space-prefixed GitHub suffix at the true subject end. Its issue number matches `[1-9][0-9]*`; zero, zero-padded, and trailing-NBSP forms fail. The gate examines the entire trailing suffix run, so adjacent, spaced, or mixed duplicate groups fail. Default PR mode never treats a branch suffix as landed evidence.

The DCO half normalizes CRLF and CR line endings to LF, then reads trailers through `git interpret-trailers --parse`, so the final trailer block follows Git's continuation folding on every platform. Every unfolded `Signed-off-by:` must name exactly one identity, the author or committer; a folded value containing multiple identities is invalid. The existing fixed Dependabot trailer remains accepted only when GitHub resolves the commit's committer as that bot and verifies its signature.

A commit triggers GitHub verification whenever its author address or any sign-off names an allowlisted bot, including Dependabot's self-signoff noreply form. A matching human-authored commit cannot satisfy that verification merely by using the bot's display name. The gate does not classify review, rebase, or session prose; review retains that judgment.

## Verification

| Requirement | Evidence |
|---|---|
| A one-commit PR with a clean title and a suffixed commit fails | `node --test tests/dco.test.ts` |
| A leading blank message line does not hide a suffix in Git's subject | `node --test tests/dco.test.ts` |
| Normal unsuffixed branch commits pass | `node --test tests/dco.test.ts` |
| A suffix without preceding whitespace fails | `node --test tests/dco.test.ts` |
| Adjacent, spaced, and mixed duplicate branch suffixes fail | `node --test tests/dco.test.ts` |
| Zero and zero-padded branch suffixes are still detected and fail | `node --test tests/dco.test.ts` |
| One-commit and multi-commit PRs report the correct prospective subject source | `node --test tests/dco.test.ts` |
| A landed suffix passes only in explicit `squash-commit` mode | `node --test tests/dco.test.ts` |
| A feature commit plus base-sync merge still uses the sole non-merge commit as the prospective subject | `node --test tests/dco.test.ts` |
| Post-squash mode requires one parent, one positive unpadded suffix at the true end, and no duplicate suffix group | `node --test tests/dco.test.ts` |
| A nonbreaking space after the suffix prevents canonical acceptance | `node --test tests/dco.test.ts` |
| Author-only and committer-only sign-offs work when the identities differ | `node --test tests/dco.test.ts` |
| Every unfolded final-block sign-off must match the commit identity | `node --test tests/dco.test.ts` |
| LF and CRLF folded identities pass, while a folded multi-identity sign-off fails | `node --test tests/dco.test.ts` |
| A Dependabot author or self-signoff requires GitHub committer resolution and signature verification | `node --test tests/dco.test.ts` |
| A Dependabot author with a human committer fails despite a verified signature | `node --test tests/dco.test.ts` |
| Multi-commit verification uses each requested SHA's committer facts | `node --test tests/dco.test.ts` |
| Pull-request CI supplies the exact live title, reruns on title edits, and keeps its bot-verification token | `node --test tests/dco.test.ts` |

The repository has no root-Markdown link gate. Review owns the links in `CONTRIBUTING.md`, `AGENTS.md`, and this record; the corpus gate does not claim to validate them.

## Alternatives considered

**Require English summaries.** It would make one historical convention look universal, but this repository's commit history uses both English and Chinese summaries. The language of the change remains the author's choice.

**Regex-match review, rebase, and session vocabulary in every subject.** It is easy to implement, but ordinary technical prose uses those words legitimately, and the issue's own boundary excludes that judgment. Review owns whether a subject describes the change.

**Count merge commits when choosing the prospective subject source.** A base-sync merge does not represent another authored change in the pull request. It would turn a one-feature-change PR into a title-sourced PR even though `COMMIT_OR_PR_TITLE` still sees only one non-merge commit.

**Accept one suffix on a branch commit because GitHub also creates one.** It mistakes the post-squash commit for a pre-squash branch input. Under `COMMIT_OR_PR_TITLE`, a one-commit PR would then place a manual suffix in the prospective squash subject before GitHub adds another. Default PR mode rejects every branch suffix.

**Read the first physical message line as the subject.** Git's actual subject ignores leading blank lines, so a commit message beginning with an empty line could hide a suffix from the gate while GitHub still uses it. The gate reads `%s`, the rendered subject Git and GitHub expose.

**Treat a folded sign-off as several acceptable identities.** Git unfolds a continuation into one trailer value. If that value contains more than one identity, no single person is named, so the DCO cannot decide who certified the commit.

**Accept any single commit in post-squash mode.** A root or merge commit is not the one-parent commit produced by squashing a pull request. The mode requires one parent before it validates the landed suffix.

**Infer landed-commit mode from the presence of one suffix.** It makes a manual branch suffix self-authorizing, including noncanonical forms. A post-squash commit is valid only in the explicit `squash-commit` mode, where exactly one space-prefixed suffix is required.

**Leave the rule to review without a check.** The subject and trailer shapes are mechanically recognizable, and review cannot safely infer which title source GitHub will use without applying the squash setting. The existing DCO step is the only commit-admission owner.

## Consequences

- Contributors get one explicit subject rule for both pull-request titles and commits, and the summary language remains unrestricted.
- `scripts/verify-dco.ts` counts non-merge commits for the prospective subject, reads the actual Git subject, distinguishes that input from a separately checked landed squash commit, and accepts no branch suffix as landed evidence.
- Post-squash mode requires one parent and one whole canonical positive unpadded suffix at the true subject end; root commits, merge commits, zero, zero-padded, trailing-NBSP, and adjacent, spaced, or mixed duplicate groups fail.
- Git-native trailer parsing follows CRLF normalization and unfolds legitimate continuations; every unfolded sign-off must name one author or committer, and folded multi-identity values fail.
- Bot identities trigger GitHub verification when named by the author address or any sign-off, including the bot's noreply self-signoff; the API committer account must match the bot, and each commit has its own facts.
- The PR-description skill and AI Usage reference keep the body contract; `CONTRIBUTING.md`, `AGENTS.md`, the DCO step, and its tests only carry subject and trailer facts.
