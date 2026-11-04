# Agent Note: Forging dsh-spec-merging-stacked-prs from the upstream stacked-PR landing skill

Status: implemented

English | [中文](2026-10-28-forging-dsh-spec-merging-stacked-prs.zh.md)

## Problem

The skill set has no skill that owns landing a stack of dependent GitHub pull requests. An agent asked to land A ← B ← C, where each pull request bases on the one below, must choose between reproducing stack semantics by merging and retargeting layers by hand and using GitHub's native stacked-PR feature, which owns stack-wide rules, CI, ordering, retargeting and merge state. Upstream `dsh` carries a skill for that choice, `dsh-merging-stacked-prs`, but it is written for that repository's conventions: it points at the upstream root `AGENTS.md` for allowed histories and at an upstream cookbook page for review-fix propagation, and it fixes the merge method as a flag.

The source boundary is explicit: the upstream skill is the only content source, together with the request and facts of the target domain (GitHub pull-request operations and the installed `gh stack` extension). This repository's existing documents — its `AGENTS.md`, its norms catalogue, its decision records and their conventions — are not a design source, because they are repository content that is being removed or rewritten, not the behaviour the shipped skill must carry. The target audience is an agent operating GitHub pull requests, and the deliverable is a general GitHub PR-operation skill, not a copy of one repository's landing policy.

## Decision

`dsh-spec-merging-stacked-prs` ships from `skills/dsh-spec-merging-stacked-prs/` in the upstream single-file shape. It was forged from `.agents/skills/dsh-merging-stacked-prs` of the pinned `submodules/dsh` baseline.

The landed skill is `skills/dsh-spec-merging-stacked-prs/`: `SKILL.md` plus its skill-root `THIRD_PARTY_NOTICES`, which the frontmatter `license` field names because the text is adapted from the upstream skill. Its installed copy at `.agents/skills/dsh-spec-merging-stacked-prs/` mirrors it byte for byte. The forge work directory was published and removed; the stop review drafts were removed by `publish`. No bundled script, package source or repository test file ships with this skill: the source's own read-only `gh` and GraphQL commands are carried inline (R11).

The mechanism is the upstream mechanism unchanged: the official GitHub stack object is the membership authority; an eligible same-author chain — unstacked, or an order-preserving subset of one existing stack — is linked additively; the native cascading rebase and the incremental merge-forward are the two refresh histories; the merge runs through `gh stack merge` and never through per-pull-request `gh pr merge` plus retargeting; the whole stack or an explicitly bounded prefix is selected; every selected pull request must report `MERGED` before branch deletion, which is a separate final pass. The adaptations are:

1. **Name and trigger language.** The target name is the request's `dsh-spec-merging-stacked-prs`; the description keeps the source's trigger vocabulary and requirement sense and appends the Chinese trigger language. The source's fixed `master` becomes the repository's default branch in the body (R4).
2. **Upstream document pointers.** The root `AGENTS.md` pointer and the cookbook page are disposed rather than carried: the history rule is Re-bound to the landing repository's own instructions (R10), and review-fix propagation is Dissolved because it is outside this skill's scope, with the re-audit-after-rewrite check kept as the rule that takes over.
3. **Merge method.** The source's fixed `--merge` is Re-bound: the merge method is the landing repository's policy (R5). The skill takes the method its instructions prescribe or its GitHub merge settings name, and falls back to `merge` when neither does.
4. **No merge-authorization gate.** The source does not gate the merge behind a human answer, and nothing in the source boundary adds one; the earlier per-pull-request authorization is Dissolved (R8). The source's own asks remain: user direction for conflicting or unexpected stack entries, asking when authors differ or are unavailable, and cancelling on local/remote divergence.
5. **Verified CLI surface.** The installed `gh stack` 0.1.1 provides the commands and flags the source assumes — `link --base`, `checkout`, `sync`, `rebase`, `push`, `merge --yes --merge/--squash/--rebase` — and no `--delete-branch`. Two verified behaviours shape the text: branch arguments to `gh stack link` are pushed and can create pull requests, while a numeric argument that matches no pull request is treated as a branch name, so the link command uses pull-request URLs (R1); and the shipped skill links only open pull requests and stops on a closed or merged entry (R9).
6. **Compliance evidence.** The source requires each selected pull request to be compliant with the repository's review and check requirements. That evidence is read from the same metadata: a `mergeStateStatus` other than `CLEAN` (a still-computing `UNKNOWN` included) or a `reviewDecision` of `CHANGES_REQUESTED` is a blocker (R2).
7. **Partial landing.** After a partial landing the skill re-queries the official stack, treats layers that already report `MERGED` as already landed, and verifies the remaining PRs are still linked in the expected order and target the trunk or the layer below it (R3).
8. **Delivery.** The frontmatter adds the optional `compatibility` field for the runtime the skill needs. The Chinese review draft is created and paired only at the stop; this record is paired with its Chinese companion and consistency record.

