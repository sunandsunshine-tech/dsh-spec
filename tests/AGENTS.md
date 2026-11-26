# Functional suite

The suite covers the checks and tooling this repository owns rather than the skills it ships: the DCO
check, the vendored-notices submission, the CLI contract, the corpus and bundle gates, the pinned
toolchain, the skill gate, the Agent Note gate, the change-scope report, the draft lifecycle, the
installed-copy refresh and the shipped pairing mechanism. Run the commands below
from the repository root.

```sh
pnpm test
```

Node.js 24.11+ on the 24 line, or 26+, and the root development dependencies installed by
`pnpm install` are required; Node.js 26 is the primary development baseline. The runner executes TypeScript directly, so no transform is needed, but the sibling-reference gate imports the root `markdown-it`, `parse5` and `yaml` packages.
`pnpm test` is the documented entry point.

```sh
pnpm run test:browser-gif
```

This separate media scenario requires `ffmpeg` and `ffprobe`. It runs once on Node 26 in CI so the
Node matrix does not repeat the same external media process; CI installs the binaries only for that
line, and the test fails rather than skipping when either binary is absent.

## Layout

| Path | Owns |
|---|---|
| `helpers/fixtures.ts` | Scratch repositories: a temporary directory with its own `git init`, files, and a commit. A gate reads its scope through `--root`, so a case needs a real repository rather than a mock. |
| `helpers/workspace.ts` | Scratch directory trees for the workspace tooling: a temporary root, files written into it, and a disposal, without Git. |
| `helpers/cli.ts` | Invoking a repository-side script, and reading its exit status and both streams. |
| `helpers/bundles.ts` | The work-draft/landed bundle resolution shared by the cases that run a bundled skill script. |
| `helpers/fake-cdp-chrome.mjs` | A deterministic fake DevTools endpoint for the browser GIF capture fixture: programmatic commands, successful screenshots, post-handshake disconnects and a descendant process for cleanup checks. |
| `cli-contract.test.ts` | The shared command-line contract: `--help`/`-h`, unknown-option diagnostics, exit codes and indented JSON, checked across the repository and bundled scripts. |
| `dco.test.ts` | `scripts/verify-dco.ts`: the trailer half, decided from `git log` alone, and the bot-identity half, decided against a `gh` stand-in. |
| `toolchain.test.ts` | The pinned pnpm version agreeing across `package.json`, the checks workflow and the lockfile's self-management document; the Node engine, CI matrix, type-check configuration, direct toolchain pins, format/lint/type negative controls and shipped bundle targets. |
| `check-bundles.test.ts` | `scripts/check-bundles.ts`: changed, missing and extra committed-bundle states through the comparison function. |
| `build-skills.test.ts` | `scripts/build-skills.ts`: a successful build that writes nothing gets a clean diagnostic instead of an ENOENT crash. |
| `verify-corpus.test.ts` | `scripts/verify-corpus.ts`: the archive baseline flag forwarded to the notes archive, development eval inputs excluded from translation discovery, sibling-reference gate output and failure propagation, and empty-value usage errors. |
| `sibling-skill-references.test.ts` | `scripts/verify-sibling-references.ts`: exact availability forms, metadata exclusions, Markdown visible text and source lines, link/code/HTML and symlink handling, empty corpora and single-skill corpora. |
| `vendored-submission.test.ts` | `scripts/submit-vendored.ts`: the payload the dependency-submission endpoint requires, printed by a dry run; and the generated notice table plus each skill-root bundled-package list. |
| `skill-spec.test.ts` | `skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs`: the mechanical half of Agent Skills conformance. |
| `agent-notes.test.ts` | `skills/dsh-spec-agent-notes/scripts/notes.mjs`: `init`, the non-empty active Agent Note tree (folders, filenames, header, required sections, declared companions, non-default roots and symlinked paths) and the non-empty frozen archive (manifest, required companion readiness, seal, append-only baseline and sealed companions). |
| `forge-lifecycle.test.ts` | `skills/dsh-spec-skill-forge/scripts/forge.mjs`: the work directory, translation-pair and publish lifecycle, including the pair exclusion and cleanup scope. |
| `skill-defaults.test.ts` | The default-bearing skill inventory, the single shared default contract in each skill, its use-site values, and the forge's acceptance requirement. |
| `refresh-skills.test.ts` | `scripts/refresh-skills.ts`: each skill under `skills/` replaces its installed copy, and other installed skills stay alone. |
| `translation-docs.test.ts` | The pairing mechanism (source in `package/dsh-spec-translate-docs/`, bundle at the work-draft path while forging and under `skills/` after landing): the existing-pair gate, one aggregate multi-language record per source, per-file source and target languages, `--select`/`--skip` and discovery prunes, structural switchers and link locale, generated regions with section anchors and the region helper CLI, the briefing and mechanical splice, the terminology template and the CLI's failure modes. |
| `skill-scenarios.test.ts` | The capability, companion, change-description, error-contract, review-integration and browser-evidence scenario contract for translation, simplification, forge, Agent Notes, PR descriptions, error-handling, code review, pre-push checks, client UI review and browser GIF work: validates isolation profiles, generic note units, model-selected target policy, progressive target addition, active-scope target removal, archive readiness, stack-local AI Usage migration, stable failure identity, boundary preservation, silent-handler safety, rendered-consumer coverage, review and pre-push handling of failure identity plus rendered UI evidence, reliability-routing sibling profiles, browser-capture handoff, fixture disclosure, declared inputs, containment, semantic content pins, trigger surfaces, recorded skill revisions, and fail-closed validation of empty, blank or meaningless corpora. It stages each development corpus into a temporary skill at the official `evals/` path and runs the skill-spec gate there. Actual model runs remain external evidence for the behavior each scenario names. |
| `skill-evals/<skill>/evals/` | Development-only Agent Skills eval manifests and inputs. Their canonical source stays outside `skills/`, then a runner or test copies them into a temporary skill for evaluation. They are never installed or shipped. |
| `browser-gif-capture.test.ts` | The browser GIF capture fixture: successful atomic evidence publication, post-handshake command rejection, a complete-run deadline, partial-run failure without old or mixed evidence, and browser process-group/profile cleanup. |
| `runner-safety.test.ts` | Focused negative controls for model-eval credential screening, final-response and artifact budgets, streaming hashes, bounded tree copies, tmpfs quota arguments and real bubblewrap workspace quota, retained-output symlinks, evidence replacement paths, trusted Git inspection, capability masks, executable mode bindings, terminal events, whole-run deadlines, comparison counterpart promotion and pre-promotion privacy canaries. |
| `evidence-policy.test.ts` | The shared model-evidence policy: claim/comparison typing, affected-scenario currentness, target-absent counterpart restrictions, no-follow trace reads, terminal events, whole-run deadlines, common retained-run validation and exact privacy scopes across text, paths and binary surfaces. |
| `skill-evals/evidence-policy.mjs` | Shared claim, comparison, currentness/provenance, safe retained-file, terminal-event and privacy-scope validation used by the model runner and repository tests. |
| `browser-gif-encoder.test.ts` | Fast browser GIF encoder command, preflight and missing-media contracts; every case finishes before media encoding. |
| `browser-gif-encoder.media.ts` | One real-media scenario covering video timing, screenshot frame order, per-frame duration, loop metadata and safe output replacement. The CI media step runs it once on Node 26. |
| `repository-shape.test.ts` | The tree invariants the tooling relies on: every package script is one command, every landed skill has an identical installed copy, the split note modules carry SPDX/provenance headers, and active record test sections do not name removed commands. |
| `change-scope.test.ts` | The bundled change-scope report: built from `package/dsh-spec-pre-push-checks/change-scope.ts`, run from the work draft or the landed `skills/dsh-spec-pre-push-checks/scripts/change-scope.mjs`; covers the committed, staged, unstaged and untracked path sets, base/head/merge-base resolution, the `--help` and usage-error contract, and the failure exits. |

## Rules this suite keeps

- **No network.** Every case is local: the DCO check's GitHub lookup runs through a `gh` stand-in
  first on `PATH`, and the submission is exercised through `--dry-run`.
- **A case pins the behavior, not the implementation.** It names the behavior in the test title, so a
  failure reads as a statement about the design rather than about a line of code, and a refactor that
  preserves the contract leaves it passing.
- **Every acceptance criterion has a case**, and a defect gets a case that reproduces it before the fix.
- **Runtime fixtures are built, not committed.** A scratch repository or workspace is created per
  case and disposed after it. The `tests/skill-evals/` corpus is the deliberate exception because
  it is versioned evaluation input, and it is injected only into a disposable skill copy.