The maintainer reviewed the work and authorized the landing on 2026-10-28. The landing published the work directory into `skills/`, refreshed the installed copies, added the skill-root `THIRD_PARTY_NOTICES` and `license` field, updated `AGENTS.md` and the root `THIRD_PARTY_NOTICES.md`, moved this record to `implemented/`, and squash-merged the forge branch onto local `refactor/dsh-skills`; nothing is pushed.

### Scope corrections after the first stop

Two corrections followed the first stop, and this record is the resolution of both:

1. **Source boundary.** The first design had taken a per-pull-request merge authorization and a merge-method/history policy from this repository's documents. The request then fixed the source boundary to the upstream skill only and excluded the repository's content, so the authorization is Dissolved (R8), the merge method is Re-bound to the landing repository's policy (R5), and the history rule is Re-bound with the source's "allowed after review" clause restored (R10). The handoff no longer updates repository docs, and the record cites no repository norm or decision record as a design source.
2. **Delivery shape.** The corrected design still shipped a read-only audit script with its package source and offline tests. On review the driver judged that shape too rigid for a procedure whose failures need agent judgement, and chose the upstream single-file shape instead. The script, `package/dsh-spec-merging-stacked-prs/` and `tests/merging-stacked-prs.test.ts` are removed; the source's GraphQL query, metadata command and `gh` procedures are carried inline as the source writes them. This is a deliberate delivery ruling (R11), not a dropped requirement: the exact decisions are still made by the commands the agent runs.

The earlier audit and review acceptances covered the earlier shapes; this single-file version is re-audited and re-reviewed before the stop.

### Settings

| Setting | Value | Basis |
|---|---|---|
| Skill name | `dsh-spec-merging-stacked-prs` | the request |
| Delivery language | English | the forge default; the request's review language is Chinese |
| Review language | Chinese; the review draft is created and paired only at the stop, with Chinese first and the delivery language as its additional trigger language | the request; R6 |
| Additional trigger language | Chinese, appended to the delivery description | the review language differs from the delivery language |
| Target audience and domain | an agent operating GitHub pull requests: landing a dependent stack, or merging a pull request whose base is another open pull request's branch | the request |
| Description triggers | the source's: landing a stack of dependent GitHub pull requests, a pull request whose base is another open pull request's branch, "stacked PRs", "PR stack", "dependent PRs", merging several related pull requests in sequence; plus the Chinese trigger language | the source description |
| Merge method | the method the landing repository's instructions or GitHub merge settings prescribe; `merge` when neither does | the source's fixed value re-bound to repository policy; R5 |
| Runtime | the GitHub CLI with the official `gh stack` extension and access to GitHub; every head branch in the same repository | the source and the target domain |
| Bundled script | none; the source's `gh` and GraphQL commands are carried inline | R11 |
| Candidate | `.agents/dsh-spec-skill-forge/dsh-spec-merging-stacked-prs/` | the forging process |
| Branch and base | `forge/dsh-spec-merging-stacked-prs`, rebased onto `refactor/dsh-skills` at `f1a68d0` | the request and the worktree |
| Review needed | yes, at the stop | the request |
| Landing | performed on 2026-10-28: published to `skills/`, installed copy refreshed, record moved to `implemented/`, branch squash-merged locally | the request and the maintainer's authorization |
| Record | this file at `.agents/dsh-spec-agent-notes/proposed/process/2026-10-28-forging-dsh-spec-merging-stacked-prs.md`; it moves to `implemented/` with the implemented skeleton when the skill ships | the request; R7 |

### Source and revision

Upstream source: this repository's pinned `submodules/dsh`, commit `1f81c047fc48fa190a683e469daa699857e9afe8` (`dsh-v0.2.1-rc.3`), file `.agents/skills/dsh-merging-stacked-prs/SKILL.md`, 127 lines, read on 2026-10-28. That file is the only content source for the skill. The submodule was not fetched, edited or checked out.

Read as the target's delivery mechanism rather than as content sources: the current `skills/dsh-spec-skill-forge/` and `skills/dsh-spec-agent-notes/` (structure and gate), the forge and notes scripts, the installed `dsh-translate-docs` skill (whose whole-document path produces the stop review draft), and the project pairing gate under `scripts/dsh-spec-manager/`. No document of this repository supplies a skill rule.

Read-only verification of the target environment, 2026-10-28: `gh --version` reports 2.103.2; `gh stack --version` reports 0.1.1; `gh auth status` reports a logged-in account; `gh stack <command> --help` confirmed the commands and flags in § Proposal; `gh pr view 73 --json` returned the source's field list including `statusCheckRollup`; the GraphQL query against the same pull request returned the `stackEntry`/`stack` shape (null for the unstacked probe); `gh pr list --state open --base <branch> --json number` returns a list; `gh repo view --json nameWithOwner,defaultBranchRef` resolves. No remote GitHub state was changed.

Agent Skills pages read online on 2026-10-28, before writing the skill:

- `https://agentskills.io/llms.txt`
- `https://agentskills.io/specification.md`
- `https://agentskills.io/skill-creation/best-practices.md`
- `https://agentskills.io/skill-creation/using-scripts.md`

Every page was readable; the forge skill's offline fallback was not used.

### Constraint dispositions

Dispositions use the forge skill's values: **Keep** carries the original wording and sense with language and layout adjustments; **Adapt** instantiates a target value; **Re-bind** abstracts a vanished referent to its purpose and finds the target equivalent; **Dissolve** records that the referent is gone and what check takes over. Target home: `SK` = the work directory's `SKILL.md`.

| # | Source | Constraint | Disposition | Home | Basis |
|---|---|---|---|---|---|
| S1 | frontmatter `name` | The skill is named for the landing act. | Adapt | SK frontmatter | the request names `dsh-spec-merging-stacked-prs` |
| S2 | frontmatter `description` | Use when landing a stack of dependent PRs (A ← B ← C), when merging a PR whose base is another open PR's branch, or when a request mentions "stacked PRs", "PR stack", "dependent PRs", or merging related PRs in sequence; every same-repository chain must use GitHub's official stacked-PR feature before landing so GitHub owns stack-wide rules, CI, ordering, retargeting and merge state; the chain lands onto master. | Adapt | SK frontmatter | keeps the trigger vocabulary and the requirement sense; the source's `master` becomes the repository's default branch (R4); adds the Chinese trigger language |
| S3 | intro | Land dependent PRs through GitHub's native stack object and `gh stack merge`; do not reproduce stack semantics by merging and retargeting individual PRs. | Keep | SK intro | the source mechanism |
| S4 | intro | The root `AGENTS.md` owns the allowed merge-forward and rebase histories. | Re-bind | SK intro, § Refresh | the referent is an upstream repository document; the purpose is that history policy belongs to the repository being landed, so it becomes the landing repository's own instructions (its `AGENTS.md` or equivalent) (R10) |
| S5 | intro | The stack review guide owns review-fix propagation. | Dissolve | SK intro, § Refresh | the guide is not part of the target; the check that takes over is the re-audit rule: after any head rewrite, re-fetch heads and re-audit threads, approvals, mergeability and checks |
| S6 | § Require native stack support | Run `gh stack --version` before changing GitHub state; hard-stop when the extension or the server-side feature is unavailable; do not fall back to manual merge and retarget. | Keep | SK § Require native stack support | verified: `gh stack version 0.1.1` exists |
| S7 | § Require native stack support | GitHub stacks require every head branch in the same repository; hard-stop on a cross-fork chain. | Keep | SK § Require native stack support | the same restriction holds |
| S8 | § Require native stack support | Use a clean dedicated worktree. | Keep | SK § Require native stack support | unchanged |
| S9 | § Require native stack support | Fetch current PR metadata and exact head OIDs rather than trusting branch names or an earlier report; the named `gh pr view --json` field list is the metadata set. | Keep | SK § Require native stack support | the field list is carried inline exactly as the source names it; live `gh pr view 73 --json` confirmed it |
| S10 | § stack membership | Query `PullRequest.stack` and `stackEntry.position` for at least one PR in each apparent chain; this official object, not base-branch inference alone, is the stack-membership authority. | Keep | SK § Find the official stack | the GraphQL query is carried inline; live introspection confirmed the fields |
| S11 | § stack membership | Paginate `entries` when `size` exceeds the returned page. | Keep | SK § Find the official stack | the inline query carries `pageInfo` and the text names the `after` argument |
| S12 | § stack membership | Establish the expected bottom-to-top order from the live PR bases: the bottom targets the trunk, and each higher PR targets the head branch immediately below it. | Keep | SK § Find the official stack | unchanged |
| S13 | § Link missing stack members | Compare existing entries with the expected chain; an order-preserving subset may be linked; multiple stacks, an unexpected entry or a conflicting order requires user direction before any mutation. | Keep | SK § Link missing stack members | unchanged |
| S14 | § Link missing stack members | Compare every `author.login` exactly. | Keep | SK § Link missing stack members | unchanged |
| S15 | § Link missing stack members | When all authors match, link the chain automatically in bottom-to-top order with `gh stack link --base <trunk> <bottom-pr> ... <top-pr>`. | Adapt | SK § Link missing stack members | the command and `--base` were confirmed; the command uses pull-request URLs because branch arguments are pushed and a numeric miss is treated as a branch name (R1) |
| S16 | § Link missing stack members | When authors differ or any author is unavailable, ask the user before changing GitHub state. | Keep | SK § Link missing stack members | unchanged |
| S17 | § Link missing stack members | Re-query and require one stack number, the expected trunk, the complete PR set, and the expected positions and base chain. | Keep | SK § Link missing stack members | the re-query is the same inline GraphQL query |
| S18 | § Link missing stack members | Never dissolve, reorder or rebuild an existing stack automatically; linking is additive, and merged or queued entries cannot be unstacked. | Adapt | SK § Link missing stack members | the additive rule is kept; `gh stack unstack --help` confirms queued/auto-merge entries stay stacked, while the merged-entry claim is unverified, so the target states a stop rule rather than the claim |
| S19 | § Refresh only when needed | Do not rewrite branches merely because a refresh mechanism exists; refresh when the live merge state or repository rules require an updated trunk. | Keep | SK § Refresh only when needed | unchanged |
| S20 | § Refresh only when needed | Native cascading rebase: check out the remote stack with `gh stack checkout <pr-or-stack>` when it is not tracked locally, then run `gh stack sync`; it may rebase and lease-protected force-push every active layer before local validation; inspect the rewritten scope, run the checks for every affected layer, and do not merge or claim readiness until they pass. | Keep | SK § Refresh only when needed | `gh stack sync --help` confirms the fetch, cascading rebase and atomic force-with-lease push |
| S21 | § Refresh only when needed | On a sync conflict use `gh stack rebase`, resolve and validate, then publish with `gh stack push`. | Keep | SK § Refresh only when needed | both commands confirmed |
| S22 | § Refresh only when needed | When local and remote stack compositions diverge, cancel and ask rather than deleting or recreating the remote stack. | Keep | SK § Refresh only when needed | a non-interactive divergence aborts without pushing |
| S23 | § Refresh only when needed | Incremental merge-forward: merge the trunk into the bottom affected branch, propagate each updated parent into its child bottom-to-top, push normally; preserve an in-progress checkpoint when the base advances. | Keep | SK § Refresh only when needed | unchanged |
| S24 | § Refresh only when needed | Any history rewrite is allowed after review, but it invalidates commit-OID assumptions; re-fetch exact heads and re-audit threads, approvals, mergeability and checks after the push; never raw `--force` or overwrite a concurrently advanced head. | Re-bind | SK § Refresh only when needed | "allowed" is the target repository's policy: a rewrite is allowed after review where the landing repository's instructions permit it; the OID, re-audit and force rules stay (R10) |
| S25 | § Preflight the merge range | Re-query the official stack immediately before merging; require every selected PR open, non-draft, in order, and compliant with the repository's review and check requirements. | Adapt | SK § Preflight the merge range | compliance is read from `mergeStateStatus` and `reviewDecision` in the same metadata (R2) |
| S26 | § Preflight the merge range | Treat each PR's state independently. | Keep | SK § Preflight the merge range | unchanged |
| S27 | § Preflight the merge range | "Land the stack" selects the whole stack; a partial landing requires an explicit boundary PR and includes every layer from the bottom through it. | Keep | SK § Preflight the merge range | unchanged |
| S28 | § Merge through the stack API | Merge the whole stack by its official stack number with `--merge`. | Re-bind | SK § Merge | the method is repository policy (R5); the stack-number form is kept |
| S29 | § Merge through the stack API | For an explicit partial landing, merge through the boundary PR with `--merge`. | Re-bind | SK § Merge | same as S28 |
| S30 | § Merge through the stack API | Do not pass `--delete-branch`, manually retarget dependents, or issue per-PR merge commands; GitHub merges the range bottom-up and retargets/rebases remaining upper layers; a direct stack merge is all-or-nothing; a merge queue may land the range in separate groups. | Keep | SK § Merge | `gh stack merge --help` confirms the all-or-nothing range, queue behaviour and no `--delete-branch` |
| S31 | § Merge through the stack API | Do not bypass merge requirements; a blocker is resolved through the owning PR or reported; never fall back to `gh pr merge`. | Keep | SK § Merge | unchanged |
| S33 | § Verify the landed state | Wait for every selected PR to report `MERGED`; a queued request is not a completed landing. | Keep | SK § Verify the landed state | unchanged |
| S34 | § Verify the landed state | After a partial landing, re-query the official stack, verify the remaining PRs are still linked in the expected order and target the trunk or the layer below, and re-check heads, review state and CI. | Adapt | SK § Verify the landed state | layers that already report `MERGED` are treated as already landed (R3) |
| S35 | § Verify the landed state | Delete branches only in a separate final pass after the PRs report `MERGED`; before deleting each branch, require no open PR uses it as a base (`gh pr list --state open --base <branch> --json number --jq length` reports 0); anything other than 0 blocks deletion. | Keep | SK § Verify the landed state | unchanged |
| S36 | § Checklist | The checklist covers native support, one official stack, rewritten-layer validation, submission through `gh stack merge`, `MERGED` verification and deletion safety. | Adapt | SK § Checklist | same items; the merge-method policy is added, and the removed authorization is not carried |
| S37 | § stack membership and § Require native stack support | The GraphQL query and the `gh pr view --json` list are prose the agent executes. | Keep | SK | carried inline as the source writes them, plus the `pageInfo`/`after` that the source's paginate instruction requires (S11); no bundled script (R11) |
| S38 | § Preflight, § Verify | Membership, completeness, order, same-repository, open, non-draft, merged state and branch-base safety are exactly decidable by the commands the source names. | Keep | SK | the agent runs the same commands; the decisions stay with the agent, with the source's stop rules |
| S39 | § Preflight, § Merge, § Refresh | Review and check compliance response, history choice, link decision when authors differ, conflict resolution. | Keep | SK with one named authority each | the metadata supplies the compliance evidence (R2); the response and the remaining judgements stay prose |

The first design's row S32 (the adopter authorization addition) was removed with the source-boundary correction; the numbering gap between S31 and S33 is deliberate (R8, § Scope corrections), not a dropped source constraint.

### Rulings

| # | Ruling | Basis | Reversible by |
|---|---|---|---|
| R1 | The link command uses pull-request URLs, not numbers or branch names. | `gh stack link --help`: branch arguments are pushed and can create pull requests, and a numeric argument that matches no pull request is treated as a branch name; URLs always resolve as pull requests | change the command form; resolve numbers first |
| R2 | Compliance evidence is `mergeStateStatus` and `reviewDecision` from the same metadata: a value other than `CLEAN` (including `UNKNOWN`) or `CHANGES_REQUESTED` is a blocker. | the source requires compliance with the repository's review and check requirements; GitHub's reported state is that verdict | change the evidence fields or the blocking set |
| R3 | After a partial landing, layers that already report `MERGED` are already landed; re-query and verify the remaining range in the expected order. | GitHub retargets and rebases remaining layers after a partial landing; the source requires re-querying and verifying the remaining layers | adjust the rule |
| R4 | The source's `master` becomes the repository's default branch. | a shipped skill cannot name another repository's default branch | none needed |
| R5 | The merge method is repository policy; the skill uses the method the landing repository's instructions or GitHub merge settings prescribe, falling back to `merge`. | the source's fixed value is one repository's policy; the target domain has repositories that prescribe squash or rebase, and GitHub rejects a method the repository does not allow | revert to the fixed source value, or add an explicit configuration input |
| R6 | The review draft puts Chinese first and English as its additional trigger language. | the request's review language and the review-draft rule | none needed |
| R7 | The record moves to `implemented/` with the implemented skeleton when the skill ships. | the request's record location and the record lifecycle | none needed |
| R8 | No merge-authorization gate is carried: the skill runs the merge after a passing preflight, as the source does. | the source has no such constraint, and the earlier gate came from repository content excluded from the source boundary; the preflight and no-bypass rules are the guards | add a confirmation step as a safety fallback |
| R9 | The skill links only open pull requests and stops on a closed or merged entry. | the source says only open pull requests can be linked or landed; the read-only probe confirms a closed probe exists, but the extension's behavior for non-open entries is unverified, so the target states the safe stop rather than the mechanism claim | revise the rule if a supported non-open path is verified |
| R10 | A history rewrite is allowed after review where the landing repository's instructions permit it; it invalidates commit-OID assumptions, so heads are re-fetched and threads, approvals, mergeability and checks are re-audited after the push; raw `--force` is never used, and a concurrently advanced remote head is never overwritten. | the source's history rule re-bound to the target repository's policy; the source's re-audit and force rules are kept | make the rule unconditional or drop the re-audit |
| R11 | No bundled script ships: the source's exactly-decidable checks are carried inline as its own `gh` and GraphQL commands, and the agent runs them. | the forge's script decision is a ruling; the user chose the upstream single-file shape over the earlier read-only audit script, valuing agent flexibility and less surface over the script's stable exit classes and offline tests | reintroduce a read-only audit script if its consistency is judged worth the surface |

### No bundled script

The forge's Intent section asks whether the forged skill needs a script. This forging answers no (R11): the source is a single prose file whose requirements are executed by the agent through `gh` and GraphQL, and the user chose to keep that shape. The exactly-decidable conditions the source names — stack membership, order, base chain, open/non-draft/compliance, `MERGED`, branch-base safety — are carried as the same inline commands, with their expected outcomes and stop rules stated beside them. This trades away the script's stable JSON/exit contract and its offline tests; it keeps the agent free to re-derive, inspect raw output, and handle states a script does not model. The consequence is recorded in § Risks.

#

## Verification

The landing checks ran before and after the squash commit; the check log records the commands and outputs. The design audit and the two independent implementation reviews accepted the single-file version before the landing.

| Requirement | Anchor | Evidence |
|---|---|---|
| `SKILL.md` meets the Agent Skills specification and the repository's gate | Mechanical | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-merging-stacked-prs` — 14 checks, 0 failed; 132 lines, ~2,804 tokens; description 675, compatibility 137, license 59 |
| The procedure is confined to the source mechanism | Judged | a source-fidelity review walks the 127 source lines against the disposition table and finds only attributable differences |
| The skill is usable by an agent | Judged | an independent reviewer follows the procedure against the metadata/GraphQL shape and finds no dead end or missing command |
| The description triggers on the right requests | Unverified | no installed-skill trigger harness in this session; the description reuses the source vocabulary and appends the Chinese language |
| The record follows the notes contract | Mechanical | `node skills/dsh-spec-agent-notes/scripts/notes.mjs check --root .agents/dsh-spec-agent-notes --companion .zh.md --companion .i18n.yaml` — 38 notes, 76 companions |
| The skill's installed copy mirrors the landed skill | Mechanical | `pnpm run skill:refresh` — `9 skill(s), 0 failed`, with `dsh-spec-merging-stacked-prs — mirrored 2 file(s)`; `tests/repository-shape.test.ts` in `pnpm test` |
| Formatting and the repository suite | Mechanical | `pnpm run format:check` — 26 files; `pnpm test` — 216 tests, 216 pass |
| Commit range carries DCO sign-off | Mechanical | `node scripts/verify-dco.ts --base=c61d49c --head=HEAD` — one signed commit (the landing commit) |
| The landing is local, not pushed | Mechanical | `git ls-remote --heads origin refactor/dsh-skills` still reports `609514c`; no push performed |
| Shared trees and the submodule are untouched | Mechanical | `git diff --stat c61d49c..HEAD` names only the landing's files; `git submodule status` reports `1f81c047` |
| A real official stack is audited end to end | Unverified | creating or mutating a remote stack is outside this change; the first real landing verifies read-only |
| Design audit and independent reviews accept | Judged | the verdicts recorded in § Design audit and § Implementation reviews |

### Check log

| Check | Command | Result |
|---|---|---|
| Publish | `node skills/dsh-spec-skill-forge/scripts/forge.mjs publish dsh-spec-merging-stacked-prs --into skills/dsh-spec-merging-stacked-prs --companion .zh.md --companion .i18n.yaml` | 4 actions, 0 failed; the work directory and the declared review drafts were removed |
| Installed copy refresh | `pnpm run skill:refresh` | 9 skills mirrored, 0 failed; `dsh-spec-merging-stacked-prs — mirrored 2 file(s)` |
| Landed skill gate | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-merging-stacked-prs` | 14 checks, 0 failed; 132 lines, ~2,804 tokens; description 675, compatibility 137, license 59 |
| Notes gate | `node skills/dsh-spec-agent-notes/scripts/notes.mjs check --root .agents/dsh-spec-agent-notes --companion .zh.md --companion .i18n.yaml` | 38 notes and 76 companions checked |
| Format | `pnpm run format:check` | all matched files use the correct format (26 files) |
| Repository suite | `pnpm test` | 216 tests, 216 pass, 0 fail |
| Removed deliverables | `git ls-files -- package/dsh-spec-merging-stacked-prs tests/merging-stacked-prs.test.ts .agents/dsh-spec-skill-forge/dsh-spec-merging-stacked-prs/scripts` | no output; no skill script or test file remains |
| Landed files | `find skills/dsh-spec-merging-stacked-prs .agents/skills/dsh-spec-merging-stacked-prs -type f` | `SKILL.md` and `THIRD_PARTY_NOTICES` in both trees, the installed copy byte-identical |
| Stop review-draft pair | `translation-pair write`/`check` and forge `pair` at the stop commit | `1 record(s) written`; `1 named pair(s) consistent`; 2 declared pairs; `publish` removed the drafts |
| Branch state | `git status --porcelain` | clean; the landing is a local squash commit, not pushed |
| Commit sign-off | `node scripts/verify-dco.ts --base=c61d49c --head=HEAD` | one signed commit (the landing commit); the earlier stop commits were signed too |

Read-only probes with the commands the skill carries, no state changed:

| Command | Observed |
|---|---|
| `gh stack --version` | `gh stack version 0.1.1` |
| `gh pr view 73 --json number,author,baseRefName,baseRefOid,headRefName,headRefOid,isCrossRepository,state,isDraft,reviewDecision,mergeStateStatus,statusCheckRollup` | the source's field list returned; the probe pull request is `CLOSED`, draft, `mergeStateStatus: BLOCKED` |
| the inline GraphQL query on pull request 73 | `stackEntry: null`, `stack: null` — the unstacked shape the procedure expects |
| `gh pr list --state open --base main --json number --jq length` | `0`; nothing blocks that branch's deletion |

### Design audit

The design was audited in three stages. The first design was accepted after five revisions; the scope-corrected revision returned **accept** at `15aa6bb` (source boundary and dispositions). The single-file delivery shape was then audited as a design-and-artifact pair at `1ff68e5`: the auditor returned **needs-revision** for two missing record risks — the documented numbering rule the procedure relies on, and the case where the landing repository's instructions name no allowed history — and both were fixed at `7f4bb91` (risks entries, the SKILL ask-or-stop rule, the S37 wording, the two merge command forms and the S32 gap note). The fix-verification round returned **accept** at `2b3b6a8`. The audit read the pinned upstream skill read-only and confirmed the single-file `SKILL.md` is faithful to it.

### Implementation reviews

Two independent reviewers reviewed the single-file version. Review B accepted at `2b3b6a8` with no findings. Review A returned needs-revision for one major — the branch-deletion command dropped the source's `--jq length`, so the shipped form printed `[]` against an "anything other than 0" rule — and five record/evidence minors; all were fixed at `9cd40af` (the `--jq length` restored, the URL lookup clause added, R9's basis corrected, the merged-unstackable claim restored as unverified, the removal evidence made reproducible, and the wording and audit history updated), and review A accepted that fix round. Review B confirmed its accept stands after the fixes. The earlier script-shape implementation had been accepted by both reviewers across their rounds; that shape and its acceptances are superseded by this review of the single-file version. Both acceptances cover the landed single-file version.

### Landing

The landing was performed on 2026-10-28 after the maintainer's review and authorization: the work-draft source lost its review-only switcher, `publish` copied the skill into `skills/dsh-spec-merging-stacked-prs/` and removed the work directory and the declared drafts, `pnpm run skill:refresh` mirrored it into `.agents/skills/`, the skill-root `THIRD_PARTY_NOTICES` and the `license` field were added, `AGENTS.md` gained the skill in its current-skills list, the root `THIRD_PARTY_NOTICES.md` gained the adapted-skill entry, and this record moved to `implemented/process/`. The forge branch was rebased onto local `refactor/dsh-skills` at `c61d49c` and squash-merged as one commit; nothing is pushed. The record carries its Chinese companion and consistency record, completed at the final review.

## Unverified items

- **No bundled script means no offline contract test for the procedure.** The checks are prose the agent executes; two agents can read a state differently, and nothing pins the exit semantics. This is the accepted cost of the single-file shape (R11); the source itself has the same property.
- **A reported merge state can over-block.** A `mergeStateStatus` other than `CLEAN` blocks even where the maintainer could resolve the blocker differently, and the meaning of a status may drift. The skill names the claim and the stop; the agent must not read a status as ready by hand-waving.
- **The numbering rule is documented, not exercised.** `gh stack merge` resolves a bare number stack-first, and the extension documents that stack and pull-request numbers never overlap, so a boundary PR's number is unambiguous; the single-file procedure relies on that documented rule, and the first real landing exercises it read-only before any merge.
- **The landing repository's instructions may name no allowed history.** The source's two histories are then only candidates; the skill cannot choose one on the repository's behalf, so the agent reads the instructions first and asks or stops when they are silent rather than rewriting a branch on its own reading.
- **The merged-entry unstack behaviour is unverified.** `gh stack unstack --help` confirms queued and auto-merge entries remain stacked; the source's statement that merged entries cannot be unstacked is not verified, so the shipped skill instructs a stop rather than asserting the claim (S18, R9).
- **The merge method can be ambiguous.** When a repository prescribes no method, the source's `merge` is used; if that method is not allowed, GitHub rejects the merge and the agent resolves it through the repository's rules.
- **A partial landing in a merge-queue repository is only partly modeled.** The re-query and remaining-layer check follow the source, but a range split into queue groups can expose intermediate states the prose does not enumerate; the first real partial landing is a handover item.
- **GitHub's treatment of a stack that still lists merged members is unverified.** Both merge forms include the already-merged members below the boundary; the unverified behaviour is recorded rather than assumed.
- **No live stack was audited.** The GraphQL shape is confirmed by a read-only probe and introspection, but a real official stack may expose states the procedure does not enumerate. The first real landing confirms it read-only.
- **No merge-authorization gate is carried.** The skill merges after a passing preflight, as the source does; the re-query and no-bypass rules are the guards, and an adopting project that wants a human answer adds it in its own layer (R8).
- **Review-draft and pairing steps.** The skill review draft is created at the stop after the last English edit; a later edit re-opens it. This record is paired with its Chinese companion and consistency record.
- **The landing is a local commit, not a pushed one.** The remote tracking branch still points at the pre-landing head, and the maintainer decides when to push.

## Handover

The maintainer reviewed the work and authorized the landing on 2026-10-28. The landing performed these acts:

- Removed the review-draft-only English switcher from the work-draft source, then published the work directory into `skills/dsh-spec-merging-stacked-prs/` and removed the work directory; `publish` removed the declared review drafts.
- Added the skill-root `THIRD_PARTY_NOTICES` and the `license` frontmatter field, and added the skill to the root `THIRD_PARTY_NOTICES.md` list of adapted skills.
- Refreshed the installed copies, so `.agents/skills/dsh-spec-merging-stacked-prs/SKILL.md` mirrors the landed skill.
- Updated the skill list in `AGENTS.md`.
- Moved this record to `implemented/process/` with its Chinese companion and consistency record.
- Rebased the forge branch onto `refactor/dsh-skills` at `c61d49c` and squash-merged it as one commit; nothing is pushed.

The acts and decisions below remain with the maintainer:

- Push `refactor/dsh-skills` when the landing should be published; the remote tracking branch still points at the pre-landing head.
- Audit a real stack read-only before the first real landing; the unverified states are listed above.
- Keep or delete the forge branch and worktree; the squash commit is the landed state.

## Alternatives considered

**Keep the read-only audit script.** It gave a stable JSON/exit contract and 46 offline tests, and it was accepted twice. It lost because the driver reviewed its rigidity and coverage risk — an unmodeled state or a false blocker can stop the agent, and the script was starting to act as the skill's gate rather than an aid — and chose the upstream single-file shape, where the agent runs the source's own commands and can re-derive, inspect raw output and adapt. The trade is recorded in R11 and § Risks.

**Copy the upstream skill unchanged.** It is the shortest route to a faithful mechanism. It lost because the upstream text points at documents the target does not ship (the root `AGENTS.md` and the cookbook page) and fixes one repository's merge method and history policy; the target needs those points stated or disposed.

**Keep the repository-derived rules of the first design.** The per-pull-request authorization and the declaration-owned method/history policy were accepted once. It lost because the source boundary excludes this repository's content: those rules are neither upstream requirements nor target-domain facts.

**Make the merge method unconditionally the source's `--merge`.** It is one less decision. It lost because the target is general GitHub pull-request operation, and a repository that prescribes squash or rebase would either fail the merge or be told to bypass its own rules; the repository-prescribed method with the source's fallback keeps the source value as the default without enforcing it. GitHub still rejects a method the repository does not allow, so the fallback fails safe.

**Keep the `mergedAt` requirement in the verify step.** It is an extra confirmation. It lost because the source requires only `MERGED`; the field is reported as evidence, not gated.

## Consequences

- The set ships `dsh-spec-merging-stacked-prs` from `skills/dsh-spec-merging-stacked-prs/` as one `SKILL.md` plus its `THIRD_PARTY_NOTICES`, with an identical installed copy, and `AGENTS.md` lists it among the current skills.
- The skill is the upstream mechanism in one file: the official stack object as membership authority, additive same-author linking, the two refresh histories, `gh stack merge` only, whole-stack or bounded-prefix landing, and `MERGED` before deletion, with the source's commands carried inline.
- Costs: no bundled script means no stable JSON/exit contract and no offline contract test for the procedure; the checks rest on the agent's reading of GitHub's state. The single-file shape also gives up the script-shape's deterministic preflight and 46 offline cases.
- What it bought: a skill that stays close to the upstream single file, with no package or test surface for adopters to maintain, and an agent free to re-derive, inspect raw output and handle states a script does not model.
- Risks carried forward: the documented numbering rule, a landing repository that names no allowed history, merge-method ambiguity, merge-queue intermediate states, GitHub's handling of stacks that still list merged members, and the absence of a live stack audit (all listed in § Unverified items).
- Rollback: revert the squash commit on `refactor/dsh-skills` and refresh the installed copies again; `submodules/dsh` is untouched, so no upstream pin needs repair.
