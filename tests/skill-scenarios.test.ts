/**
 * Development-side model scenarios for prompt writing, isolated-context capabilities, Agent Notes
 * companion defaults, Translate Docs scoped authorization, description-trigger evidence,
 * durable-prose contract restoration, the forge's capability conclusions, error-contract judgment,
 * Web UI review evidence and browser GIF capture.
 *
 * The source corpus lives under tests/ because skills/ is a distribution artifact. The tests stage
 * a temporary skill copy with the corpus at the official evals/ path. They bind retained runs to
 * their current scenario, input, behavior-skill and exact trigger-query provenance.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir, userInfo } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { test } from 'node:test'

import { createCaptureFixture, waitForProcessGone } from './helpers/capture-browser-fixture.ts'
import { isolatedGitEnv, REPO_ROOT } from './helpers/fixtures.ts'

const safety = (await import('./skill-evals/runner-safety.mjs' as string)) as {
  isolatedGitEnvironment(
    extra?: Record<string, string | undefined>,
    inherited?: NodeJS.ProcessEnv,
  ): Record<string, string>
}
const evidencePolicy = (await import('./skill-evals/evidence-policy.mjs' as string)) as {
  assertComparableEvidenceArms(
    candidate: unknown,
    baseline: unknown,
    options: { scenario: Scenario; candidateEvidenceSha256: string; baselineEvidenceSha256: string },
  ): void
  hashEvidenceMetadata(root: string): string
  assertRetainedRunPolicy(options: {
    root: string
    metadata: EvidenceMetadata
    observed: Record<string, string | null>
    provenance?: RetainedEvidenceObservation['provenance']
    canaries: Array<{ set: string; value: string }>
  }): EvidenceMetadata
  readEvidenceMetadata(root: string): EvidenceMetadata
  inspectRetainedRun(root: string, metadata: unknown): RetainedEvidenceObservation
  inspectRetainedTriggerRun(
    root: string,
    metadata: EvidenceMetadata,
    canaries: Array<{ set: string; value: string }>,
  ): {
    query: { id: string; query: string; should_trigger: boolean; agent_file: string }
    currentness: Record<string, string | null>
    execution: EvidenceMetadata['execution']
  }
  privacyCanariesFor(
    skill: string,
    subject: string,
    options?: { includeCurrentHome?: boolean; currentHome?: string },
  ): Array<{ set: string; value: string }>
  readEvidenceMetadataRecord(
    root: string,
    canaries?: Array<{ set: string; value: string }>,
  ): {
    metadata: ModelEvidenceMetadata
    sha256: string
  }
  validateScenarioClaim(skill: string, scenario: Scenario): unknown
  finalAgentMessageFromTrace(traceText: string): string | undefined
  readRetainedTrace(root: string): string
  modelPromptComponents(
    skill: string,
    scenario: Scenario,
    arm: 'target-present' | 'target-absent',
  ): { scenarioPrompt: string; armInstruction: string; promptGuard: string; renderedPrompt: string }
  scenarioDefinitionHash(scenario: Scenario): string
  sha256(value: string | Buffer): string
  triggerCorpusSha256(options: {
    corpus: string | Buffer
    agentFile: string
    agent: string | Buffer
    files?: Array<{ path: string; bytes: string | Buffer; mode: string }>
  }): string
  triggerSurfaceSha256(skillText: string): string
}

interface ModelEvidenceMetadata extends EvidenceMetadata {
  claim: {
    type: string
    subject: string
  }
  arm: string
  evidence: {
    kind: string
    currentness: Record<string, string>
  }
  provenance: {
    target_skill_tree_sha256: string
    dependency_skill_tree_sha256: string
  }
  privacy: {
    canary_sets: string[]
    scope_sha256: string
    surfaces: string
  }
}

interface Scenario {
  id: string
  prompt: string
  expected_output: string
  assertions: string[]
  files?: string[]
  capabilities?: {
    browser?: boolean
    media?: boolean
  }
  allow_subagents?: boolean
  comparison?: {
    baseline: string
    candidate: string
    conditions: string[]
  }
  change_patch?: string
  change_root?: string
  project_root?: string
  install?: string[]
  outputs?: string[]
}

interface ScenarioCorpus {
  skill_name: string
  evals: Scenario[]
}

interface EvidenceMetadata {
  claim: {
    type: string
    subject: string
  }
  arm: string | null
  comparison: unknown
  evidence: {
    currentness: Record<string, string | null>
  }
  execution: {
    auth: string
    browser: boolean
    media: boolean
    model_config_sha256: string
    model_runtime_sha256: string
    sandbox: string
    subagents: boolean
  }
  deadline_ms: number
  privacy: {
    canary_sets: string[]
    scope_sha256: string
    surfaces: string
  }
}

interface RetainedEvidenceObservation {
  scenario: Scenario
  currentness: Record<string, string>
  provenance: {
    target_skill_tree_sha256: string | null
    dependency_skill_tree_sha256: string
  }
}

interface StagedSkill {
  temporaryRoot: string
  skillRoot: string
}

interface RequiredProfile {
  skill: string
  ids: string[]
  noIsolationIds: string[]
  isolatedIds: string[]
  handoffIds: string[]
}

const REQUIRED: RequiredProfile[] = [
  {
    skill: 'dsh-spec-translate-docs',
    ids: [
      'no-isolation-local-update-completes',
      'no-isolation-whole-document-handoff',
      'isolated-context-whole-document',
      'owner-authorizes-one-source-scope',
      'ambiguous-target-grants-no-default-pair',
      'explicit-multiple-targets-handoff',
      'progressive-target-addition-single-source',
      'target-removal-active-scope',
      'range-operation-does-not-create-missing-target',
      'source-rename-keeps-pair',
      'briefing-is-delta-plus-style-source',
    ],
    noIsolationIds: [
      'no-isolation-local-update-completes',
      'no-isolation-whole-document-handoff',
      'explicit-multiple-targets-handoff',
    ],
    isolatedIds: ['isolated-context-whole-document'],
    handoffIds: ['no-isolation-whole-document-handoff'],
  },
  {
    skill: 'dsh-spec-find-simplifications',
    ids: [
      'no-isolation-broad-audit-runs-in-separate-passes',
      'no-isolation-boundary-handoff',
      'isolated-context-fanout',
    ],
    noIsolationIds: ['no-isolation-broad-audit-runs-in-separate-passes', 'no-isolation-boundary-handoff'],
    isolatedIds: ['isolated-context-fanout'],
    handoffIds: ['no-isolation-boundary-handoff'],
  },
]

const FORGE_REQUIRED: RequiredProfile = {
  skill: 'dsh-spec-skill-forge',
  ids: ['capability-dependent-fallback-design', 'description-derived-from-role-triggers-and-exclusions'],
  noIsolationIds: [],
  isolatedIds: [],
  handoffIds: [],
}

interface GeneralRequirement {
  id: string
  signature: RegExp[]
  expectedOutput?: RegExp[]
  assertions: RegExp[]
  install?: string[]
}

interface GeneralProfile {
  skill: string
  scenarios: GeneralRequirement[]
}

const GENERAL_REQUIRED: GeneralProfile[] = [
  {
    skill: 'dsh-spec-agent-experience',
    scenarios: [
      {
        id: 'minimal-context-and-explicit-discovery',
        signature: [
          /critical no-promise and payment-data constraints before any action guidance/i,
          /starting prompt compact/i,
          /exact path/i,
          /detailed resources discoverable/i,
        ],
        expectedOutput: [
          /purpose and critical .* constraints before action guidance, then lists the available actions/i,
          /description and an exact retrieval path/i,
          /only when the case needs it/i,
        ],
        assertions: [
          /purpose, available actions, and critical no-promise and payment-data constraints/i,
          /refund policy is deferred rather than copied/i,
          /description and an exact `read_resource` path/i,
          /when to retrieve each deferred resource/i,
          /critical constraints appear before action guidance/i,
        ],
      },
      {
        id: 'tool-parameter-rules-stay-with-parameters',
        signature: [/current\.schema\.json/i, /behavior notes are authoritative/i, /where each rule belongs/i],
        expectedOutput: [
          /operation does and returns/i,
          /Defaults and bounds are on their parameters/i,
          /canary-only percentage/i,
          /required only for production/i,
        ],
        assertions: [
          /tool description states the operation and result/i,
          /`replicas`.*default `2`, minimum `1`, and maximum `10`/i,
          /`start_at` and `timezone`.*schema dependency/i,
          /`rollout_strategy`.*default and enum.*`canary_percentage`.*required only for `canary`/i,
          /`approval_ticket`.*required when `environment` is `production`/i,
        ],
      },
      {
        id: 'bounded-results-with-local-context-and-retrieval',
        signature: [/surrounding conversation/i, /bounded result/i, /repeated broad searches/i],
        expectedOutput: [
          /bounded result set with stable thread and message identifiers/i,
          /small adjacent context window/i,
          /exact calls for retrieving more/i,
          /judge whether another search adds needed evidence/i,
        ],
        assertions: [
          /concise findings anchored by stable thread and message identifiers/i,
          /bounded amount of adjacent context and a result-limit boundary/i,
          /Omitted messages and truncation.*counts or identifier ranges/i,
          /concrete retrieval action.*thread identifier and message range or pagination/i,
          /judge whether further search or retrieval adds needed evidence/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-error-handling',
    scenarios: [
      {
        id: 'message-only-failure-gets-machine-identity',
        signature: [/stable machine-readable discriminant/i, /without parsing its message/i],
        expectedOutput: [/stable machine-readable discriminant/i, /exact identity and resulting state/i],
        assertions: [
          /machine-readable failure identity/i,
          /consumer action/i,
          /not used for machine routing/i,
          /exact identity and resulting state/i,
        ],
      },
      {
        id: 'worker-boundary-preserves-failure-identity',
        signature: [/worker boundary/i, /serializes only the message/i],
        expectedOutput: [
          /portable machine identity/i,
          /equivalent owning failure/i,
          /cause or equivalent structured detail/i,
        ],
        assertions: [
          /portable machine identity cross/i,
          /equivalent owning failure/i,
          /cause or equivalent structured detail/i,
          /boundary test/i,
        ],
      },
      {
        id: 'silent-handler-covers-one-safe-failure',
        signature: [/cleanup, commit, and notification/i, /discards every failure/i],
        expectedOutput: [/narrowed to the expected cleanup failure/i, /lets commit and notification failures surface/i],
        assertions: [
          /silent scope contains one operation/i,
          /stable discriminant/i,
          /reason states why discarding.*state valid/i,
          /unexpected failures/i,
        ],
      },
      {
        id: 'existing-project-identity-remains-authoritative',
        signature: [/existing machine identity/i, /Project.*kind/i],
        expectedOutput: [/does not add `name` or `code`/i, /exact `kind` and resulting state/i],
        assertions: [
          /kind.*machine identity/i,
          /No competing.*name.*code/i,
          /exact.*kind.*resulting state/i,
          /message is not used for machine routing/i,
        ],
      },
      {
        id: 'numeric-exit-identity-survives-without-cause-chain',
        signature: [/no cause chain/i, /numeric failure identity/i],
        expectedOutput: [
          /exact numeric exit status/i,
          /stderr in structured diagnostics/i,
          /does not replace the numeric identity with a string code/i,
        ],
        assertions: [
          /exact numeric exit status/i,
          /different consumer actions/i,
          /stderr in structured diagnostics/i,
          /No string code replaces the numeric identity/i,
        ],
      },
      {
        id: 'outcome-classification-and-extensible-codes',
        signature: [/no matches/i, /provider extensions/i],
        expectedOutput: [/remains.*success/i, /open code type/i, /tolerate unknown codes/i],
        assertions: [
          /successful empty-search result/i,
          /open code type/i,
          /Known plugin codes are exported/i,
          /tolerate unknown plugin codes/i,
        ],
      },
      {
        id: 'wrapper-preserves-cancellation-timeout-and-denial',
        signature: [/execution wrapper/i, /cancellation, timeout, and denial/i],
        expectedOutput: [/distinct machine-readable outcomes/i, /cause or details/i],
        assertions: [
          /distinct machine-readable outcomes/i,
          /does not reduce.*display text/i,
          /cause or structured detail remains preserved/i,
          /distinct downstream recovery actions/i,
        ],
      },
      {
        id: 'empty-catch-names-and-separates-operation',
        signature: [/silent handler/i, /structured failure/i, /ENOENT/i],
        expectedOutput: [
          /(?:visible|meaningful) binding/i,
          /safe(?:ty)? reason/i,
          /commit and notification failures remain visible/i,
        ],
        assertions: [
          /only the temporary-directory removal/i,
          /catch binding (?:names|exposes) the expected cleanup failure/i,
          /safety reason appears inside the catch/i,
          /Only the structured ENOENT failure is tolerated/i,
        ],
      },
      {
        id: 'empty-catch-names-and-documents-safe-failure',
        signature: [/empty handler/i, /cleanup failure is fully tolerated/i],
        expectedOutput: [/handler remains empty/i, /meaningful name/i, /state valid/i],
        assertions: [
          /catch body contains no executable statement/i,
          /catch binding names the expected cleanup failure/i,
          /safety reason is inside the catch handler/i,
          /failure identity and why discarding it leaves the state valid/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-code-review',
    scenarios: [
      {
        id: 'review-with-integrated-guidance',
        signature: [
          /HEAD against HEAD\^/i,
          /Read and apply the installed dsh-spec-code-review/i,
          /attached current-build screenshot/i,
          /Do not modify files or Git state/i,
        ],
        expectedOutput: [
          /existing `kind` failure identity/i,
          /structured `detail`/i,
          /rejects message-text routing/i,
          /attached current-build screenshot/i,
          /Settings state with Delete account enabled/i,
          /saving\/disabled state/i,
          /390-pixel narrow viewport remains unproved/i,
          /leaves that coverage incomplete/i,
        ],
        assertions: [
          /existing `kind` identity and structured `detail`/i,
          /rejects routing on the error message/i,
          /current-build screenshot .* Settings saving\/disabled state is not shown/i,
          /shared-consumer test as visual acceptance of the saving state/i,
          /390-pixel narrow viewport as unproved/i,
          /sibling guidance only as an optional mechanism/i,
        ],
      },
      {
        id: 'review-without-siblings',
        signature: [
          /HEAD against HEAD\^/i,
          /Error-handling and client-UI sibling guidance.*unavailable/i,
          /rendered screenshot .* unavailable/i,
        ],
        expectedOutput: [
          /still requires the project's existing `kind` identity/i,
          /structured `detail`/i,
          /unavailable Settings saving\/disabled rendered evidence/i,
          /resumable next step/i,
        ],
        assertions: [
          /existing `kind` identity and structured `detail`/i,
          /rejects routing on the error message/i,
          /Settings saving\/disabled rendered evidence as unavailable/i,
          /resumable next step.*instead of claiming visual acceptance/i,
        ],
      },
      {
        id: 'review-dependency-edges-and-reverse-edge',
        signature: [/dependency description/i, /base manifests/i, /current workspace manifests/i, /reverse-edge/i],
        assertions: [
          /verifies runtime edges from the workspace manifests/i,
          /app → validator edge and the validator responsibility/i,
          /app → core runtime edge/i,
          /removed app → legacy runtime edge/i,
          /core → app reverse dependency/i,
          /does not accept the description's reported edge list as complete/i,
        ],
      },
      {
        id: 'review-ordinary-ui-with-optional-reports-absent',
        signature: [
          /ordinary-ui-review/i,
          /current-build Settings screenshot/i,
          /component audit report and design-system full-audit record were not supplied/i,
        ],
        expectedOutput: [
          /reports no blocker/i,
          /optional omissions, not gaps/i,
          /still-valid evidence requires no recheck/i,
        ],
        assertions: [
          /no blocker for the ordinary page-local spacing change/i,
          /component audit report as an optional omission rather than a gap/i,
          /does not require a design-system full-audit record/i,
          /does not demand rechecking the still-valid rendered evidence/i,
        ],
      },
      {
        id: 'review-projection-state-size-history-and-migration',
        signature: [
          /projection-review/i,
          /project design rules/i,
          /do not import another project's projection defaults/i,
        ],
        expectedOutput: [
          /SESSION-1.*runtime reader/i,
          /SESSION-2.*grows linearly/i,
          /SESSION-3.*full event history/i,
          /SESSION-4.*PROJECTION_VERSION stays 1 with no migration/i,
        ],
        assertions: [
          /SESSION-1 because a runtime reader is stored/i,
          /SESSION-2 because an unbounded event history/i,
          /SESSION-3 because readHistory synchronously exposes/i,
          /SESSION-4 because recovery semantics changed/i,
          /adopting project's declared rules/i,
        ],
      },
      {
        id: 'review-projection-rules-unavailable',
        signature: [
          /projection-unruled-review/i,
          /without importing defaults/i,
          /ownership, state size, historical reads, and migration behavior/i,
        ],
        expectedOutput: [
          /declares no state-persistence, projection, or recovery rules/i,
          /explicit review gap/i,
          /does not apply another project's fixed-size, version, checkpoint, or migration defaults/i,
          /or present the rule-dependent review as complete/i,
        ],
        assertions: [
          /declares no projection or recovery rules/i,
          /records the projection review as an explicit gap/i,
          /does not import another project's bounds, version, checkpoint, or migration defaults/i,
          /does not present the rule-dependent projection review as complete/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-pre-push-checks',
    scenarios: [
      {
        id: 'select-integrated-evidence',
        signature: [
          /HEAD against HEAD\^/i,
          /Read and apply the installed dsh-spec-pre-push-checks/i,
          /attached current-build screenshot/i,
          /do not author a missing test/i,
        ],
        expectedOutput: [
          /existing `kind` identity/i,
          /structured `detail`/i,
          /rejects message-text routing/i,
          /attached current-build screenshot/i,
          /saving\/disabled Settings state.*remain unproved/i,
          /390-pixel narrow viewport remain unproved/i,
          /does not present the consumer test as visual acceptance/i,
        ],
        assertions: [
          /existing `kind` identity and structured `detail`/i,
          /rejects message-text routing/i,
          /current-build screenshot .* Settings saving\/disabled state remains unproved/i,
          /consumer test as visual acceptance of the saving state/i,
          /390-pixel narrow viewport as unproved/i,
          /sibling guidance only as an optional mechanism/i,
        ],
      },
      {
        id: 'select-minimum-without-siblings',
        signature: [/HEAD against HEAD\^/i, /without .*sibling guidance/i, /without a rendered screenshot/i],
        expectedOutput: [
          /still requires the existing `kind` identity/i,
          /structured `detail`/i,
          /Settings saving\/disabled rendered evidence as unavailable/i,
          /consumer test as visual acceptance/i,
        ],
        assertions: [
          /existing `kind` identity and structured `detail`/i,
          /rejects message-text routing/i,
          /Settings saving\/disabled rendered evidence as unavailable/i,
          /concrete next step before completion/i,
        ],
      },
      {
        id: 'select-rebase-refresh-with-rerere',
        signature: [/three-layer stack/i, /No author has requested merge-forward/i],
        expectedOutput: [
          /enables rerere/i,
          /rerere\.autoUpdate.*unset or false/i,
          /native cascading rebase/i,
          /does not choose merge-forward/i,
        ],
        assertions: [
          /enables rerere.*before rebasing/i,
          /native cascading rebase/i,
          /does not require an author request that does not exist/i,
          /revalidates every replayed layer/i,
        ],
      },
      {
        id: 'route-test-reliability-with-sibling',
        signature: [/asynchronous subprocess test/i, /dsh-spec-ci-test-reliability sibling is installed/i],
        expectedOutput: [
          /owning worker test/i,
          /applicable test-reliability requirements/i,
          /un-awaited child-process termination requires quiescent-teardown evidence/i,
          /optional guidance/i,
        ],
        assertions: [
          /owning worker test rather than the full suite/i,
          /applicable test-reliability requirements before selecting evidence/i,
          /identifies the un-awaited child-process termination and requires quiescent-teardown evidence/i,
          /sibling only as availability-qualified guidance/i,
          /does not copy the sibling's commands or internal procedure/i,
        ],
        install: ['dsh-spec-ci-test-reliability'],
      },
      {
        id: 'route-test-reliability-without-sibling',
        signature: [/asynchronous subprocess test/i, /dsh-spec-ci-test-reliability sibling is not installed/i],
        expectedOutput: [
          /still runs the owning worker test/i,
          /applicable test-reliability requirements/i,
          /un-awaited child-process termination requires quiescent-teardown evidence/i,
          /without treating the missing sibling as a blocker/i,
        ],
        assertions: [
          /owning worker test rather than the full suite/i,
          /applicable test-reliability requirements before selecting evidence/i,
          /identifies the un-awaited child-process termination and requires quiescent-teardown evidence/i,
          /does not treat the missing sibling as a blocker/i,
        ],
        install: [],
      },
    ],
  },
  {
    skill: 'dsh-spec-agent-notes',
    scenarios: [
      {
        id: 'enabled-translation-defaults-bilingual',
        signature: [/Chinese counterpart/i, /consistency record/i, /project instructions select Chinese/i],
        assertions: [/counterpart and consistency record/i, /AGENTS\.md/i],
      },
      {
        id: 'no-translation-defaults-english-only',
        signature: [/no translation mechanism/i, /English-only/i],
        assertions: [/English-only/i, /No translation companion/i],
      },
      {
        id: 'user-selects-english-only',
        signature: [/explicit English-only request/i, /overrides/i],
        assertions: [/current request.*wins/i, /No counterpart/i],
      },
      {
        id: 'project-override-bounds-language-and-scope',
        signature: [/project override/i, /Japanese/i, /notes\/proposed/i],
        assertions: [/Japanese.*implemented public note/i, /proposed.*English-only/i, /exclusions/i],
      },
      {
        id: 'translation-failure-stays-incomplete',
        signature: [/Japanese terminology table is invalid/i, /unfinished unit/i],
        assertions: [/source, target, failed step/i, /not sealed/i],
      },
      {
        id: 'installed-skill-is-not-enabled',
        signature: [/skill is installed/i, /not enable/i],
        assertions: [/Installed skill text is not treated as a project override/i, /English-only/i],
      },
      {
        id: 'no-peer-uses-user-language',
        signature: [/no complete peer pair/i, /user language is Japanese/i],
        assertions: [/Japanese/i, /does not choose Chinese/i],
      },
      {
        id: 'unavailable-translation-defaults-english-only',
        signature: [/translation workflow is unavailable/i, /English-only/i],
        assertions: [/unavailable translation capability/i, /No counterpart/i],
      },
      {
        id: 'existing-note-first-archive-uses-ladder',
        signature: [/Git checkout/i, /Translate Docs/i, /seal plan/i, /readiness/i],
        assertions: [/before moving/i, /readiness.*seal/i, /complete selected unit/i],
      },
      {
        id: 'non-translation-companion-survives',
        signature: [/non-translation/i, /\.metadata\.yaml/i],
        assertions: [/English-only removes only a translation companion/i, /metadata companion remains/i],
      },
      {
        id: 'existing-notes-are-not-backfilled',
        signature: [/new implemented process decision/i, /unchanged/i],
        assertions: [/new note follows/i, /No existing active note is backfilled/i, /sealed unit remains unchanged/i],
      },
      {
        id: 'explicit-multiple-targets',
        signature: [/Chinese and Japanese/i, /one note unit/i],
        assertions: [/each target.*counterpart/i, /common consistency record/i],
      },
      {
        id: 'same-class-targets-inferred',
        signature: [/same class/i, /complete (?:note )?pair/i, /user language is English/i],
        assertions: [/Chinese and Japanese/i, /before.*user.language/i],
      },
      {
        id: 'source-language-user-language-no-pair',
        signature: [/user language is English/i, /source.*English/i],
        assertions: [/does not create an English counterpart/i, /free of a redundant translation companion/i],
      },
      {
        id: 'conflicting-peer-targets-no-arbitrary-default',
        signature: [/peer pairs.*different target sets/i, /without asking/i],
        assertions: [/does not choose Chinese or Japanese arbitrarily/i, /No counterpart/i],
      },
      {
        id: 'progressive-target-addition',
        signature: [/policy now adds Japanese/i, /modify only/i],
        assertions: [/modified note.*Japanese/i, /untouched note.*unchanged/i, /new note.*both/i],
      },
      {
        id: 'target-removal-active-only',
        signature: [/removes Japanese/i, /active scope/i, /sealed.*unchanged/i],
        assertions: [/every eligible active unit.*Japanese/i, /sealed unit.*unchanged/i],
      },
      {
        id: 'archive-readiness-required',
        signature: [/prepare/i, /readiness check fails/i],
        assertions: [/does not seal/i, /manifest.*unchanged/i, /failed step/i],
      },
      {
        id: 'external-companion-mechanism',
        signature: [/without the repository's Translate Docs skill/i, /review-companion mechanism/i],
        assertions: [/--member path mapping/i, /different-stem nested review companion/i],
      },
      {
        id: 'proposal-first-issue-links-active-note',
        signature: [/issue #133/i, /substantial/i, /no proposed owner/i, /branch-local draft/i],
        expectedOutput: [
          /branch-local draft.*not active inventory/i,
          /proposed\/process/i,
          /issue\.md links to.*proposal.*proposal links back to issue\.md/i,
          /measured reintroduction condition/i,
          /without copying the proposal/i,
          /notes check passes/i,
        ],
        assertions: [
          /proposal links issue\.md.*issue\.md links back.*status.*evidence/i,
          /Problem.*Proposal.*Alternatives considered.*Acceptance criteria.*Risks/i,
          /work-record removal decision.*measured reintroduction condition/i,
          /branch-local unmerged draft.*not.*active inventory/i,
          /No implementation change.*active work record.*active-tree check passes/i,
        ],
      },
      {
        id: 'proposal-unavailable-hands-off-inventory',
        signature: [/issue #141/i, /cannot be inspected/i, /proposal-unavailable\/unmerged-draft\.md/i],
        expectedOutput: [
          /does not begin implementation.*unmerged draft.*active inventory/i,
          /hands off.*missing.*inventory.*execution tracker/i,
          /resumable next step.*restore inspection.*retain.*review a proposal/i,
        ],
        assertions: [
          /unmerged draft.*not.*active inventory.*approval.*implementation authority/i,
          /unavailable target-branch notes inventory.*execution tracker/i,
          /project files unchanged.*no note.*work record.*implementation/i,
          /resumable next step.*restore inspection.*retain.*review a proposal/i,
        ],
      },
      {
        id: 'proposal-checkpoint-keeps-partial-moves-complete',
        signature: [/issue #140/i, /checkpoint/i, /one tracker item/i, /design authority/i],
        expectedOutput: [
          /resumable-export.*proposed\/feature/i,
          /retention-policy.*Chinese counterpart.*consistency record.*implemented\/feature/i,
          /tracker item.*current note path.*note links back.*own tracker item/i,
          /notes check.*companion declarations/i,
          /No translation.*Chinese translated prose.*unchanged/i,
        ],
        assertions: [
          /resumable-export.*proposed.*complete bilingual unit.*pending criterion/i,
          /retention-policy.*implemented\/feature.*English note.*Chinese counterpart.*lifecycle heading tokens/i,
          /tracker item.*current note path.*note links back.*own tracker item/i,
          /Source and tests remain unchanged.*work record.*notes check.*companion declarations/i,
          /No translation.*subagent.*terminology edit.*Chinese prose.*byte-for-byte.*except.*lifecycle tokens.*pair records.*replay/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-client-ui-ux',
    scenarios: [
      {
        id: 'shared-widget-consumer-coverage',
        signature: [/shared button change/i, /SearchPage/],
        assertions: [
          /SearchPage and SettingsPage/i,
          /identifies which affected interactive states remain unverified/i,
          /rendered evidence/i,
          /consumer or state not inspected is named as a gap/i,
          /controlled comparison rather than historical provenance/i,
        ],
      },
      {
        id: 'missing-rendered-evidence-handoff',
        signature: [/No browser/i, /unit tests pass/i],
        assertions: [
          /does not claim visual acceptance/i,
          /missing rendered page or recording capability/i,
          /completed source and test evidence/i,
          /resumable next step/i,
        ],
      },
      {
        id: 'project-declares-equivalent-evidence',
        signature: [/labeled screenshot pair/i, /instead of a GIF/i],
        assertions: [
          /screenshot pair as the evidence form/i,
          /does not require a GIF/i,
          /simulated focus pair is rejected/i,
          /Missing rendered coverage remains a gap/i,
        ],
      },
      {
        id: 'capability-present-real-browser',
        signature: [/evidence-default probe/i, /no visual-evidence form/i],
        assertions: [
          /rendered evidence is required without relying on a project-declared form/i,
          /runs the application and browser evidence path/i,
          /inspects the generated artifacts and reports their source and provenance/i,
          /does not claim formal visual approval when the project declares no approval policy/i,
        ],
      },
      {
        id: 'responsive-draft-and-touch-input',
        signature: [/replacing the form markup/i, /in-progress draft/i, /no minimum input-size rule/i],
        assertions: [
          /preserves the in-progress draft/i,
          /coarse-pointer text input remains at least 16 CSS pixels/i,
          /rendered draft and focused-input states/i,
          /does not treat the source correction as rendered acceptance/i,
        ],
      },
      {
        id: 'shared-icon-rendering-contract',
        signature: [/shared icon rendering change/i, /stroke and fill rendering contract/i],
        assertions: [
          /non-scaling stroke behavior and intentional fill geometry/i,
          /intentional filled contour.*rendered geometry unproved/i,
          /target CSS sizes and device-pixel ratios/i,
          /missing rendered evidence as a gap/i,
          /does not replace the shared rendering contract/i,
        ],
      },
      {
        id: 'spacing-grouping-and-overlay-fit',
        signature: [/spacing and anchored-overlay change/i, /render report/i, /placement timeline/i, /spacing tokens/i],
        assertions: [
          /object and action groups/i,
          /inter-group gap smaller than an intra-group gap/i,
          /heading separated from its own content/i,
          /outside-click dismissal and Escape.*focusable/i,
          /only the outside-click path/i,
          /clipped at the supported viewport/i,
          /missing edge margin and inaccessible action/i,
          /flip oscillation/i,
          /flipping only into a side that fits/i,
          /no repeated back-and-forth/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-ci-test-reliability',
    scenarios: [
      {
        id: 'reserve-port-at-listener',
        signature: [/EADDRINUSE/i, /scan-then-bind/i],
        assertions: [
          /atomic port allocation/i,
          /pre-fix fixture fails deterministically/i,
          /waits? for readiness/i,
          /rejects? global serialization/i,
          /focused test passes/i,
        ],
      },
      {
        id: 'restore-exact-global-state',
        signature: [/passes alone/i, /another test runs first/i],
        assertions: [
          /absent environment entry/i,
          /registered immediately/i,
          /restores real timers/i,
          /focused suite passes/i,
        ],
      },
      {
        id: 'diagnose-without-fixing',
        signature: [/Do not change code/i, /only need the supported diagnosis/i],
        assertions: [
          /no code, workflow, rerun, or configuration change/i,
          /repeated EADDRINUSE signature/i,
          /separates timeout expiry from signal termination/i,
          /smallest relevant reproduction/i,
          /host metrics are unavailable/i,
        ],
      },
      {
        id: 'redesign-slow-repeated-suite',
        signature: [/repeats the same expensive fixture/i, /multiplies three timeout groups/i],
        assertions: [
          /removes repeated expensive fixture setup/i,
          /Fast contract cases remain separate/i,
          /not duplicated across lanes/i,
          /test entry passes/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-prose-standard',
    scenarios: [
      {
        id: 'coordinator-contract-survives-transcript-trim',
        signature: [/over-trimmed/i, /working-notes\.md/i, /caller-visible contract fact/i],
        expectedOutput: [
          /per-session serialization and independent ordering between sessions/i,
          /rejects new writes after disposal starts/i,
          /waits for accepted writes before flushing buffered events/i,
          /preserves the backend error/i,
          /queued writes.*failed same-session write.*same error.*without reaching the backend/i,
          /intentional slow-backend isolation rationale/i,
          /exact message `coordinator is closing`/i,
          /rejected `flushBufferedEvents\(\)` through `dispose\(\)`/i,
          /public API is unstable with no compatibility guarantee/i,
          /removes first-person investigation/i,
          /does not restate the source file line by line/i,
        ],
        assertions: [
          /per-session write serialization and independent ordering between sessions/i,
          /new writes are rejected once disposal starts.*accepted writes drain before buffered events are flushed/i,
          /buffered events are flushed before the disposal promise resolves/i,
          /backend error.*caller that submitted the write.*does not retry/i,
          /queued behind a failed write in the same session.*same backend error.*without reaching the backend/i,
          /cross-session serialization is intentionally absent.*slow backend.*does not block another session/i,
          /exact new-write rejection text `coordinator is closing`/i,
          /rejected `flushBufferedEvents\(\)` propagates its backend error through `dispose\(\)`/i,
          /public API surface is unstable and makes no compatibility guarantee/i,
          /removes authoring-session narration and does not add a code walkthrough/i,
        ],
      },
      {
        id: 'control-flow-comment-keeps-load-order-contract',
        signature: [/block comment above registerTools/i, /remove control-flow narration/i],
        expectedOutput: [
          /no longer lists first, next, then, or finally steps/i,
          /workspace policy is registered before model-facing tools/i,
          /write and edit call passes through the read-before-mutation gate/i,
          /executable code is unchanged/i,
        ],
        assertions: [
          /removes the step-by-step loading narration/i,
          /workspace policy loads before model-facing tools/i,
          /both write and edit calls pass through the read-before-mutation gate/i,
          /executable code remains unchanged/i,
        ],
      },
      {
        id: 'leakage-keeps-survive-mixed-readme-audit',
        signature: [/Audit .*README\.md.*chain-of-thought leakage/i, /Preserve durable references/i],
        expectedOutput: [
          /issue #1470 follow-up reference/i,
          /complete-rendered-value scope.*including wrappers/i,
          /present-tense byte-length counterfactual/i,
          /measured depth bound with 512, 4096, and 0\.15s/i,
          /runtime old\/new connection handover/i,
          /current generic-projection and non-cached-resolution facts/i,
        ],
        assertions: [
          /issue #1470 follow-up reference remains/i,
          /manifest-depth cap still applies to the complete rendered value, wrappers included/i,
          /present-tense byte-length-guard counterfactual remains/i,
          /measured depth bound retains the evidence word and the 512, 4096, and 0\.15s values/i,
          /runtime old\/new connection handover remains as a lifecycle fact/i,
          /narration is removed while the current projection and non-cached-resolution facts remain/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-speed-up-perf',
    scenarios: [
      {
        id: 'measurement-decisions',
        signature: [
          /project-owned median latency gate/i,
          /benchmark, gate and profiler/i,
          /raw before\/after samples/i,
        ],
        expectedOutput: [
          /real HTTP path/i,
          /benchmark samples separately.*project gate.*profiler/i,
          /raw samples.*negative control/i,
        ],
        assertions: [
          /production HTTP endpoint/i,
          /benchmark samples.*project gate decision.*profiler attribution/i,
          /repeated all-item scanning.*per-item profile work/i,
          /duplicate removal.*ordering.*unchanged gate value/i,
          /raw before\/after samples.*negative control.*ratio/i,
          /focused test passes/i,
        ],
      },
      {
        id: 'frontend-input-to-paint',
        signature: [/visible search field/i, /real browser input/i, /visible result update/i],
        expectedOutput: [/built application and real browser input/i, /repeated on each input/i, /browser boundary/i],
        assertions: [
          /built application and real browser input/i,
          /visible filtered result/i,
          /work repeated on each input/i,
          /matching products and ordering/i,
          /browser boundary.*raw sample/i,
        ],
      },
      {
        id: 'browser-measurement-unavailable',
        signature: [/input-to-paint latency/i, /final optimization decision today/i],
        expectedOutput: [/browser measurement is unavailable/i, /resumable browser run/i, /instead of claiming/i],
        assertions: [
          /missing browser measurement capability/i,
          /does not present source inspection as measured/i,
          /does not download or install/i,
          /completed diagnosis or measurement plan/i,
          /browser run and evidence.*resume/i,
        ],
      },
      {
        id: 'end-to-end-external-boundary',
        signature: [/checkout route/i, /without changing code/i, /external shipping-quote service/i],
        expectedOutput: [/complete checkout path/i, /controlled external delay/i, /complete product latency/i],
        assertions: [
          /no production code change/i,
          /complete checkout path.*local server work.*separately/i,
          /external shipping-quote delay.*dominant/i,
          /zero-delay run distinguishes/i,
          /remaining external-service and environment limits/i,
        ],
      },
      {
        id: 'private-corpus-remains-aggregate',
        signature: [/authorize inspection of the local performance corpus/i, /aggregate workload characteristics/i],
        expectedOutput: [/aggregate dimensions/i, /fixed synthetic inputs/i, /does not reproduce raw/i],
        assertions: [
          /authorized corpus only for aggregate/i,
          /does not reproduce raw prompts.*identities.*credentials/i,
          /fixed synthetic inputs.*reviewed constants/i,
          /does not download, install or assume/i,
          /no project change/i,
          /latency and payload dimensions.*without exposing/i,
        ],
      },
      {
        id: 'cold-start-process-memory',
        signature: [/fresh-process cold start/i, /transient allocation.*memory still reachable/i],
        expectedOutput: [/fresh child processes/i, /transient allocation.*retained batch state/i, /sampling method/i],
        assertions: [
          /fresh child processes/i,
          /module and setup costs/i,
          /transient batch allocation.*reachable retained state/i,
          /garbage-collection or sampling policy/i,
          /no production code change/i,
          /cold-start and process-memory evidence separate/i,
        ],
      },
      {
        id: 'stable-identity-subscription-order',
        signature: [
          /editing one row/i,
          /row identity/i,
          /update order.*immediate initial event/i,
          /equivalent unsubscribe/i,
        ],
        expectedOutput: [
          /whole-collection snapshot.*cloned rows/i,
          /selective delivery/i,
          /scoped subscription returns teardown/i,
          /negative control/i,
        ],
        assertions: [
          /no production code change/i,
          /whole-collection snapshots and cloned rows/i,
          /row identity.*unchanged rows/i,
          /update order.*immediate initial event/i,
          /scoped subscription returns teardown.*removes only its own listener/i,
          /negative control/i,
          /collection order.*subscriber behavior/i,
        ],
      },
      {
        id: 'authorized-deliberate-difference',
        signature: [
          /authorizes.*three decimal places to one/i,
          /behavior-only authorization/i,
          /preserve row order and (?:the )?source duration total/i,
        ],
        expectedOutput: [
          /one decimal place.*authorized visible difference/i,
          /preserves row order and totals/i,
          /without attributing a performance gain/i,
        ],
        assertions: [
          /one decimal place.*authorized visible difference/i,
          /preserves row order and totals/i,
          /owning check.*one-decimal output/i,
          /does not claim an unmeasured performance gain/i,
          /behavior-only scope.*remaining limits/i,
        ],
      },
    ],
  },
  {
    skill: 'dsh-spec-record-browser-gif',
    scenarios: [
      {
        id: 'real-ui-change-uses-one-isolated-run',
        signature: [/user-visible browser settings flow/i, /declared real build/i, /one isolated run/i],
        assertions: [
          /one isolated run/i,
          /real-versus-substituted services/i,
          /inspected after encoding/i,
          /No media/i,
        ],
      },
      {
        id: 'missing-capture-capability-hands-off',
        signature: [/no browser-control capability/i, /no ffmpeg or ffprobe/i, /Finish the evidence task now/i],
        assertions: [/missing browser and media capabilities/i, /resumable next step/i, /does not claim completion/i],
      },
      {
        id: 'no-pr-keeps-verified-evidence-local',
        signature: [/explicit publication-fixture task/i, /does not ask to create or update a pull request/i],
        expectedOutput: [/keeps the verified GIF local/i, /no review-platform edit or attachment/i],
        assertions: [
          /leaves the verified GIF in local evidence/i,
          /no review-platform edit or attachment/i,
          /without claiming it was published/i,
          /fixture origin and local-only publication boundary/i,
        ],
      },
      {
        id: 'moved-live-head-stops-attachment',
        signature: [/attach the pre-verified GIF to pull request 151/i, /moved-head/i],
        expectedOutput: [/live head.*differs from the demonstrated commit/i, /performs no attachment/i],
        assertions: [
          /reads the simulated pull request's live head before attachment/i,
          /differs from the demonstrated commit/i,
          /performs no review-platform edit or attachment/i,
          /preserves local evidence and requests a correct-head recording/i,
        ],
      },
      {
        id: 'partial-attach-failure-reports-exact-state',
        signature: [/two ordered GIF parts/i, /precise failure state/i, /Do not retry/i],
        expectedOutput: [/part 1 uploaded and part 2 failed/i, /does not claim complete publication/i],
        assertions: [
          /reads the live head before attachment/i,
          /submits both ordered parts in one attachment invocation/i,
          /part 1 uploaded and part 2 failed exactly/i,
          /preserves both local parts.*does not claim complete publication/i,
        ],
      },
      {
        id: 'unreferenced-upload-fails-closed',
        signature: [/perform the requested publication/i, /verify the live head and resulting body/i],
        expectedOutput: [/successfully but the re-read body leaves part 2/i, /publication as failed/i],
        assertions: [
          /re-reads the live head and body/i,
          /unresolved local reference after upload/i,
          /failure despite the successful attachment command/i,
          /uploaded but not represented by the body/i,
        ],
      },
      {
        id: 'oversized-evidence-splits-in-order',
        signature: [
          /generated full GIF above the 5 MiB limit/i,
          /independently verify both candidate parts/i,
          /one ordered invocation/i,
        ],
        expectedOutput: [
          /temporary over-limit GIF without retaining it/i,
          /consecutive non-overlapping parts.*at most 5 MiB/i,
        ],
        assertions: [
          /full GIF as above 5 MiB.*temporary storage.*does not attach or copy/i,
          /consecutive non-overlapping source intervals.*independent byte bound/i,
          /one ordered invocation without duplicates/i,
          /live head and resulting body.*preserve part order/i,
        ],
      },
      {
        id: 'explicit-fixture-recording-is-disclosed',
        signature: [/explicitly requests a fixture-only GIF/i, /real external provider is unavailable/i],
        assertions: [/fixture request authorizes/i, /fixture-based/i, /does not prove/i],
      },
    ],
  },
]

const ALL_REQUIRED = [...REQUIRED, FORGE_REQUIRED, ...GENERAL_REQUIRED]

const EVAL_SOURCE_ROOT = join(REPO_ROOT, 'tests', 'skill-evals')

function scenarioPath(skill: string): string {
  return join(EVAL_SOURCE_ROOT, skill, 'evals', 'evals.json')
}

function readCorpus(skill: string): ScenarioCorpus {
  return JSON.parse(readFileSync(scenarioPath(skill), 'utf8')) as ScenarioCorpus
}

function assertTriggerCorpusIdentity(skill: string): void {
  const corpusRoot = join(EVAL_SOURCE_ROOT, skill)
  const trigger = JSON.parse(readFileSync(join(corpusRoot, 'trigger-evals.json'), 'utf8')) as {
    skill_name?: string
    agent_file?: string
    queries?: unknown[]
  }
  assert.equal(trigger.skill_name, skill)
  assert.equal(trigger.agent_file, 'trigger-fixtures/AGENTS.md')
  assert.ok(Array.isArray(trigger.queries) && trigger.queries.length > 0, skill + ' trigger corpus is empty')
  assert.match(
    readFileSync(join(corpusRoot, trigger.agent_file), 'utf8'),
    new RegExp(`SELECT: ${skill}`),
    skill + ' trigger fixture names another skill',
  )
}

function assertCurrentTriggerEvidence(
  skill: string,
  evidenceRoot: string,
  requireCleanStderr = false,
  matrixMode: 'selected' | 'read-skill' = 'selected',
  knownMismatches = new Set<string>(),
  requireQueryBinding = false,
  requireTypedBinding = false,
  requireRunStatus = false,
): void {
  const corpusRoot = join(EVAL_SOURCE_ROOT, skill)
  const corpus = JSON.parse(readFileSync(join(corpusRoot, 'trigger-evals.json'), 'utf8')) as {
    agent_file: string
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assertTriggerCorpusIdentity(skill)
  const expected = {
    'dsh-spec-agent-experience': { positive: 5, negative: 4 },
    'dsh-spec-ci-test-reliability': { positive: 4, negative: 4 },
    'dsh-spec-code-review': { positive: 4, negative: 4 },
    'dsh-spec-error-handling': { positive: 7, negative: 6 },
    'dsh-spec-skill-forge': { positive: 7, negative: 7 },
    'dsh-spec-prose-standard': { positive: 8, negative: 4 },
    'dsh-spec-pr-description': { positive: 2, negative: 4 },
    'dsh-spec-merging-stacked-prs': { positive: 4, negative: 5 },
    'dsh-spec-record-browser-gif': { positive: 3, negative: 5 },
    'dsh-spec-speed-up-perf': { positive: 6, negative: 7 },
    'dsh-spec-translate-docs': { positive: 5, negative: 4 },
  }[skill]
  assert.ok(expected, skill + ' has no expected trigger distribution')
  assert.equal(
    corpus.queries.filter((query) => query.should_trigger).length,
    expected.positive,
    skill + ' positive triggers',
  )
  assert.equal(
    corpus.queries.filter((query) => !query.should_trigger).length,
    expected.negative,
    skill + ' near misses',
  )
  const actualInputs = readHashManifest(join(evidenceRoot, 'trigger-input.sha256'), skill + ' trigger inputs')
  const expectedInputs = new Map([
    [
      `tests/skill-evals/${skill}/trigger-evals.json`,
      createHash('sha256')
        .update(readFileSync(join(REPO_ROOT, `tests/skill-evals/${skill}/trigger-evals.json`)))
        .digest('hex'),
    ],
    [
      `tests/skill-evals/${skill}/${corpus.agent_file}`,
      createHash('sha256')
        .update(readFileSync(join(REPO_ROOT, `tests/skill-evals/${skill}/${corpus.agent_file}`)))
        .digest('hex'),
    ],
    [triggerSurfacePath(skill), triggerSurfaceHash(skill)],
  ])
  assert.deepEqual(
    [...actualInputs].sort(([left], [right]) => left.localeCompare(right)),
    [...expectedInputs].sort(([left], [right]) => left.localeCompare(right)),
    skill + ' current trigger inputs differ',
  )

  const matrixLines = readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8').trim().split('\n')
  assert.equal(
    matrixLines[0],
    matrixMode === 'selected' ? 'id\tshould_trigger\tselected\tresult' : 'id\tshould_trigger\tread_skill\tresult',
  )
  const matrix = new Map(
    matrixLines.slice(1).map((line) => {
      const [id, shouldTrigger, observed, result] = line.split('\t')
      assert.ok(id && shouldTrigger && observed && result, skill + ' trigger matrix row is malformed')
      return [id, { shouldTrigger, observed, result }] as const
    }),
  )
  assert.equal(matrix.size, corpus.queries.length, skill + ' trigger matrix size differs')

  for (const query of corpus.queries) {
    const row = matrix.get(query.id)
    assert.ok(row, skill + ' trigger matrix is missing ' + query.id)
    const runRoot = join(evidenceRoot, 'trigger', query.id)
    if (requireQueryBinding) {
      assertTriggerQueryBinding(runRoot, skill, query, readTriggerCorpus(skill), requireTypedBinding)
    }
    if (requireRunStatus) {
      const runStatus = readFileSync(join(runRoot, 'status.txt'), 'utf8')
      assert.match(runStatus, /^status: pass$/m, skill + '/' + query.id + ' trigger status')
      assert.match(runStatus, /^run_exit_code: 0$/m, skill + '/' + query.id + ' trigger exit')
      assert.match(runStatus, /^assertions: 1\/1$/m, skill + '/' + query.id + ' trigger count')
    }
    const final = readFileSync(join(runRoot, 'final.md'), 'utf8')
    const marker = final.trim().split('\n').at(-1)
    assert.ok(
      marker === `SELECT: ${skill}` || marker === 'SELECT: none',
      skill + '/' + query.id + ' is missing a stable selection marker',
    )
    const selected = marker === `SELECT: ${skill}`
    const traceText = readFileSync(join(runRoot, 'trace.jsonl'), 'utf8')
    const traceEntries = traceText
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            type?: string
            path?: string
            sha256?: string
            command?: string
            exit_code?: number | null
          },
      )
    const readSkill = traceEntries.some(
      (entry) => entry.type === 'command' && entry.exit_code === 0 && commandPrintsSkill(entry.command, skill),
    )
    assert.equal(row.shouldTrigger, String(query.should_trigger))
    assert.equal(row.observed, String(matrixMode === 'selected' ? selected : readSkill), skill + '/' + query.id)
    assert.equal(row.result, 'pass')
    assert.equal(selected, query.should_trigger, skill + '/' + query.id + ' selected the wrong skill')
    if (matrixMode === 'read-skill') {
      const skillEvents = traceEntries.filter((entry) => entry.type === 'skill')
      assert.equal(skillEvents.length, 1, skill + '/' + query.id + ' skill provenance')
      assert.equal(skillEvents[0]?.path, `.agents/skills/${skill}/SKILL.md`, skill + '/' + query.id + ' skill path')
      assert.equal(
        skillEvents[0]?.sha256,
        fileHash(join(REPO_ROOT, 'skills', skill, 'SKILL.md')),
        skill + '/' + query.id + ' skill revision',
      )
      assert.equal(readSkill, query.should_trigger, skill + '/' + query.id + ' read the wrong skill')
    }
    assert.doesNotMatch(traceText, /evals[/\\]evals\.json|tests[/\\]skill-evals|expected_output/)
    const trace = readEvidenceTrace(join(runRoot, 'trace.jsonl'))
    assert.equal(trace.filter((entry) => entry.type === 'turn.completed').length, 1)
    assert.equal(trace.at(-1)?.type, 'turn.completed')
    assert.equal(
      finalEvidenceMessage(trace)?.trim(),
      final.trim(),
      skill + '/' + query.id + ' final differs from trace',
    )
    const stderr = readFileSync(join(runRoot, 'stderr.log'), 'utf8')
    assert.ok(stderr.trim().length > 0)
    if (requireCleanStderr) {
      assert.doesNotMatch(stderr, /rmcp::transport::worker|AuthRequired|Transport channel closed/i)
    }
  }
}

function assertTriggerQueryBinding(
  root: string,
  skill: string,
  query: { id: string; query: string; should_trigger: boolean },
  corpus: TriggerCorpus,
  requireTyped = false,
): void {
  const bindingPath = join(root, 'trigger-query.json')
  assertEvidencePath(root, bindingPath, skill + '/' + query.id + ' trigger query', 'file')
  assertRegularEvidenceFile(bindingPath, skill + '/' + query.id + ' trigger query')
  const binding = JSON.parse(readFileSync(bindingPath, 'utf8')) as {
    id?: string
    query?: string
    query_sha256?: string
    should_trigger?: boolean
    agent_file?: string
    currentness?: {
      trigger_surface_sha256?: string
      trigger_corpus_sha256?: string
    }
  }
  assert.deepEqual(
    Object.keys(binding).sort(),
    requireTyped
      ? ['agent_file', 'currentness', 'id', 'query', 'query_sha256', 'should_trigger']
      : ['id', 'query', 'query_sha256'],
  )
  assert.equal(binding.id, query.id, skill + '/' + query.id + ' trigger query id')
  assert.equal(binding.query, query.query, skill + '/' + query.id + ' trigger query text')
  if (requireTyped) {
    assert.equal(binding.should_trigger, query.should_trigger, skill + '/' + query.id + ' trigger decision')
    assert.equal(binding.agent_file, corpus.agent_file, skill + '/' + query.id + ' trigger agent file')
    assert.deepEqual(
      binding.currentness,
      {
        trigger_surface_sha256: triggerSurfaceHash(skill),
        trigger_corpus_sha256: currentTriggerCorpusSha256(skill, corpus),
      },
      skill + '/' + query.id + ' trigger currentness',
    )
  }
  const querySha256 = createHash('sha256').update(query.query).digest('hex')
  assert.equal(binding.query_sha256, querySha256, skill + '/' + query.id + ' trigger query hash')

  const events = readEvidenceTrace(join(root, 'trace.jsonl')).filter((event) => event.type === 'query') as Array<{
    id?: string
    query_sha256?: string
  }>
  assert.equal(events.length, 1, skill + '/' + query.id + ' query provenance event')
  assert.equal(events[0]?.id, query.id, skill + '/' + query.id + ' trace query id')
  assert.equal(events[0]?.query_sha256, querySha256, skill + '/' + query.id + ' trace query hash')
}

function assertBehaviorScenarioTraceBinding(root: string, skill: string, scenario: Scenario): void {
  const scenarioSha256 = scenarioDefinitionHash(scenario)
  const definitionHashPath = join(root, 'scenario-definition.sha256')
  assertEvidencePath(root, definitionHashPath, skill + '/' + scenario.id + ' scenario hash', 'file')
  assert.equal(
    readFileSync(definitionHashPath, 'utf8').trim(),
    `${scenarioSha256}  ${skill}:${scenario.id}`,
    skill + '/' + scenario.id + ' scenario hash differs',
  )
  const events = readEvidenceTrace(join(root, 'trace.jsonl')).filter((event) => event.type === 'scenario') as Array<{
    subject?: string
    path?: string
    sha256?: string
  }>
  assert.equal(events.length, 1, skill + '/' + scenario.id + ' scenario provenance event')
  assert.equal(events[0]?.subject, `${skill}:${scenario.id}`, skill + '/' + scenario.id + ' trace subject')
  assert.equal(events[0]?.path, 'scenario-definition.json', skill + '/' + scenario.id + ' trace path')
  assert.equal(events[0]?.sha256, scenarioSha256, skill + '/' + scenario.id + ' trace scenario hash')
  const traceText = evidencePolicy.readRetainedTrace(root)
  assert.equal(
    readFileSync(join(root, 'final.md'), 'utf8'),
    evidencePolicy.finalAgentMessageFromTrace(traceText),
    skill + '/' + scenario.id + ' final differs from the trace',
  )
}

function assertBehaviorRunSkillHashes(root: string, skill: string, behaviorFiles: ReadonlyMap<string, string>): void {
  const actual = readSkillHashes(root)
  for (const [path, hash] of behaviorFiles) {
    assert.equal(actual.get(path), hash, skill + ' behavior run skill hash differs: ' + path)
  }
}

function assertCurrentBehaviorEvidence(root: string, skill: string, scenario: Scenario): void {
  const metadata = evidencePolicy.readEvidenceMetadata(root)
  assert.equal(metadata.claim.type, 'behavior', root + ' claim type')
  assert.equal(metadata.claim.subject, `${skill}:${scenario.id}`, root + ' claim subject')
  assert.equal(metadata.arm, 'target-present', root + ' arm')
  assert.equal(metadata.comparison, null, root + ' comparison')
  const recordedScenario = validateRecordedScenario(
    skill,
    JSON.parse(readFileSync(join(root, 'scenario-definition.json'), 'utf8')),
    root + ' scenario',
  )
  assert.deepEqual(recordedScenario, scenario, root + ' does not record the current scenario')
  assert.equal(metadata.evidence.currentness.scenario_sha256, scenarioDefinitionHash(scenario), root + ' scenario hash')
  const observation = evidencePolicy.inspectRetainedRun(root, metadata)
  assert.deepEqual(observation.scenario, scenario, root + ' retained scenario differs')
  assert.equal(observation.currentness.scenario_sha256, scenarioDefinitionHash(scenario), root + ' observed hash')
}

interface TriggerCorpus {
  skill_name: string
  agent_file: string
  queries: Array<{
    id: string
    query: string
    should_trigger: boolean
    files?: string[]
  }>
}

function readTriggerCorpus(skill: string): TriggerCorpus {
  return JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as TriggerCorpus
}

function currentTriggerCorpusSha256(skill: string, corpus: TriggerCorpus): string {
  const resources = new Map<string, Buffer>()
  for (const query of corpus.queries) {
    for (const file of query.files ?? []) {
      if (!resources.has(file)) resources.set(file, readFileSync(join(EVAL_SOURCE_ROOT, skill, file)))
    }
  }
  return evidencePolicy.triggerCorpusSha256({
    corpus: readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json')),
    agentFile: corpus.agent_file,
    agent: readFileSync(join(EVAL_SOURCE_ROOT, skill, corpus.agent_file)),
    files: [...resources].map(([path, bytes]) => ({
      path,
      bytes,
      mode: lstatSync(join(EVAL_SOURCE_ROOT, skill, path)).mode & 0o111 ? '0755' : '0644',
    })),
  })
}

function assertCurrentTypedTriggerEvidence(skill: string): void {
  const corpus = readTriggerCorpus(skill)
  assert.equal(corpus.skill_name, skill)
  assert.equal(corpus.agent_file, 'trigger-fixtures/AGENTS.md')
  const positive = corpus.queries.filter((query) => query.should_trigger).length
  const negative = corpus.queries.filter((query) => !query.should_trigger).length
  assert.deepEqual({ positive, negative }, { positive: 4, negative: 4 })
  const surface = evidencePolicy.triggerSurfaceSha256(
    readFileSync(join(REPO_ROOT, 'skills', skill, 'SKILL.md'), 'utf8'),
  )
  const corpusSha256 = currentTriggerCorpusSha256(skill, corpus)
  const triggerRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue-144', skill, 'trigger')
  const currentInputs = readHashManifest(join(triggerRoot, 'trigger-input.sha256'), skill + ' trigger inputs')
  assert.deepEqual(
    [...currentInputs].sort(([left], [right]) => left.localeCompare(right)),
    [
      [`skills/${skill}/SKILL.md#name-description`, surface],
      [
        `tests/skill-evals/${skill}/trigger-evals.json`,
        createHash('sha256')
          .update(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json')))
          .digest('hex'),
      ],
      [
        `tests/skill-evals/${skill}/${corpus.agent_file}`,
        createHash('sha256')
          .update(readFileSync(join(EVAL_SOURCE_ROOT, skill, corpus.agent_file)))
          .digest('hex'),
      ],
    ].sort(([left], [right]) => left.localeCompare(right)),
  )
  const matrix = readFileSync(join(triggerRoot, 'trigger-matrix.tsv'), 'utf8').trim().split('\n')
  assert.equal(matrix[0], 'id\tshould_trigger\tselected\tresult')
  assert.equal(matrix.length, corpus.queries.length + 1)
  const matrixRows = new Map(
    matrix.slice(1).map((line) => {
      const [id, shouldTrigger, selected, result] = line.split('\t')
      assert.ok(id && shouldTrigger && selected && result, 'current trigger matrix row is malformed')
      return [id, { shouldTrigger, selected, result }] as const
    }),
  )
  let execution: string | undefined
  let deadline: number | undefined
  for (const expected of corpus.queries) {
    const root = join(triggerRoot, expected.id)
    const canaries = evidencePolicy.privacyCanariesFor(skill, 'trigger', { includeCurrentHome: true })
    const { metadata } = evidencePolicy.readEvidenceMetadataRecord(root, canaries)
    const inspected = evidencePolicy.inspectRetainedTriggerRun(root, metadata, canaries)
    assert.deepEqual(metadata.claim, { type: 'trigger', subject: `${skill}:trigger` })
    assert.deepEqual(metadata.evidence.currentness, {
      trigger_surface_sha256: surface,
      trigger_corpus_sha256: corpusSha256,
    })
    assert.deepEqual(inspected.query, {
      id: expected.id,
      query: expected.query,
      should_trigger: expected.should_trigger,
      agent_file: corpus.agent_file,
      currentness: {
        trigger_surface_sha256: surface,
        trigger_corpus_sha256: corpusSha256,
      },
    })
    assert.match(readFileSync(join(root, 'status.txt'), 'utf8'), /^status: pass$/m)
    assert.match(readFileSync(join(root, 'status.txt'), 'utf8'), /^assertions: 1\/1$/m)
    const row = matrixRows.get(expected.id)
    assert.ok(row, 'current trigger matrix omits ' + expected.id)
    assert.equal(row.shouldTrigger, String(expected.should_trigger))
    assert.equal(row.selected, String(expected.should_trigger))
    assert.equal(row.result, 'pass')
    const serializedExecution = JSON.stringify(metadata.execution)
    if (execution === undefined) execution = serializedExecution
    else assert.equal(serializedExecution, execution, 'trigger execution identity changed between runs')
    if (deadline === undefined) deadline = metadata.deadline_ms
    else assert.equal(metadata.deadline_ms, deadline, 'trigger deadline changed between runs')
  }
  assert.equal(deadline, 1_800_000)
}

function assertCurrentTypedBehaviorEvidence(skill: string, scenarioId: string): void {
  const scenario = readCorpus(skill).evals.find((entry) => entry.id === scenarioId)
  assert.ok(scenario)
  const root = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue-144', skill, scenarioId)
  const canaries = evidencePolicy.privacyCanariesFor(skill, scenarioId, { includeCurrentHome: true })
  const { metadata } = evidencePolicy.readEvidenceMetadataRecord(root, canaries)
  const inspected = evidencePolicy.inspectRetainedRun(root, metadata)
  assert.deepEqual(metadata.claim, { type: 'behavior', subject: `${skill}:${scenarioId}` })
  assert.equal(metadata.arm, 'target-present')
  assert.deepEqual(inspected.scenario, scenario)
  assert.equal(metadata.evidence.currentness.scenario_sha256, evidencePolicy.scenarioDefinitionHash(scenario))
  const prompt = evidencePolicy.modelPromptComponents(skill, scenario, 'target-present')
  assert.equal(metadata.evidence.currentness.scenario_prompt_sha256, evidencePolicy.sha256(scenario.prompt))
  assert.equal(metadata.evidence.currentness.arm_instruction_sha256, evidencePolicy.sha256(prompt.armInstruction))
  assert.equal(metadata.evidence.currentness.prompt_guard_sha256, evidencePolicy.sha256(prompt.promptGuard))
  assert.equal(metadata.evidence.currentness.rendered_prompt_sha256, evidencePolicy.sha256(prompt.renderedPrompt))
  const inputManifest = readFileSync(join(root, 'input-manifest.sha256'), 'utf8').trim().split('\n')
  assert.deepEqual(
    inputManifest.map((line) => parseHashPath(line, scenarioId).path),
    scenario.files,
  )
  for (const line of inputManifest) {
    const input = parseHashPath(line, scenarioId)
    const absolute = join(EVAL_SOURCE_ROOT, skill, input.path)
    assert.equal(createHash('sha256').update(readFileSync(absolute)).digest('hex'), input.hash)
    assert.equal(lstatSync(absolute).mode & 0o111 ? '0755' : '0644', input.mode)
  }
  assert.match(readFileSync(join(root, 'status.txt'), 'utf8'), /^status: pass$/m)
  assert.match(readFileSync(join(root, 'status.txt'), 'utf8'), /^assertions: 5\/5$/m)
  assert.equal(
    readFileSync(join(root, 'assertions.txt'), 'utf8').trim(),
    scenario.assertions.map((assertion) => `PASS ${assertion}`).join('\n'),
  )
  assert.ok(traceCommandsFor(root).some((command) => commandPrintsSkill(command, skill)))
  assert.equal(metadata.deadline_ms, 1_800_000)
}

function stageSkillWithEvals(skill: string): StagedSkill {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'skill-evals-'))
  const skillRoot = join(temporaryRoot, skill)
  cpSync(join(REPO_ROOT, 'skills', skill), skillRoot, { recursive: true })
  cpSync(join(EVAL_SOURCE_ROOT, skill, 'evals'), join(skillRoot, 'evals'), { recursive: true })
  for (const scenario of readCorpus(skill).evals) {
    for (const sibling of scenario.install ?? []) {
      const siblingSource = join(REPO_ROOT, 'skills', sibling)
      if (!existsSync(join(siblingSource, 'SKILL.md'))) {
        throw new Error(`${scenario.id} installs missing sibling ${sibling}`)
      }
      cpSync(siblingSource, join(skillRoot, '.agents', 'skills', sibling), { recursive: true })
    }
  }
  return { temporaryRoot, skillRoot }
}

function assertInputFile(skillRoot: string, file: string, label: string): string {
  assert.ok(file.startsWith('evals/files/'), label + ' names an input outside evals/files/')
  const absolute = join(skillRoot, file)
  assert.ok(existsSync(absolute), label + ' input does not exist: ' + file)
  const resolved = realpathSync(absolute)
  const inputRoot = realpathSync(join(skillRoot, 'evals', 'files')) + sep
  assert.ok(resolved.startsWith(inputRoot), label + ' input escapes evals/files: ' + file)
  const stat = lstatSync(absolute)
  assert.equal(stat.isSymbolicLink(), false, label + ' input is a symbolic link: ' + file)
  assert.ok(stat.isFile(), label + ' input is not a regular file: ' + file)
  assert.ok(stat.size > 0, label + ' input is empty: ' + file)
  return absolute
}

function scenarioProjectPath(scenario: Scenario, file: string, label = 'scenario input'): string {
  if (scenario.project_root === undefined) return file
  const prefix = `${scenario.project_root}/`
  assert.ok(file.startsWith(prefix), label + ' is outside the scenario project root')
  return file.slice(prefix.length)
}

function validateScenarioProjectRoot(scenario: Scenario, label: string): void {
  if (scenario.project_root === undefined) return
  assertNonEmptyString(scenario.project_root, label + ' project root')
  assertContainedRelativePath(scenario.project_root, label + ' project root')
  assert.ok(scenario.project_root.startsWith('evals/files/'), label + ' project root must be inside evals/files')
  assert.equal(scenario.change_patch, undefined, label + ' cannot combine project_root with change_patch')
  for (const file of scenario.files ?? []) scenarioProjectPath(scenario, file, label + ' input')
}

function validateCorpus(corpus: ScenarioCorpus, required: RequiredProfile): void {
  assert.equal(corpus.skill_name, required.skill)
  assert.ok(corpus.evals.length > 0, 'an empty eval corpus is not a passing corpus')
  const byId = new Map(corpus.evals.map((scenario) => [scenario.id, scenario]))
  assert.equal(byId.size, corpus.evals.length, 'eval ids must be unique')
  for (const id of required.ids) assert.ok(byId.has(id), required.skill + ' must include ' + id)

  for (const id of required.noIsolationIds) {
    const scenario = byId.get(id)
    assert.ok(scenario)
    assert.match(scenario.prompt, /no subagents?|no isolated contexts?|no parallel execution/i)
    assertNonEmptyStrings(scenario.assertions, id + ' assertions')
  }
  for (const id of required.isolatedIds) {
    const scenario = byId.get(id)
    assert.ok(scenario)
    assert.match(scenario.prompt, /isolated subagents?|isolated contexts?/i)
    assert.equal(scenario.allow_subagents, true, id + ' must allow subagents')
    assertNonEmptyStrings(scenario.assertions, id + ' assertions')
  }
  for (const id of required.handoffIds) {
    const scenario = byId.get(id)
    assert.ok(scenario)
    assert.match(
      scenario.prompt,
      /no clean-context|no staged independent|no .*(?:verification|working-separation) mechanism/i,
      id + ' must exclude the documented fallback mechanisms',
    )
    assert.match(scenario.expected_output, /hands? off|handoff|stops? before claiming completion/i)
    assert.ok(
      scenario.assertions.some((assertion) => /hand off|handoff|pending work|next step/i.test(assertion)),
      id + ' must define resumable handoff evidence',
    )
  }

  for (const scenario of corpus.evals) {
    assertNonEmptyString(scenario.id, 'eval id')
    assertNonEmptyString(scenario.prompt, scenario.id + ' prompt')
    assertNonEmptyString(scenario.expected_output, scenario.id + ' expected output')
    assertNonEmptyStrings(scenario.assertions, scenario.id + ' assertions')
    assert.ok((scenario.files?.length ?? 0) > 0, scenario.id + ' must ship its input files')
    assertNonEmptyStrings(scenario.files, scenario.id + ' files')
    evidencePolicy.validateScenarioClaim(required.skill, scenario)
    if (scenario.change_patch !== undefined) {
      assertNonEmptyString(scenario.change_patch, scenario.id + ' change patch')
      assert.ok(scenario.files?.includes(scenario.change_patch), scenario.id + ' change patch is not a declared input')
      assertNonEmptyString(scenario.change_root, scenario.id + ' change root')
      assertContainedRelativePath(scenario.change_root, scenario.id + ' change root')
    }
    validateScenarioProjectRoot(scenario, scenario.id)
    for (const output of scenario.outputs ?? []) {
      assertNonEmptyString(output, scenario.id + ' output')
      assertContainedRelativePath(output, scenario.id + ' output')
    }
    for (const sibling of scenario.install ?? []) {
      assert.match(sibling, /^dsh-spec-[a-z0-9-]+$/, scenario.id + ' has an invalid sibling')
      assert.notEqual(sibling, required.skill, scenario.id + ' names its target as a sibling')
      assert.ok(
        existsSync(join(REPO_ROOT, 'skills', sibling, 'SKILL.md')),
        scenario.id + ' installs a missing sibling: ' + sibling,
      )
    }
    const skillRoot = join(EVAL_SOURCE_ROOT, required.skill)
    for (const file of scenario.files ?? []) {
      assertInputFile(skillRoot, file, scenario.id)
    }
  }
}

function validateGeneralCorpus(corpus: ScenarioCorpus, required: GeneralProfile): void {
  assert.equal(corpus.skill_name, required.skill)
  assert.ok(corpus.evals.length > 0, 'an empty eval corpus is not a passing corpus')
  const byId = new Map(corpus.evals.map((scenario) => [scenario.id, scenario]))
  assert.equal(byId.size, corpus.evals.length, 'eval ids must be unique')
  for (const requirement of required.scenarios) {
    assert.ok(byId.has(requirement.id), required.skill + ' must include ' + requirement.id)
  }

  for (const scenario of corpus.evals) {
    assertNonEmptyString(scenario.id, 'eval id')
    assertNonEmptyString(scenario.prompt, scenario.id + ' prompt')
    assertNonEmptyString(scenario.expected_output, scenario.id + ' expected output')
    assertNonEmptyStrings(scenario.assertions, scenario.id + ' assertions')
    evidencePolicy.validateScenarioClaim(required.skill, scenario)
    assert.ok((scenario.files?.length ?? 0) > 0, scenario.id + ' must ship its input files')
    if (scenario.change_patch !== undefined) {
      assertNonEmptyString(scenario.change_patch, scenario.id + ' change patch')
      assert.ok(scenario.files?.includes(scenario.change_patch), scenario.id + ' change patch is not a declared input')
      assertNonEmptyString(scenario.change_root, scenario.id + ' change root')
      assertContainedRelativePath(scenario.change_root, scenario.id + ' change root')
    }
    validateScenarioProjectRoot(scenario, scenario.id)
    for (const output of scenario.outputs ?? []) {
      assertNonEmptyString(output, scenario.id + ' output')
      assertContainedRelativePath(output, scenario.id + ' output')
    }
    for (const sibling of scenario.install ?? []) {
      assert.match(sibling, /^dsh-spec-[a-z0-9-]+$/, scenario.id + ' has an invalid sibling')
      assert.notEqual(sibling, required.skill, scenario.id + ' names its target as a sibling')
      assert.ok(
        existsSync(join(REPO_ROOT, 'skills', sibling, 'SKILL.md')),
        scenario.id + ' installs a missing sibling: ' + sibling,
      )
    }
    assertNonEmptyStrings(scenario.files, scenario.id + ' files')
    const skillRoot = join(EVAL_SOURCE_ROOT, required.skill)
    for (const file of scenario.files ?? []) {
      assertInputFile(skillRoot, file, scenario.id)
    }
  }

  for (const requirement of required.scenarios) {
    const scenario = byId.get(requirement.id)
    assert.ok(scenario)
    if (requirement.install !== undefined) {
      assert.deepEqual(
        scenario.install ?? [],
        requirement.install,
        requirement.id + ' must preserve the declared sibling installation',
      )
    }
    const text = JSON.stringify(scenario)
    for (const pattern of requirement.signature) {
      assert.match(text, pattern, requirement.id + ' must preserve the scenario semantics ' + pattern)
    }
    for (const pattern of requirement.expectedOutput ?? []) {
      assert.match(scenario.expected_output, pattern, requirement.id + ' must preserve the expected output ' + pattern)
    }
    if (requirement.expectedOutput === undefined) {
      const assertions = scenario.assertions.join('\n')
      for (const pattern of requirement.assertions) {
        assert.match(assertions, pattern, requirement.id + ' must preserve the assertion ' + pattern)
      }
    } else {
      assert.equal(
        scenario.assertions.length,
        requirement.assertions.length,
        requirement.id + ' must preserve every assertion',
      )
      for (const [index, pattern] of requirement.assertions.entries()) {
        assert.match(
          scenario.assertions[index] as string,
          pattern,
          requirement.id + ' must preserve assertion ' + index + ' ' + pattern,
        )
      }
    }
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  assert.ok(typeof value === 'string', label + ' must be a string')
  assert.ok(value.trim().length > 0, label + ' must not be blank')
}

function assertContainedRelativePath(path: string, label: string): void {
  const local = relative('/workspace', resolve('/workspace', path))
  assert.ok(
    !isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`),
    `${label} escapes its project: ${path}`,
  )
}

function assertNonEmptyStrings(values: readonly unknown[] | undefined, label: string): asserts values is string[] {
  assert.ok(Array.isArray(values), label + ' must be an array')
  assert.ok(values.length > 0, label + ' must not be empty')
  for (const value of values) assertNonEmptyString(value, label)
}

function commandReadsSkill(command: string | undefined, skillName = 'dsh-spec-error-handling'): boolean {
  return commandPrintsSkill(command, skillName)
}

function commandPrintsFile(command: string | undefined, relativePath: string): boolean {
  if (command === undefined) return false
  const escaped = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[\\s;&|'"])(?:cat|sed|head|tail)\\s+[^\\n]*${escaped}(?:[\\s'"]|$)`).test(command)
}

function commandPrintsSkill(command: string | undefined, skillName: string): boolean {
  return commandPrintsFile(command, `.agents/skills/${skillName}/SKILL.md`)
}

interface EvidenceTraceItem {
  type?: string
  command?: string
  exit_code?: number
  aggregated_output?: string
  text?: string
}

interface EvidenceTraceEntry {
  type: string
  id?: string
  path?: string
  sha256?: string
  subject?: string
  query_sha256?: string
  item?: EvidenceTraceItem
}

function hashTriggerSurface(body: string, label: string): string {
  const name = /^name:\s*(.+)$/m.exec(body)?.[1]
  const description = /^description:\s*"(.*)"$/m.exec(body)?.[1]
  assert.ok(name, label + ' has no name')
  assert.ok(description, label + ' has no description')
  return createHash('sha256').update(JSON.stringify({ name, description })).digest('hex')
}

function triggerSurfaceHash(skillName: string): string {
  return hashTriggerSurface(readFileSync(join(REPO_ROOT, 'skills', skillName, 'SKILL.md'), 'utf8'), skillName)
}

function triggerSurfacePath(skillName: string): string {
  return `skills/${skillName}/SKILL.md#name-description`
}

function runEvidenceGitText(args: string[], inherited?: NodeJS.ProcessEnv) {
  return spawnSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: safety.isolatedGitEnvironment({}, inherited),
    maxBuffer: 4 * 1024 * 1024,
  })
}

function listFiles(root: string, prefix = ''): string[] {
  const files: string[] = []
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? join(prefix, entry.name) : entry.name
    if (entry.isDirectory()) files.push(...listFiles(root, relative))
    else if (entry.isFile()) files.push(relative.split(sep).join('/'))
    else if (entry.isSymbolicLink()) throw new Error(`unexpected symbolic link: ${join(root, relative)}`)
    else throw new Error(`unsupported filesystem entry: ${join(root, relative)}`)
  }
  return files.sort()
}

function fileMode(path: string): string {
  return lstatSync(path).mode & 0o111 ? '0755' : '0644'
}

function assertRegularEvidenceFile(path: string, label: string): void {
  const stat = lstatSync(path, { throwIfNoEntry: false })
  assert.ok(stat, label + ' is missing')
  assert.equal(stat.isSymbolicLink(), false, label + ' is a symbolic link')
  assert.equal(stat.isFile(), true, label + ' is not a regular file')
}

function assertEvidenceArtifactManifest(root: string, label: string): void {
  const manifestPath = join(root, 'artifacts.sha256')
  assertEvidencePath(root, manifestPath, label + ' artifact manifest', 'file')
  assertRegularEvidenceFile(manifestPath, label + ' artifact manifest')
  const listed = readOrderedHashManifest(manifestPath).map(({ hash, path }) => {
    assert.match(path, /^artifact\//, label + ' artifact path')
    const artifactPath = join(root, path)
    assertEvidencePath(root, artifactPath, label + ' artifact', 'file')
    assertRegularEvidenceFile(artifactPath, label + ' artifact')
    assert.equal(fileHash(artifactPath), hash, label + ' artifact differs: ' + path)
    return path
  })
  const artifactRoot = join(root, 'artifact')
  let actual: string[] = []
  if (existsSync(artifactRoot)) {
    assertEvidencePath(root, artifactRoot, label + ' artifact root', 'directory')
    actual = listFiles(artifactRoot).map((path) => `artifact/${path}`)
  }
  assert.deepEqual(listed.sort(), actual.sort(), label + ' artifact directory differs from its manifest')
}

function assertEvidencePath(root: string, path: string, label: string, kind: 'file' | 'directory'): void {
  const rootReal = realpathSync(root)
  const local = relative(rootReal, path)
  assert.equal(isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`), false, label + ' escapes ' + root)
  let current = rootReal
  for (const component of local.split(sep).filter(Boolean)) {
    current = join(current, component)
    const stat = lstatSync(current, { throwIfNoEntry: false })
    assert.ok(stat, `${label} is missing: ${path}`)
    assert.equal(stat.isSymbolicLink(), false, `${label} contains a symbolic link: ${path}`)
  }
  const target = realpathSync(path)
  const targetLocal = relative(rootReal, target)
  assert.equal(
    isAbsolute(targetLocal) || targetLocal === '..' || targetLocal.startsWith(`..${sep}`),
    false,
    label + ' resolves outside ' + root,
  )
  const stat = lstatSync(path)
  assert.equal(kind === 'file' ? stat.isFile() : stat.isDirectory(), true, `${label} is not a ${kind}: ${path}`)
}

function validateRecordedScenario(skill: string, value: unknown, label: string): Scenario {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), label + ' must be an object')
  const scenario = value as Scenario
  const known = new Set([
    'id',
    'prompt',
    'expected_output',
    'assertions',
    'files',
    'change_patch',
    'change_root',
    'project_root',
    'install',
    'outputs',
    'capabilities',
    'allow_subagents',
    'comparison',
  ])
  for (const key of Object.keys(scenario)) assert.ok(known.has(key), label + ' has unknown field ' + key)
  assertNonEmptyString(scenario.id, label + ' id')
  assertNonEmptyString(scenario.prompt, label + ' prompt')
  assertNonEmptyString(scenario.expected_output, label + ' expected output')
  assertNonEmptyStrings(scenario.assertions, label + ' assertions')
  assertNonEmptyStrings(scenario.files, label + ' files')
  for (const sibling of scenario.install ?? []) {
    assert.match(sibling, /^dsh-spec-[a-z0-9-]+$/, label + ' has an invalid sibling')
    assert.notEqual(sibling, skill, label + ' names its target as a sibling')
    assert.ok(existsSync(join(REPO_ROOT, 'skills', sibling, 'SKILL.md')), label + ' installs a missing sibling')
  }
  const skillRoot = join(EVAL_SOURCE_ROOT, skill)
  for (const file of scenario.files ?? []) assertInputFile(skillRoot, file, label)
  for (const output of scenario.outputs ?? []) assertContainedRelativePath(output, label + ' output')
  if (scenario.change_patch !== undefined) {
    assertNonEmptyString(scenario.change_patch, label + ' change patch')
    assert.ok(scenario.files?.includes(scenario.change_patch), label + ' change patch is not an input')
    assertNonEmptyString(scenario.change_root, label + ' change root')
    assertContainedRelativePath(scenario.change_root, label + ' change root')
  }
  validateScenarioProjectRoot(scenario, label)
  if (scenario.capabilities !== undefined) {
    assert.ok(
      scenario.capabilities && typeof scenario.capabilities === 'object' && !Array.isArray(scenario.capabilities),
      label + ' capabilities must be an object',
    )
    for (const [name, enabled] of Object.entries(scenario.capabilities)) {
      assert.ok(name === 'browser' || name === 'media', label + ' has unknown capability ' + name)
      assert.equal(typeof enabled, 'boolean', label + ' capability must be boolean')
    }
  }
  if (scenario.allow_subagents !== undefined) {
    assert.equal(typeof scenario.allow_subagents, 'boolean', label + ' allow_subagents must be boolean')
  }
  evidencePolicy.validateScenarioClaim(skill, scenario)
  return scenario
}

test('hash manifests retain paths containing consecutive spaces', () => {
  const hash = 'a'.repeat(64)
  assert.deepEqual(parseHashPath(`${hash}  artifact/name  with  spaces.md`, 'artifact'), {
    hash,
    path: 'artifact/name  with  spaces.md',
    mode: undefined,
  })
})

test('recorded scenarios reject escaping files and sibling names before replay', () => {
  const base = {
    id: 'escaping-input',
    prompt: 'Review the fixture.',
    expected_output: 'A review.',
    assertions: ['The review completes.'],
  }
  assert.throws(
    () =>
      validateRecordedScenario(
        'dsh-spec-error-handling',
        { ...base, files: ['../../package.json'] },
        'escaping scenario',
      ),
    /outside evals\/files|escapes/,
  )
  assert.throws(
    () =>
      validateRecordedScenario(
        'dsh-spec-error-handling',
        { ...base, files: ['evals/files/empty-catch/README.md'], install: ['../../outside'] },
        'escaping sibling',
      ),
    /invalid sibling/,
  )
})

test('evidence paths and replay modes reject symlinked ancestors and non-regular files', () => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-path-safety-'))
  const outside = mkdtempSync(join(tmpdir(), 'evidence-path-outside-'))
  try {
    const evidenceRoot = join(root, 'evidence')
    const run = join(evidenceRoot, '2026-11-23-pr122', 'dsh-spec-example', 'run')
    mkdirSync(dirname(run), { recursive: true })
    writeFileSync(join(outside, 'final.md'), 'outside\n')
    symlinkSync(outside, run)
    assert.throws(() => assertEvidencePath(evidenceRoot, join(run, 'final.md'), 'run output', 'file'), /symbolic link/)
    const regularRoot = join(root, 'regular')
    mkdirSync(regularRoot)
    writeFileSync(join(regularRoot, 'regular.md'), 'regular\n')
    assert.doesNotThrow(() =>
      assertRegularReplayPaths(regularRoot, ['regular.md'], new Map([['regular.md', '100644']]), ['regular.md']),
    )
    assert.throws(
      () => assertRegularReplayPaths(regularRoot, ['regular.md'], new Map([['regular.md', '120000']]), ['regular.md']),
      /non-regular file/,
    )
    symlinkSync('/nonexistent/target', join(regularRoot, 'dangling.md'))
    assert.throws(
      () =>
        assertRegularReplayPaths(regularRoot, ['dangling.md'], new Map([['dangling.md', '120000']]), ['dangling.md']),
      /non-regular file/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(outside, { recursive: true, force: true })
  }
})

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const fields = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    return `{${fields.join(',')}}`
  }
  return JSON.stringify(value)
}

function scenarioDefinitionHash(scenario: Scenario): string {
  return createHash('sha256').update(canonicalJson(scenario)).digest('hex')
}

function readOrderedHashManifest(path: string): Array<{ hash: string; path: string }> {
  const body = readFileSync(path, 'utf8').trim()
  if (body.length === 0) return []
  return body.split('\n').map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line)
    assert.ok(match, path + ' has a malformed hash line')
    return { hash: match[1] as string, path: match[2] as string }
  })
}

function readEvidenceTrace(path: string): EvidenceTraceEntry[] {
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as EvidenceTraceEntry)
}

function finalEvidenceMessage(trace: EvidenceTraceEntry[]): string | undefined {
  return [...trace].reverse().find((entry) => entry.type === 'item.completed' && entry.item?.type === 'agent_message')
    ?.item?.text
}

function fileHash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function skillTreeDigest(skills: readonly string[]): string {
  const lines = [...skills].sort().flatMap((skill) =>
    listFiles(join(REPO_ROOT, 'skills', skill)).map((file) => {
      const path = join(REPO_ROOT, 'skills', skill, file)
      return `${fileHash(path)}  skills/${skill}/${file}  mode=${fileMode(path)}`
    }),
  )
  return createHash('sha256').update(lines.join('\n')).digest('hex')
}

function traceEvents(trace: string): Array<{
  type: string
  command?: string
  item?: { type?: string; command?: string; text?: string; aggregated_output?: string }
}> {
  return trace
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

// Trace events are reviewer context. They are useful for understanding a run, but the model can
// write to the process output and they are not an adversarial execution attestation.
const ANSWER_BLIND_PATTERNS = [
  [/evals[/\\]evals\.json/i, 'answer manifest'],
  [/tests[/\\]skill-evals/i, 'source eval tree'],
  [/\bexpected_output\b/i, 'answer-bearing metadata'],
  [/(?:^|[/\\])codex-home(?:[/\\]|\s|$)/i, 'model runtime home'],
  [/(?:^|[/\\])response(?:[/\\]|\s|$)/i, 'model response mount'],
] as const

function assertAnswerBlindTrace(root: string): void {
  const trace = readFileSync(join(root, 'trace.jsonl'), 'utf8')
  const events = traceEvents(trace)
  assert.equal(events.filter((event) => event.type === 'turn.started').length, 1, root + ' turn start count')
  assert.equal(events.filter((event) => event.type === 'turn.completed').length, 1, root + ' turn completion count')
  for (const [pattern, label] of ANSWER_BLIND_PATTERNS) {
    assert.doesNotMatch(trace, pattern, root + ' exposed the ' + label)
  }
  const finalMessage = events
    .filter((event) => event.type === 'item.completed' && event.item?.type === 'agent_message')
    .at(-1)?.item?.text
  assert.equal(typeof finalMessage, 'string', root + ' has no final agent message')
  assert.equal(readFileSync(join(root, 'final.md'), 'utf8'), finalMessage, root + ' final response differs from trace')
}

function assertAnswerBlindTraceWithSkillOutput(root: string, skill: string): void {
  const trace = readFileSync(join(root, 'trace.jsonl'), 'utf8')
  const events = traceEvents(trace)
  assert.equal(events.filter((event) => event.type === 'turn.started').length, 1, root + ' turn start count')
  assert.equal(events.filter((event) => event.type === 'turn.completed').length, 1, root + ' turn completion count')
  const commands = events
    .flatMap((event) => [event.command, event.item?.command])
    .filter((command): command is string => typeof command === 'string')
    .join('\n')
  for (const [pattern, label] of ANSWER_BLIND_PATTERNS) {
    assert.doesNotMatch(commands, pattern, root + ' command referenced the ' + label)
  }
  const installed = `.agents/skills/${skill}/`
  const sanitized = events.map((event) =>
    event.item?.command?.includes(installed)
      ? { ...event, item: { ...event.item, aggregated_output: '<installed skill output omitted>' } }
      : event,
  )
  for (const [pattern, label] of ANSWER_BLIND_PATTERNS) {
    assert.doesNotMatch(JSON.stringify(sanitized), pattern, root + ' exposed the ' + label)
  }
  const finalMessage = events
    .filter((event) => event.type === 'item.completed' && event.item?.type === 'agent_message')
    .at(-1)?.item?.text
  assert.equal(typeof finalMessage, 'string', root + ' has no final agent message')
  assert.equal(readFileSync(join(root, 'final.md'), 'utf8'), finalMessage, root + ' final response differs from trace')
}

function traceCommandsFor(root: string): string[] {
  return traceEvents(readFileSync(join(root, 'trace.jsonl'), 'utf8')).flatMap((event) =>
    [event.command, event.item?.command].filter((command): command is string => typeof command === 'string'),
  )
}

function parseHashPath(line: string, label: string): { hash: string; path: string; mode?: string } {
  const match = /^([0-9a-f]{64})  (.+?)(?:  mode=([0-7]{4}))?$/.exec(line)
  assert.ok(match, label + ' has a malformed hash manifest line')
  return { hash: match[1] ?? '', path: match[2] ?? '', mode: match[3] }
}

function readSkillHashEntries(root: string): Map<string, { hash: string; mode?: string }> {
  const actual = new Map<string, { hash: string; mode?: string }>()
  for (const line of readFileSync(join(root, 'skill-hashes.txt'), 'utf8').trim().split('\n')) {
    const entry = parseHashPath(line, root)
    assert.match(entry.path, /^skills\//, root + ' has a non-skill path in its skill hash manifest')
    actual.set(entry.path, { hash: entry.hash, mode: entry.mode })
  }
  return actual
}

function readSkillHashes(root: string): Map<string, string> {
  return new Map([...readSkillHashEntries(root)].map(([path, entry]) => [path, entry.hash]))
}

// Complete skill bytes are provenance. The scenario definition and inputs carry automated
// currentness; reviewers select affected behavior subjects instead of comparing every tree to HEAD.
function assertBehaviorSkillProvenance(root: string, skill: string, installed: string[] = []): void {
  const actual = readSkillHashEntries(root)
  const names = new Set([skill, ...installed])
  for (const path of actual.keys()) {
    const name = /^skills\/([^/]+)\//.exec(path)?.[1]
    assert.ok(name && names.has(name), root + ' records an undeclared skill: ' + path)
  }
  for (const name of names) {
    assert.ok(actual.has(`skills/${name}/SKILL.md`), root + ' records no ' + name + ' SKILL.md provenance')
  }
}

function assertBrowserNameOnlyProvenance(root: string, formerSkill: string): void {
  const actual = readSkillHashEntries(root)
  const files = ['SKILL.md', 'THIRD_PARTY_NOTICES', 'references/publication.md', 'scripts/encode-browser-gif.mjs']
  assert.deepEqual(
    [...actual.keys()].sort(),
    files.map((file) => `skills/${formerSkill}/${file}`).sort(),
    root + ' renamed skill provenance differs',
  )
}

function readSkillTreeManifest(path: string): Map<string, string> {
  return readHashManifest(path, 'skill tree')
}

function readHashManifest(path: string, label: string): Map<string, string> {
  const hashes = new Map<string, string>()
  for (const line of readFileSync(path, 'utf8').trim().split('\n')) {
    const entry = parseHashPath(line, label)
    hashes.set(entry.path, entry.hash)
  }
  return hashes
}

function assertHistoricalSkillRevision(
  root: string,
  skill: string,
  installed: string[],
  skillsTree: ReadonlyMap<string, string>,
): void {
  const actual = readSkillHashes(root)
  const names = new Set([skill, ...installed])
  const expected = new Map<string, string>()
  for (const [path, hash] of skillsTree) {
    const name = /^skills\/([^/]+)\//.exec(path)?.[1]
    if (!name || !names.has(name)) continue
    expected.set(path, hash)
  }
  assert.ok(expected.has(`skills/${skill}/SKILL.md`), root + ' has no retained historical revision for ' + skill)
  assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort(), root + ' historical skill file set differs')
  for (const [path, hash] of expected) {
    assert.equal(actual.get(path), hash, root + ' differs from its recorded historical skill revision: ' + path)
  }
}

function assertExpectedAssertions(root: string, assertions: string[], label: string): void {
  const path = join(root, 'assertions.expected.txt')
  assertEvidencePath(root, path, label + ' expected assertions', 'file')
  assertRegularEvidenceFile(path, label + ' expected assertions')
  assert.equal(
    readFileSync(path, 'utf8').trim(),
    assertions.map((assertion) => `PASS ${assertion}`).join('\n'),
    label + ' expected assertions differ',
  )
}

test('historical evidence Git helpers ignore inherited redirection variables', () => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-git-environment-'))
  try {
    const redirectedRepository = join(root, 'redirected.git')
    const redirectedWorktree = join(root, 'redirected-worktree')
    mkdirSync(redirectedRepository)
    mkdirSync(redirectedWorktree)
    const result = runEvidenceGitText(['rev-parse', '--show-toplevel'], {
      ...process.env,
      GIT_DIR: redirectedRepository,
      GIT_WORK_TREE: redirectedWorktree,
      GIT_OBJECT_DIRECTORY: join(redirectedRepository, 'objects'),
      GIT_INDEX_FILE: join(redirectedRepository, 'index'),
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'core.bare',
      GIT_CONFIG_VALUE_0: 'true',
    })
    assert.equal(result.status, 0, result.stderr.toString())
    assert.equal(realpathSync(result.stdout.trim()), realpathSync(REPO_ROOT))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('evidence validation rejects incomplete historical revisions and expected assertions', () => {
  const root = join(
    REPO_ROOT,
    'tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-pr-description/workspace-boundaries-expose-reverse-edge',
  )
  assert.throws(
    () => assertHistoricalSkillRevision(root, 'dsh-spec-pr-description', [], new Map()),
    /has no retained historical revision/,
  )
  const manifest = readSkillTreeManifest(
    join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-pr-description/skills-tree.sha256'),
  )
  assert.throws(
    () =>
      assertHistoricalSkillRevision(
        root,
        'dsh-spec-pr-description',
        [],
        new Map([...manifest].filter(([path]) => path === 'skills/dsh-spec-pr-description/SKILL.md')),
      ),
    /historical skill file set differs/,
  )

  const assertionsRoot = mkdtempSync(join(tmpdir(), 'expected-assertions-'))
  try {
    assert.throws(
      () => assertExpectedAssertions(assertionsRoot, ['The expected behavior holds.'], 'missing'),
      /is missing/,
    )
    writeFileSync(join(assertionsRoot, 'assertions.expected.txt'), 'PASS A different behavior holds.\n')
    assert.throws(
      () => assertExpectedAssertions(assertionsRoot, ['The expected behavior holds.'], 'mismatched'),
      /expected assertions differ/,
    )
  } finally {
    rmSync(assertionsRoot, { recursive: true, force: true })
  }
})

function stageScenarioProject(skill: string, scenario: Scenario, root: string): void {
  const skillRoot = join(EVAL_SOURCE_ROOT, skill)
  for (const file of scenario.files ?? []) {
    const source = join(skillRoot, file)
    const destination = join(root, scenarioProjectPath(scenario, file))
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(source, destination)
  }
  for (const name of [skill, ...(scenario.install ?? [])]) {
    cpSync(join(REPO_ROOT, 'skills', name), join(root, '.agents', 'skills', name), { recursive: true })
  }
}

function replayEvidencePatch(root: string, skill: string, scenario: Scenario): boolean {
  const patch = join(root, 'patch.diff')
  const pathManifest = join(root, 'changed-paths.json')
  assertEvidencePath(
    root,
    existsSync(pathManifest) ? pathManifest : join(root, 'changed-paths.txt'),
    'changed paths',
    'file',
  )
  const changedPaths = existsSync(pathManifest)
    ? (() => {
        const paths = JSON.parse(readFileSync(pathManifest, 'utf8'))
        assert.ok(
          Array.isArray(paths) && paths.every((path) => typeof path === 'string'),
          root + ' has malformed changed paths',
        )
        return paths as string[]
      })()
    : readFileSync(join(root, 'changed-paths.txt'), 'utf8').trim().split('\n').filter(Boolean)
  for (const path of changedPaths) assertContainedRelativePath(path, 'replayed changed path')
  const inputManifest = join(root, 'input-manifest.sha256')
  assertEvidencePath(root, inputManifest, 'input manifest', 'file')
  assertRegularEvidenceFile(inputManifest, root + ' input manifest')
  const recordedInputs = new Map(
    readFileSync(inputManifest, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const entry = parseHashPath(line, root + ' input manifest')
        return [entry.path, entry.hash] as const
      }),
  )
  const inputRoot = join(EVAL_SOURCE_ROOT, skill)
  for (const file of scenario.files ?? []) {
    const source = assertInputFile(inputRoot, file, root + ' input ' + file)
    if (createHash('sha256').update(readFileSync(source)).digest('hex') !== recordedInputs.get(file)) return false
  }
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'skill-evidence-replay-'))
  try {
    stageScenarioProject(skill, scenario, temporaryRoot)
    const replayEnvironment = isolatedGitEnv(temporaryRoot)
    const git = (...args: string[]) => {
      const result = spawnSync('git', args, { cwd: temporaryRoot, encoding: 'utf8', env: replayEnvironment })
      assert.equal(result.status, 0, result.stderr)
      return result.stdout
    }
    git('init', '-q')
    git('config', 'user.name', 'Evidence replay')
    git('config', 'user.email', 'evidence-replay@example.invalid')
    git('add', '-A')
    git('commit', '-qm', 'fixture')
    if (changedPaths.length > 0) {
      assert.ok(existsSync(patch), root + ' has changed files without a patch')
      assertEvidencePath(root, patch, 'evidence patch', 'file')
      const applied = spawnSync('git', ['apply', '--binary', patch], {
        cwd: temporaryRoot,
        encoding: 'utf8',
        env: replayEnvironment,
      })
      assert.equal(applied.status, 0, applied.stderr)
      git('add', '-A')
      const trackedModes = new Map(
        git('ls-files', '--stage', '-z')
          .split('\0')
          .filter(Boolean)
          .map((line) => {
            const match = /^([0-7]{6}) [0-9a-f]+ [0-3]\t(.+)$/.exec(line)
            assert.ok(match, root + ' has a malformed staged path')
            return [match[2], match[1]] as const
          }),
      )
      const stagedPaths = git('diff', '--cached', '--name-only', '-z').split('\0').filter(Boolean)
      assertRegularReplayPaths(temporaryRoot, stagedPaths, trackedModes, changedPaths)
    } else {
      assertEvidencePath(root, patch, 'evidence patch', 'file')
      assert.equal(readFileSync(patch, 'utf8'), '', root + ' left an unexpected patch')
    }
    const artifactRoot = join(root, 'artifact')
    if (existsSync(artifactRoot)) assertEvidencePath(root, artifactRoot, 'artifact root', 'directory')
    const artifactFiles = existsSync(artifactRoot) ? listFiles(artifactRoot).map((path) => path) : []
    const declaredOutputs = (scenario.outputs ?? []).flatMap((path) =>
      artifactFiles.some((file) => file === path || file.startsWith(path + '/'))
        ? artifactFiles.filter((file) => file === path || file.startsWith(path + '/'))
        : [path],
    )
    const expectedArtifacts = [
      ...changedPaths.filter((path) => existsSync(join(temporaryRoot, path))),
      ...declaredOutputs,
    ]
      .filter((path, index, paths) => paths.indexOf(path) === index)
      .sort()
    const actualArtifacts = artifactFiles
    assert.deepEqual(actualArtifacts, expectedArtifacts, root + ' artifact set differs from replayed output')
    for (const path of expectedArtifacts) {
      if (existsSync(join(temporaryRoot, path))) {
        assertEvidencePath(temporaryRoot, join(temporaryRoot, path), 'replayed output', 'file')
        assert.deepEqual(
          readFileSync(join(artifactRoot, path)),
          readFileSync(join(temporaryRoot, path)),
          root + ' artifact differs from replayed output: ' + path,
        )
      } else {
        assert.ok(
          (scenario.outputs ?? []).some((output) => path === output || path.startsWith(output + '/')),
          root + ' retained an artifact outside the patch and declared outputs: ' + path,
        )
      }
    }
    return true
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

function assertRegularReplayPaths(
  root: string,
  stagedPaths: string[],
  trackedModes: ReadonlyMap<string, string | undefined>,
  changedPaths: string[],
): void {
  for (const path of stagedPaths) {
    const mode = trackedModes.get(path)
    const pathExists = existsSync(join(root, path))
    if (mode === undefined) {
      assert.equal(pathExists, false, root + ' staged an unknown non-regular file: ' + path)
      continue
    }
    assert.ok(mode === '100644' || mode === '100755', root + ' staged a non-regular file: ' + path)
    if (!pathExists) continue
  }
  assert.deepEqual(
    [...stagedPaths].sort(),
    [...changedPaths].sort(),
    root + ' changed-path list differs from the replayed patch',
  )
}

test('trigger evidence changes only with the name or description', () => {
  const body = {
    name: 'name: dsh-spec-example',
    description: 'description: "Select the example behavior. 用于示例。"',
  }
  const original = `${body.name}\n${body.description}\n---\n\n# Example\n\nFirst body.\n`
  const bodyOnly = `${body.name}\n${body.description}\n---\n\n# Example\n\nDifferent body.\n`
  assert.equal(hashTriggerSurface(original, 'example'), hashTriggerSurface(bodyOnly, 'example'))
  assert.notEqual(
    hashTriggerSurface(original, 'example'),
    hashTriggerSurface(original.replace(body.name, 'name: dsh-spec-renamed'), 'example'),
  )
  assert.notEqual(
    hashTriggerSurface(original, 'example'),
    hashTriggerSurface(original.replace(body.description, 'description: "Different trigger."'), 'example'),
  )
})

test('browser GIF renamed skill binds current trigger evidence to the delivered name and description', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-24-pr126')
  assertCurrentTriggerEvidence('dsh-spec-record-browser-gif', join(evidenceRoot, 'dsh-spec-record-browser-gif'))
})

test('CI test reliability keeps pre-scope-correction trigger evidence historical', () => {
  const skill = 'dsh-spec-ci-test-reliability'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-24-pr126', skill)
  const readme = readFileSync(join(evidenceRoot, 'README.md'), 'utf8')
  assert.match(readme, /^> \*\*Historical status:\*\* this 8\/8 matrix ran against the pre-#144 description/m)

  const historicalInputs = readHashManifest(join(evidenceRoot, 'trigger-input.sha256'), skill + ' trigger inputs')
  assert.equal(
    historicalInputs.get(`tests/skill-evals/${skill}/trigger-evals.json`),
    'e459b0811b911121423f0a4f6d1578842f187679e483dafc36cce4d3c3a19d70',
  )
  assert.equal(
    historicalInputs.get(`tests/skill-evals/${skill}/trigger-fixtures/AGENTS.md`),
    '0d20c0998086b650f634d062cb535c8437b81de1b0da47fa9f71d8bda8bf388a',
  )
  assert.equal(
    historicalInputs.get(triggerSurfacePath(skill)),
    '184680a812e8952c7c66bced4d1ee42bdc242ca9c2ed63f071aea7ae319bf3ad',
  )
  assert.notEqual(
    historicalInputs.get(`tests/skill-evals/${skill}/trigger-evals.json`),
    createHash('sha256')
      .update(readFileSync(join(REPO_ROOT, `tests/skill-evals/${skill}/trigger-evals.json`)))
      .digest('hex'),
    'historical trigger corpus matches the current corpus',
  )
  assert.notEqual(
    historicalInputs.get(triggerSurfacePath(skill)),
    triggerSurfaceHash(skill),
    'historical trigger surface matches the current skill',
  )

  const corpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assertTriggerCorpusIdentity(skill)
  assert.deepEqual(
    corpus.queries.map((query) => [query.id, query.should_trigger]),
    [
      ['parallel-port-collision', true],
      ['test-order-global-leak', true],
      ['teardown-child-leak', true],
      ['slow-repeated-fixture', true],
      ['production-latency', false],
      ['coverage-percentage', false],
      ['test-plan-document', false],
      ['ui-visual-review', false],
    ],
  )
  assert.match(corpus.queries.find((query) => query.id === 'slow-repeated-fixture')?.query ?? '', /test lane/)

  const matrix = readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8').trim().split('\n')
  assert.equal(matrix[0], 'id\tshould_trigger\tselected\tresult')
  assert.equal(matrix.length, corpus.queries.length + 1)
  for (const line of matrix.slice(1)) {
    const [id, shouldTrigger, selected, result] = line.split('\t')
    assert.ok(id && shouldTrigger && selected && result, 'historical trigger row is malformed')
    assert.equal(shouldTrigger, selected, id + ' historical trigger decision changed')
    assert.equal(result, 'pass', id + ' historical trigger run did not pass')
  }
})

test('CI test reliability binds current typed trigger and slow-suite evidence', () => {
  const skill = 'dsh-spec-ci-test-reliability'
  assertCurrentTypedTriggerEvidence(skill)
  assertCurrentTypedBehaviorEvidence(skill, 'redesign-slow-repeated-suite')
})

test('speed-up-perf binds current trigger evidence', () => {
  assertCurrentTriggerEvidence(
    'dsh-spec-speed-up-perf',
    join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue-166/dsh-spec-speed-up-perf'),
    true,
    'selected',
    new Set(),
    true,
    true,
    true,
  )
})

test('speed-up-perf keeps measurement, memory, identity and evidence boundaries explicit', () => {
  const body = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-speed-up-perf/SKILL.md'), 'utf8')
  for (const requirement of [
    /Not for test flakiness.*capacity planning/i,
    /benchmark.*gate.*profile.*separate decisions/i,
    /do not download, install or start a substitute/i,
    /one warm-up and at least five measured samples/i,
    /Cold-start measurements use fresh processes or child processes/i,
    /memory still reachable.*transient allocation or peak pressure/i,
    /Stabilize identities and narrow subscriptions/i,
    /Preserve update ordering, the immediate initial event and an equivalent teardown/i,
    /A deliberate visible difference states what changes/i,
    /Treat a gate as source configuration or a project-owned threshold/i,
    /Separate historical claims, fresh local measurements, production telemetry, gate results and CI evidence/i,
    /Delegate independent measurement domains/i,
    /decision-record mechanism/i,
    /official stack mechanism/i,
    /separate worktrees/i,
    /review findings, including bot reports/i,
    /standing instructions, architecture and testing policies, relevant package guidance, defensive patterns/i,
    /Do not add a production export solely for measurement/i,
    /For process, clock, browser-test or asynchronous cleanup mechanics/i,
    /Command, revision, runtime, platform and workload/i,
    /Survey applicable lifecycle moments/i,
    /internal speed does not prove transport, paint, scrolling or input response/i,
    /Vary independent cost drivers separately/i,
    /add a matrix cell only when it can change/i,
    /Keep package-local diagnostics beside the owning module/i,
    /do not scale bytes, counts or dimensionless ratios by processor speed/i,
    /explicit lane decision and repeated measurements.*each supported browser/i,
    /Serialize measured work against other owned CPU-heavy jobs/i,
    /Reduce a failing scenario until it still exercises the real bottleneck/i,
    /Remove duplicate parsing, copying, freezing.*durable or wire parsing/i,
    /retaining every generation.*writable-readiness/i,
    /Do not cache expanded representations/i,
    /do not silently truncate or omit nested or large results/i,
    /functional expectations independent of benchmark internals/i,
    /Reusable procedure.*scenario-specific truth/i,
    /Fix a finding in its owning layer/i,
    /local timing as local evidence, not proof.*CI or gate runner is stable/i,
  ]) {
    assert.match(body, requirement)
  }
  assert.doesNotMatch(body, /\bDeepSeek\b|\bSession\b|benchmarks\/|machine calibration|fixed budget/i)
})

test('translate docs binds current trigger evidence', () => {
  assertCurrentTriggerEvidence(
    'dsh-spec-translate-docs',
    join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-pr142/dsh-spec-translate-docs'),
  )
})

test('translate docs trigger corpus separates pair maintenance from ordinary documentation work', () => {
  const corpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-translate-docs', 'trigger-evals.json'), 'utf8'),
  ) as { queries: Array<{ id: string; should_trigger: boolean }> }
  const expected = new Map([
    ['explicit-pair-update', true],
    ['explicit-pair-check', true],
    ['declared-pair-document-change', true],
    ['workflow-authorized-new-pair', true],
    ['standing-policy-new-pair', true],
    ['ordinary-standalone-translation', false],
    ['ordinary-documentation-edit', false],
    ['adjacent-documentation-review', false],
    ['inferred-translation-without-pair-scope', false],
  ])
  assert.deepEqual(
    corpus.queries.map((query) => [query.id, query.should_trigger]),
    [...expected],
    'translate docs trigger categories differ',
  )
})

test('pr-description binds current trigger evidence', () => {
  assertCurrentTriggerEvidence(
    'dsh-spec-pr-description',
    join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-issue143/dsh-spec-pr-description'),
  )
})

test('merging stacked PRs binds current trigger evidence', () => {
  assertCurrentTriggerEvidence(
    'dsh-spec-merging-stacked-prs',
    join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue150/dsh-spec-merging-stacked-prs'),
  )
})

test('merging stacked PRs trigger corpus separates official landing from adjacent work', () => {
  const skill = 'dsh-spec-merging-stacked-prs'
  const skillText = readFileSync(join(REPO_ROOT, 'skills', skill, 'SKILL.md'), 'utf8')
  const description = /^description: "(.*)"$/m.exec(skillText)?.[1]
  assert.ok(description)
  assert.ok(description.length <= 500, `${description.length} description characters`)
  assert.match(description, /Requires GitHub stacked-PR support and gh stack/i)
  assert.match(description, /Not for review-fix propagation, single-PR merges, manual target changes/i)
  assert.match(description, /不适用于评审修复传播/)

  const corpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.deepEqual(
    corpus.queries.map((entry) => [entry.id, entry.should_trigger]),
    [
      ['land-whole-official-stack', true],
      ['land-through-boundary-pr', true],
      ['link-same-author-chain', true],
      ['refresh-then-land', true],
      ['ordinary-single-pr-merge', false],
      ['manual-retarget', false],
      ['stack-review-fix-propagation', false],
      ['non-github-dependent-mrs', false],
      ['gh-stack-unavailable', false],
    ],
  )
  assert.match(corpus.queries[0]?.query ?? '', /official GitHub stack/i)
  assert.match(corpus.queries[1]?.query ?? '', /only through #302/i)
  assert.match(corpus.queries[2]?.query ?? '', /all authored by me/i)
  assert.match(corpus.queries[3]?.query ?? '', /Refresh the stack.*land it/i)
  assert.match(corpus.queries[4]?.query ?? '', /standalone change with no dependent PRs/i)
  assert.match(corpus.queries[5]?.query ?? '', /Retarget it with gh pr edit/i)
  assert.match(corpus.queries[6]?.query ?? '', /do not merge any PR/i)
  assert.match(corpus.queries[7]?.query ?? '', /GitLab merge requests/i)
  assert.match(corpus.queries[8]?.query ?? '', /gh stack extension is not installed/i)
})

test('pr-description eval covers issue exceptions and review update boundaries', () => {
  const corpus = readCorpus('dsh-spec-pr-description')
  assert.equal(corpus.evals.length, 6)
  assert.deepEqual(
    corpus.evals.map((entry) => entry.id),
    [
      'stack-layer-replaces-legacy-ai-section',
      'workspace-boundaries-expose-reverse-edge',
      'tracked-issue-reference-count',
      'tracker-without-matching-issue',
      'unfinished-review-does-not-update',
      'handled-review-updates-ai-usage',
    ],
  )
  const skillText = readFileSync(join(REPO_ROOT, 'skills', 'dsh-spec-pr-description', 'SKILL.md'), 'utf8')
  const description = /^description: "(.*)"$/m.exec(skillText)?.[1]
  assert.ok(description)
  assert.ok(description.length <= 500, `${description.length} description characters`)
  assert.match(description, /after a handled review round/i)
  assert.match(description, /处理完一轮评审之后/)
  assert.doesNotMatch(description, /or after review|或在评审之后使用/)
  assert.match(skillText, /Reference at least one same-project tracked issue/)
  assert.match(skillText, /no matching issue exists and give the tracker search or status/i)
  assert.match(skillText, /If the project has no issue tracker, state that no tracker applies/i)
  assert.match(skillText, /cannot turn an existing tracked issue into an optional reference/i)
  assert.match(skillText, /explicit no-tracker or no-matching-issue exception/i)
  const scenario = corpus.evals.find((entry) => entry.id === 'stack-layer-replaces-legacy-ai-section')
  assert.ok(scenario)
  assert.equal(scenario.id, 'stack-layer-replaces-legacy-ai-section')
  assert.equal(scenario.assertions.length, 9)
  assert.match(scenario.prompt, /top layer of a two-layer stack/)
  assert.match(scenario.prompt, /Human and Agent Roles/)
  assert.match(scenario.prompt, /declares no issue tracker/)
  assert.match(scenario.expected_output, /does not add tracker labels, Project fields, or dates/)
  assert.match(scenario.assertions.join('\n'), /no issue tracker applies/)
  for (const entry of corpus.evals) {
    for (const file of entry.files ?? []) {
      const absolute = join(EVAL_SOURCE_ROOT, 'dsh-spec-pr-description', file)
      assert.equal(statSync(absolute).isFile(), true, `${entry.id}: ${file} is not a file`)
      assert.ok(statSync(absolute).size > 0, `${entry.id}: ${file} is empty`)
    }
  }
  const body = readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-pr-description', 'evals/files/project/pr-body.md'), 'utf8')
  assert.match(body, /^## Human and Agent Roles$/m)
  assert.doesNotMatch(JSON.stringify(corpus), /## Project fields/)
  const dependencies = corpus.evals.find((entry) => entry.id === 'workspace-boundaries-expose-reverse-edge')
  assert.ok(dependencies)
  assert.match(dependencies.assertions.join('\n'), /base-to-head manifest diff/)
  assert.match(dependencies.assertions.join('\n'), /removed runtime edge is written as app → legacy/)
  assert.match(dependencies.assertions.join('\n'), /core → app runtime edge/)
  const tracked = corpus.evals.find((entry) => entry.id === 'tracked-issue-reference-count')
  assert.ok(tracked)
  assert.match(tracked.prompt, /project conventions, tracker state, change record, and supplied reference fixture/i)
  assert.doesNotMatch(
    tracked.prompt,
    /precedence|preserve both|both same-project|must be visible|optional|mandatory|hidden|code-fenced|inline-code|cross-project|#1[789]|#20/i,
  )
  assert.match(
    tracked.expected_output,
    /visible same-project references for both Issue #17 with a resolving keyword and Issue #18/i,
  )
  assert.match(tracked.expected_output, /project convention does not make the tracked issue references optional/i)
  assert.match(tracked.assertions.join('\n'), /project convention does not make the tracked issue references optional/)
  assert.match(tracked.assertions.join('\n'), /Hidden, code-fenced, inline-code, and cross-project references/)
  assert.match(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-pr-description', 'evals/files/tracked-issues/AGENTS.md'), 'utf8'),
    /Issue references are optional/,
  )
  const nonCountingReferences = readFileSync(
    join(EVAL_SOURCE_ROOT, 'dsh-spec-pr-description', 'evals/files/tracked-issues/non-counting-references.md'),
    'utf8',
  )
  assert.match(nonCountingReferences, /<!--/)
  assert.match(nonCountingReferences, /```markdown/)
  assert.match(nonCountingReferences, /Inline `Resolves Issue #17`/)
  assert.match(nonCountingReferences, /github\.com\/example\/other-project\/issues\/17/)
  const noIssue = corpus.evals.find((entry) => entry.id === 'tracker-without-matching-issue')
  assert.ok(noIssue)
  assert.match(noIssue.expected_output, /tracker query and zero-result status/i)
  assert.match(noIssue.assertions.join('\n'), /Change request #31 is not treated as an issue reference/)
  const unfinished = corpus.evals.find((entry) => entry.id === 'unfinished-review-does-not-update')
  assert.ok(unfinished)
  assert.match(unfinished.prompt, /only review activity changed/i)
  assert.match(unfinished.assertions.join('\n'), /review row remains n\/a/)
  assert.match(unfinished.assertions.join('\n'), /answered comment whose fix is not published/)
  assert.match(
    readFileSync(
      join(EVAL_SOURCE_ROOT, 'dsh-spec-pr-description', 'evals/files/review/unfinished/review-state.md'),
      'utf8',
    ),
    /answered that it will be fixed, but no fix is published/,
  )
  const handled = corpus.evals.find((entry) => entry.id === 'handled-review-updates-ai-usage')
  assert.ok(handled)
  assert.match(handled.expected_output, /pair level/i)
  assert.match(handled.assertions.join('\n'), /no-comments statement is removed/)
  stageSkillWithEvals('dsh-spec-pr-description')
})

test('pr-description trigger corpus separates descriptions from adjacent work', () => {
  const skill = 'dsh-spec-pr-description'
  const skillText = readFileSync(join(REPO_ROOT, 'skills', skill, 'SKILL.md'), 'utf8')
  assert.match(skillText, /^description: ".*module responsibilities and dependency edges.*模块职责与依赖边.*"$/m)
  assertTriggerCorpusIdentity(skill)
  const corpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    skill_name: string
    agent_file: string
    queries: Array<{ id: string; query: string; should_trigger: boolean; files?: string[] }>
  }
  assert.equal(corpus.skill_name, skill)
  assertNonEmptyString(corpus.agent_file, 'pr-description trigger agent file')
  assert.ok(corpus.agent_file.startsWith('trigger-fixtures/'))
  assert.ok(existsSync(join(EVAL_SOURCE_ROOT, skill, corpus.agent_file)))
  assert.deepEqual(
    corpus.queries.map((entry) => [entry.id, entry.should_trigger]),
    [
      ['dependency-edge-report', true],
      ['handled-review-description-update', true],
      ['release-note-near-miss', false],
      ['commit-message-near-miss', false],
      ['ordinary-docs-near-miss', false],
      ['unfinished-review-comment-near-miss', false],
    ],
  )
  assert.match(corpus.queries[0]?.query ?? '', /dependency-edge/i)
  assert.match(corpus.queries[1]?.query ?? '', /handled round/i)
  assert.match(corpus.queries.at(-1)?.query ?? '', /fix has not been published/i)
  assert.match(corpus.queries.at(-1)?.query ?? '', /unfinished review round/i)
  assert.match(corpus.queries.at(-1)?.query ?? '', /require a pull-request description update/i)
  assert.doesNotMatch(corpus.queries.at(-1)?.query ?? '', /do not (?:create|update)/i)
  assert.doesNotMatch(corpus.queries.at(-1)?.query ?? '', /draft a reply/i)
  for (const entry of corpus.queries) {
    assertNonEmptyString(entry.id, 'pr-description trigger eval id')
    assertNonEmptyString(entry.query, entry.id + ' trigger query')
    for (const file of entry.files ?? []) {
      assert.ok(file.startsWith('trigger-fixtures/'), entry.id + ' fixture escapes trigger-fixtures')
      assert.ok(existsSync(join(EVAL_SOURCE_ROOT, skill, file)), entry.id + ' fixture is missing: ' + file)
    }
  }
})

test('prose-standard eval covers proposition restoration and leakage keeps', () => {
  const skill = 'dsh-spec-prose-standard'
  const corpus = readCorpus(skill)
  assert.deepEqual(
    corpus.evals.map((entry) => entry.id),
    [
      'coordinator-contract-survives-transcript-trim',
      'control-flow-comment-keeps-load-order-contract',
      'leakage-keeps-survive-mixed-readme-audit',
    ],
  )
  const prompts = corpus.evals.map((entry) => entry.prompt).join('\n')
  assert.doesNotMatch(
    prompts,
    /per-session|independent ordering|buffered events|read-before-mutation|#1470|counterfactual|measured|old connection|new one accepts/i,
  )

  const coordinatorRoot = join(EVAL_SOURCE_ROOT, skill, 'evals/files/coordinator')
  assert.match(readFileSync(join(coordinatorRoot, 'docs/working-notes.md'), 'utf8'), /preserves its own ordering/)
  assert.match(readFileSync(join(coordinatorRoot, 'docs/working-notes.md'), 'utf8'), /does not retry/)
  assert.match(readFileSync(join(coordinatorRoot, 'docs/coordinator.md'), 'utf8'), /First I checked/)

  const pluginFile = join(EVAL_SOURCE_ROOT, skill, 'evals/files/plugin-order/src/register-tools.ts')
  const pluginSource = readFileSync(pluginFile, 'utf8')
  assert.match(pluginSource, /First read the plugin list/)
  assert.match(pluginSource, /Finally return the registry/)
  assert.match(pluginSource, /read-before-mutation gate/)

  const leakageFile = join(EVAL_SOURCE_ROOT, skill, 'evals/files/leakage-keeps/README.md')
  const leakageSource = readFileSync(leakageFile, 'utf8')
  assert.match(leakageSource, /issue #1470 owns/)
  assert.match(leakageSource, /Without the byte-length guard/)
  assert.match(leakageSource, /measured: 512 nests ≈ 0\.15s; 4096 blocks the event loop/)
  assert.match(leakageSource, /old connection drains before the new one accepts/)
  assert.match(leakageSource, /This change replaces/)
  assert.match(leakageSource, /First normalize/)

  stageSkillWithEvals(skill)
})

test('prose-standard trigger corpus separates durable prose from adjacent work', () => {
  const skill = 'dsh-spec-prose-standard'
  assertTriggerCorpusIdentity(skill)
  const corpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.deepEqual(
    corpus.queries.map((query) => [query.id, query.should_trigger]),
    [
      ['write-documentation-page', true],
      ['audit-durable-instructions', true],
      ['restore-comment-contract', true],
      ['trim-configuration-comment', true],
      ['write-prompt-instructions', true],
      ['restore-visible-string', true],
      ['trim-visible-string', true],
      ['audit-prompt-leakage', true],
      ['transient-chat-edit-near-miss', false],
      ['code-correctness-only-near-miss', false],
      ['ordinary-code-review-near-miss', false],
      ['agent-note-lifecycle-only-near-miss', false],
    ],
  )
  assert.equal(new Set(corpus.queries.map((query) => query.id)).size, corpus.queries.length)
  assert.equal(corpus.queries.filter((query) => query.should_trigger).length, 8)
  assert.equal(corpus.queries.filter((query) => !query.should_trigger).length, 4)
  assert.match(corpus.queries[0]?.query ?? '', /deployment guide/i)
  assert.match(corpus.queries[1]?.query ?? '', /Audit AGENTS\.md/i)
  assert.match(corpus.queries[2]?.query ?? '', /Restore the missing contract in the comment/i)
  assert.match(corpus.queries[3]?.query ?? '', /Trim the configuration comment/i)
  assert.match(corpus.queries[4]?.query ?? '', /Rewrite the system prompt/i)
  assert.match(corpus.queries[5]?.query ?? '', /Restore the user-visible export error/i)
  assert.match(corpus.queries[6]?.query ?? '', /Trim the modal copy/i)
  assert.match(corpus.queries[7]?.query ?? '', /Audit the tool description/i)
  assert.match(corpus.queries[8]?.query ?? '', /chat reply.*read it once here/i)
  assert.match(corpus.queries[9]?.query ?? '', /defect is in executable control flow/i)
  assert.match(corpus.queries[10]?.query ?? '', /correctness and security regressions/i)
  assert.match(corpus.queries[11]?.query ?? '', /note text is final/i)
  assert.doesNotMatch(
    corpus.queries
      .filter((query) => !query.should_trigger)
      .map((query) => query.query)
      .join('\n'),
    /\bdo not\b|\bdon't\b/i,
  )
  for (const query of corpus.queries) {
    assertNonEmptyString(query.id, 'prose-standard trigger id')
    assertNonEmptyString(query.query, query.id + ' trigger query')
  }
})

test('prose-standard evidence binds current behavior files and trigger evidence', () => {
  const skill = 'dsh-spec-prose-standard'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue149', skill)
  const corpus = readCorpus(skill)
  const behaviorFiles = readHashManifest(join(evidenceRoot, 'behavior-files.sha256'), 'prose-standard behavior files')
  const expectedFiles = [
    `skills/${skill}/SKILL.md`,
    `skills/${skill}/references/coverage.md`,
    `skills/${skill}/references/examples.md`,
    `skills/${skill}/references/recall-batteries.md`,
  ]
  assert.deepEqual([...behaviorFiles.keys()].sort(), expectedFiles)
  for (const path of expectedFiles) {
    assert.equal(
      behaviorFiles.get(path),
      createHash('sha256')
        .update(readFileSync(join(REPO_ROOT, path)))
        .digest('hex'),
      'prose-standard behavior file changed: ' + path,
    )
  }
  for (const scenario of corpus.evals) {
    const root = join(evidenceRoot, scenario.id)
    assertCurrentBehaviorEvidence(root, skill, scenario)
    assertBehaviorRunSkillHashes(root, skill, behaviorFiles)
    assertBehaviorScenarioTraceBinding(root, skill, scenario)
  }
  const readme = readFileSync(join(evidenceRoot, 'README.md'), 'utf8')
  assert.match(readme, /passed 20 of 20 reviewer-certified assertions/)
  assert.match(readme, /All twelve decisions matched the expected outcome/)
  assertCurrentTriggerEvidence(skill, evidenceRoot, true, 'selected', new Set(), true)
})

test('prose-standard evidence rejects stale, swapped and cross-query provenance', () => {
  const skill = 'dsh-spec-prose-standard'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue149', skill)
  const corpus = readCorpus(skill)
  const behaviorFiles = readHashManifest(join(evidenceRoot, 'behavior-files.sha256'), 'prose-standard behavior files')
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'prose-evidence-swap-'))
  try {
    const changedSkillRoot = join(temporaryRoot, skill)
    cpSync(join(REPO_ROOT, 'skills', skill), changedSkillRoot, { recursive: true })
    const changedSkillPath = join(changedSkillRoot, 'SKILL.md')
    writeFileSync(changedSkillPath, `${readFileSync(changedSkillPath, 'utf8')}\nChanged without a rerun.\n`)
    const changedBehaviorFiles = new Map(
      [...behaviorFiles.keys()].map((path) => [
        path,
        fileHash(join(changedSkillRoot, path.slice(`skills/${skill}/`.length))),
      ]),
    )
    assert.throws(
      () =>
        assertBehaviorRunSkillHashes(
          join(evidenceRoot, 'coordinator-contract-survives-transcript-trim'),
          skill,
          changedBehaviorFiles,
        ),
      /behavior run skill hash differs/,
    )

    const scenarioCopy = join(temporaryRoot, 'scenario-copy')
    cpSync(join(evidenceRoot, 'coordinator-contract-survives-transcript-trim'), scenarioCopy, { recursive: true })
    cpSync(
      join(evidenceRoot, 'control-flow-comment-keeps-load-order-contract/trace.jsonl'),
      join(scenarioCopy, 'trace.jsonl'),
    )
    cpSync(
      join(evidenceRoot, 'control-flow-comment-keeps-load-order-contract/final.md'),
      join(scenarioCopy, 'final.md'),
    )
    const coordinator = corpus.evals.find((scenario) => scenario.id === 'coordinator-contract-survives-transcript-trim')
    assert.ok(coordinator)
    assert.throws(
      () => assertBehaviorScenarioTraceBinding(scenarioCopy, skill, coordinator),
      /trace subject|trace scenario hash/,
    )

    const triggerCorpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
      queries: Array<{ id: string; query: string; should_trigger: boolean }>
    }
    const queryRoot = join(temporaryRoot, 'query-copy')
    cpSync(join(evidenceRoot, 'trigger/write-documentation-page'), queryRoot, { recursive: true })
    cpSync(join(evidenceRoot, 'trigger/audit-durable-instructions/trace.jsonl'), join(queryRoot, 'trace.jsonl'))
    cpSync(join(evidenceRoot, 'trigger/audit-durable-instructions/final.md'), join(queryRoot, 'final.md'))
    const documentationQuery = triggerCorpus.queries.find((query) => query.id === 'write-documentation-page')
    assert.ok(documentationQuery)
    assert.throws(
      () => assertTriggerQueryBinding(queryRoot, skill, documentationQuery, readTriggerCorpus(skill)),
      /trace query id|trace query hash/,
    )
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
})

test('Agent Notes audit commands load the declared companion contract', () => {
  const body = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-agent-notes/SKILL.md'), 'utf8')
  assert.match(body, /before auditing/i)
  assert.match(body, /--companion \.zh\.md --companion \.i18n\.yaml/)
  assert.match(body, /bare check is valid only when the project declares no companions/i)
})

test('Agent Notes proposal-first fixtures cover retained, checkpointed and unavailable states', (t) => {
  const evalRoot = join(EVAL_SOURCE_ROOT, 'dsh-spec-agent-notes', 'evals', 'files')
  const notes = join(REPO_ROOT, 'skills', 'dsh-spec-agent-notes', 'scripts', 'notes.mjs')
  const checkpointScenario = readCorpus('dsh-spec-agent-notes').evals.find(
    (scenario) => scenario.id === 'proposal-checkpoint-keeps-partial-moves-complete',
  )
  assert.ok(checkpointScenario)
  assert.equal(checkpointScenario.project_root, 'evals/files/checkpoint')
  const checkpointProject = mkdtempSync(join(tmpdir(), 'agent-notes-checkpoint-project-'))
  t.after(() => rmSync(checkpointProject, { recursive: true, force: true }))
  stageScenarioProject('dsh-spec-agent-notes', checkpointScenario, checkpointProject)
  const checkpointEnvironment = isolatedGitEnv(checkpointProject)
  const checkpointGit = (...args: string[]) => {
    const result = spawnSync('git', args, {
      cwd: checkpointProject,
      encoding: 'utf8',
      env: checkpointEnvironment,
    })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout
  }
  checkpointGit('init', '-q')
  checkpointGit('config', 'user.name', 'Checkpoint fixture')
  checkpointGit('config', 'user.email', 'checkpoint@example.invalid')
  checkpointGit('add', '-A')
  checkpointGit('commit', '-qm', 'fixture: last-confirmed state')
  assert.equal(checkpointGit('status', '--short'), '')
  for (const file of checkpointScenario.files ?? []) {
    assert.equal(
      existsSync(join(checkpointProject, scenarioProjectPath(checkpointScenario, file))),
      true,
      'checkpoint input is not rooted at the fixture project: ' + file,
    )
  }
  const checkpointPair = spawnSync(
    process.execPath,
    [join(REPO_ROOT, 'skills/dsh-spec-translate-docs/scripts/translate-pair.mjs'), 'check', '--root', '.'],
    { cwd: checkpointProject, encoding: 'utf8', env: checkpointEnvironment },
  )
  assert.equal(checkpointPair.status, 0, checkpointPair.stdout + checkpointPair.stderr)
  const checkpointRootCheck = spawnSync(
    process.execPath,
    [notes, 'check', '--root', '.agents/dsh-spec-agent-notes', '--companion', '.zh.md', '--companion', '.i18n.yaml'],
    { cwd: checkpointProject, encoding: 'utf8', env: checkpointEnvironment },
  )
  assert.equal(checkpointRootCheck.status, 0, checkpointRootCheck.stdout + checkpointRootCheck.stderr)

  const proposalRoot = join(evalRoot, 'proposal-first', '.agents', 'dsh-spec-agent-notes')
  const proposalChecked = spawnSync(process.execPath, [notes, 'check', '--root', proposalRoot], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  assert.equal(proposalChecked.status, 0, proposalChecked.stdout + proposalChecked.stderr)

  const checkpointNotes = join(evalRoot, 'checkpoint', '.agents', 'dsh-spec-agent-notes')
  const checkpointChecked = spawnSync(
    process.execPath,
    [notes, 'check', '--root', checkpointNotes, '--companion', '.zh.md', '--companion', '.i18n.yaml'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  )
  assert.equal(checkpointChecked.status, 0, checkpointChecked.stdout + checkpointChecked.stderr)

  const unavailable = join(evalRoot, 'proposal-unavailable')
  assert.match(readFileSync(join(unavailable, 'unmerged-draft.md'), 'utf8'), /not been reviewed or retained/)
  assert.equal(existsSync(join(unavailable, '.agents', 'dsh-spec-agent-notes')), false)

  const checklist = readFileSync(join(evalRoot, 'checkpoint/issue.md'), 'utf8')
  assert.match(checklist, /## Tracker item: Resumable export/)
  assert.match(checklist, /## Tracker item: Export retention policy/)
  assert.match(checklist, /Resumable export.*2026-11-20-resumable-export\.md/s)
  assert.match(checklist, /Export retention policy.*2026-11-21-retention-policy\.md/s)
  assert.match(checklist, /Pending: cancelling an in-flight export/i)

  const source = readFileSync(join(evalRoot, 'checkpoint/src/exports.mjs'), 'utf8')
  assert.doesNotMatch(source, /cancel/i)
  const tests = readFileSync(join(evalRoot, 'checkpoint/tests/exports.test.mjs'), 'utf8')
  assert.match(tests, /resume/i)
  assert.match(tests, /purgeExpired/i)

  const featureRoot = join(checkpointNotes, 'proposed', 'feature')
  const checkpointFixtureRoot = join(evalRoot, 'checkpoint')
  const partialPath = join(featureRoot, '2026-11-20-resumable-export.md')
  const partial = readFileSync(partialPath, 'utf8')
  assert.match(partial, /Status: proposed/)
  assert.match(partial, /Cancelling an in-flight export/i)
  assert.match(
    partial,
    /\[Issue #140, tracker item “Resumable export”\]\(\.\.\/\.\.\/\.\.\/\.\.\/issue\.md#tracker-item-resumable-export\)/,
  )
  const completePath = join(featureRoot, '2026-11-21-retention-policy.md')
  const complete = readFileSync(completePath, 'utf8')
  assert.match(complete, /Status: proposed/)
  assert.match(complete, /seven days/i)
  assert.match(
    complete,
    /\[Issue #140, tracker item “Export retention policy”\]\(\.\.\/\.\.\/\.\.\/\.\.\/issue\.md#tracker-item-export-retention-policy\)/,
  )
  for (const stem of ['2026-11-20-resumable-export', '2026-11-21-retention-policy']) {
    for (const suffix of ['.zh.md', '.i18n.yaml']) {
      assert.equal(existsSync(join(featureRoot, stem + suffix)), true, stem + suffix + ' is missing')
    }
    const pair = spawnSync(
      process.execPath,
      [
        join(REPO_ROOT, 'skills/dsh-spec-translate-docs/scripts/translate-pair.mjs'),
        'check',
        join('.agents', 'dsh-spec-agent-notes', 'proposed', 'feature', stem + '.md'),
      ],
      { cwd: checkpointFixtureRoot, encoding: 'utf8' },
    )
    assert.equal(pair.status, 0, pair.stdout + pair.stderr)
  }

  const workflow = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-agent-notes/references/workflow.md'), 'utf8')
  assert.match(
    workflow,
    /Proposed Agent Note.*Execution issue or tracker item.*Implementation commit or change request/s,
  )
  assert.match(workflow, /Each proposal links its execution tracker, and each tracker item links back to its proposal/)
  assert.match(
    workflow,
    /Use one proposal and one tracker item for a coherent decision\. Split independent decisions into separate proposals and tracker items/,
  )
  assert.match(
    workflow,
    /Search the target branch's active `proposed\/` inventory for a note that owns or constrains the decision/,
  )
  assert.match(
    workflow,
    /A note confined to a working tree, Draft change, unmerged branch or stale local revision is not active inventory/,
  )
  assert.match(workflow, /A proposal-only change is reviewed and merged with `Status: proposed`/)
  assert.match(workflow, /A partial change uses the project's non-closing reference convention/)
  assert.match(workflow, /Keep the note in `proposed\/` if any accepted criterion/)
  assert.match(workflow, /Move the note to `implemented\/` only at the complete checkpoint/)
  assert.match(workflow, /^## Multi-goal proposals$/m)
  assert.match(workflow, /A coherent proposal may have several acceptance criteria or several execution-tracker goals/)
  assert.match(
    workflow,
    /If scope is reduced or expanded, update the proposal's acceptance criteria and review that design change/,
  )
  assert.match(workflow, /non-closing reference convention/)
  assert.match(workflow, /independent, complete decision/)
  assert.match(workflow, /measured condition for reintroducing it/)
  assert.doesNotMatch(workflow, /Do not create `work\.md`/)

  const proposalDecision = readFileSync(
    join(REPO_ROOT, '.agents/dsh-spec-agent-notes/implemented/process/2026-09-18-drop-the-work-record.md'),
    'utf8',
  )
  assert.match(proposalDecision, /Reintroduce it only if resuming proves unreliable without it/)
  assert.match(proposalDecision, /The removed path is absent/)
  assert.match(proposalDecision, /No executable in the repository creates, reads or updates that path/)
  assert.doesNotMatch(proposalDecision, /Nothing references the artifact/)

  const forgingRecord = readFileSync(
    join(REPO_ROOT, '.agents/dsh-spec-agent-notes/implemented/process/2026-10-27-forging-dsh-spec-agent-notes.md'),
    'utf8',
  )
  assert.match(forgingRecord, /The proposal-first workflow is not attributed to upstream/)
  assert.match(forgingRecord, /The proposal-first owner note is current project authority/)
  for (const id of ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10']) {
    const row = new RegExp(`^\\| ${id} \\| ([^|]+) \\|`, 'm').exec(forgingRecord)
    assert.ok(row, id + ' disposition anchor is missing')
    assert.doesNotMatch(row[1] ?? '', /`WF`/, id + ' cites its target as its source')
  }
  for (const id of ['39', '40', '41', '42', '43', '44', '45', '46', '47', '48']) {
    assert.match(forgingRecord, new RegExp(`^\\| ${id} \\|`, 'm'), id + ' verification anchor is missing')
  }
  assert.match(forgingRecord, /proposal-to-tracker and tracker-to-proposal links are both present/)
  assert.match(forgingRecord, /Any reduction or expansion of accepted scope returns to proposal review/)
  assert.match(forgingRecord, /A partial change uses the project's non-closing reference convention/)
  assert.match(
    forgingRecord,
    /Checkpoint after each material implementation goal, before completion, and whenever work pauses or resumes/,
  )
  assert.match(forgingRecord, /An abandoned proposal is rejected or deleted under the notes lifecycle/)
  assert.match(forgingRecord, /creates no duplicate standing-instruction asset/)
  assert.match(forgingRecord, /Report the design owner and status, execution tracker, completed evidence/)

  const corpus = readCorpus('dsh-spec-agent-notes')
  for (const id of [
    'proposal-first-issue-links-active-note',
    'proposal-unavailable-hands-off-inventory',
    'proposal-checkpoint-keeps-partial-moves-complete',
  ]) {
    const scenario = corpus.evals.find((entry) => entry.id === id)
    assert.ok(scenario)
    assert.doesNotMatch(
      scenario.prompt,
      /Make substantial future work|Prepare the proposal for review|update the issue with the proposal link|each note's lifecycle|retention-policy moves/i,
      id + ' prompt leaks its expected solution',
    )
  }
  const first = corpus.evals.find((entry) => entry.id === 'proposal-first-issue-links-active-note')
  const checkpoint = corpus.evals.find((entry) => entry.id === 'proposal-checkpoint-keeps-partial-moves-complete')
  assert.ok(first)
  assert.ok(checkpoint)
  assert.ok(first.assertions.some((assertion) => /proposal links issue\.md.*issue\.md links back/i.test(assertion)))
  assert.ok(
    checkpoint.assertions.some((assertion) =>
      /tracker item.*current note path.*note links back.*own tracker item/i.test(assertion),
    ),
  )
})

test('the capability scenario corpus covers absent and available isolated execution', () => {
  for (const required of REQUIRED) validateCorpus(readCorpus(required.skill), required)
  validateCorpus(readCorpus(FORGE_REQUIRED.skill), FORGE_REQUIRED)
  const browser = readCorpus('dsh-spec-record-browser-gif')
  const missing = browser.evals.find((scenario) => scenario.id === 'missing-capture-capability-hands-off')
  assert.ok(missing)
  assert.deepEqual(missing.capabilities, { browser: false, media: false })
  const real = browser.evals.find((scenario) => scenario.id === 'real-ui-change-uses-one-isolated-run')
  assert.ok(real)
  assert.deepEqual(real.capabilities, { browser: true, media: true })
  const ui = readCorpus('dsh-spec-client-ui-ux')
  const present = ui.evals.find((scenario) => scenario.id === 'capability-present-real-browser')
  assert.ok(present)
  assert.deepEqual(present.capabilities, { browser: true, media: false })
  const absent = ui.evals.find((scenario) => scenario.id === 'missing-rendered-evidence-handoff')
  assert.ok(absent)
  assert.deepEqual(absent.capabilities, { browser: false, media: false })
})

test('find-simplifications binds AGENTS.md authority and trigger near misses', () => {
  const skill = 'dsh-spec-find-simplifications'
  const skillBody = readFileSync(join(REPO_ROOT, 'skills', skill, 'SKILL.md'), 'utf8')
  assert.match(skillBody, /standing instructions: `AGENTS\.md` and any file it cites/)
  assert.doesNotMatch(skillBody, /CLAUDE\.md/)

  const corpus = readCorpus(skill)
  const authority = corpus.evals.find((scenario) => scenario.id === 'agents-md-owns-conflicting-instructions')
  assert.ok(authority)
  const recorded = validateRecordedScenario(skill, authority, authority.id)
  assert.equal(recorded.files?.length, 6)
  assert.match(recorded.expected_output, /sole standing-instruction authority/)
  assert.match(recorded.expected_output, /searches src\/adapters\.ts despite CLAUDE\.md excluding it/)
  assert.match(recorded.expected_output, /unreachable jsonAdapter export/)
  assert.match(recorded.assertions.join('\n'), /does not treat CLAUDE\.md as a second authority/)

  const fixtureRoot = join(EVAL_SOURCE_ROOT, skill, 'evals/files/authority-conflict')
  assert.match(readFileSync(join(fixtureRoot, 'AGENTS.md'), 'utf8'), /\[audit policy\]\(docs\/audit-policy\.md\)/)
  assert.match(readFileSync(join(fixtureRoot, 'docs/audit-policy.md'), 'utf8'), /including `src\/adapters\.ts`/)
  assert.match(readFileSync(join(fixtureRoot, 'CLAUDE.md'), 'utf8'), /`src\/adapters\.ts`.*out of scope/)

  assertTriggerCorpusIdentity(skill)
  const trigger = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.deepEqual(
    trigger.queries.map((entry) => [entry.id, entry.should_trigger]),
    [
      ['dead-code-simplification', true],
      ['ordinary-code-review-near-miss', false],
      ['prose-simplification-near-miss', false],
    ],
  )
  assert.match(trigger.queries[1]?.query ?? '', /only for correctness and security/)
  assert.match(trigger.queries[2]?.query ?? '', /不要审查代码/)
})

test('code-review trigger corpus separates change review from adjacent work', () => {
  const skill = 'dsh-spec-code-review'
  assertTriggerCorpusIdentity(skill)
  const corpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.deepEqual(
    corpus.queries.map((entry) => [entry.id, entry.should_trigger]),
    [
      ['review-pull-request', true],
      ['review-patch-set', true],
      ['review-working-tree', true],
      ['review-project-standards', true],
      ['implement-pagination-near-miss', false],
      ['select-pre-push-near-miss', false],
      ['design-error-contract-near-miss', false],
      ['visual-review-near-miss', false],
    ],
  )
  assert.equal(new Set(corpus.queries.map((entry) => entry.id)).size, corpus.queries.length)
  assert.equal(corpus.queries.filter((entry) => entry.should_trigger).length, 4)
  assert.equal(corpus.queries.filter((entry) => !entry.should_trigger).length, 4)
  assert.match(corpus.queries[0]?.query ?? '', /pull request 42/i)
  assert.match(corpus.queries[1]?.query ?? '', /patch set/i)
  assert.match(corpus.queries[2]?.query ?? '', /staged and unstaged/i)
  assert.match(corpus.queries[3]?.query ?? '', /standing instructions|AGENTS\.md/i)
  assert.match(corpus.queries[4]?.query ?? '', /Add cursor pagination/i)
  assert.match(corpus.queries[5]?.query ?? '', /Only select the commands/i)
  assert.match(corpus.queries[5]?.query ?? '', /Do not inspect or review the diff/i)
  assert.match(corpus.queries[6]?.query ?? '', /stable failure contract/i)
  assert.match(corpus.queries[7]?.query ?? '', /Do not inspect a code change/i)
})

test('code-review trigger evidence binds the current description', () => {
  const skill = 'dsh-spec-code-review'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-27-issue-186/dsh-spec-code-review')
  assertCurrentTriggerEvidence(skill, evidenceRoot, true, 'selected', new Set(), true, true, true)
})

test('the companion scenario corpus covers the default ladder and bounded authorization', () => {
  for (const required of GENERAL_REQUIRED) validateGeneralCorpus(readCorpus(required.skill), required)
})

test('pre-push reliability routing stays independent of the sibling', () => {
  const shipped = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-pre-push-checks/SKILL.md'), 'utf8')
  const bullet = /^- \*\*Asynchronous or resource-owning tests:\*\*.*$/m.exec(shipped)?.[0]
  assert.ok(bullet)
  const requirement = bullet.indexOf("project's applicable test-reliability requirements")
  const evidence = bullet.indexOf('restoration, negative-control, quiescent-teardown or concurrent-process evidence')
  const sibling = bullet.indexOf('(when available, consider using the dsh-spec-ci-test-reliability skill)')
  assert.ok(requirement >= 0 && evidence > requirement && sibling > evidence, bullet)
  const withoutSibling = bullet.replace(' (when available, consider using the dsh-spec-ci-test-reliability skill)', '')
  assert.match(withoutSibling, /project's applicable test-reliability requirements/i)
  assert.match(withoutSibling, /restoration, negative-control, quiescent-teardown or concurrent-process evidence/i)
  assert.match(withoutSibling, /This skill still selects the commands/)
  assert.doesNotMatch(withoutSibling, /dsh-spec-ci-test-reliability/)

  const corpus = readCorpus('dsh-spec-pre-push-checks')
  const present = corpus.evals.find((scenario) => scenario.id === 'route-test-reliability-with-sibling')
  const absent = corpus.evals.find((scenario) => scenario.id === 'route-test-reliability-without-sibling')
  assert.ok(present && absent)
  assert.deepEqual(present.files, absent.files)
  assert.equal(present.change_patch, absent.change_patch)
  assert.equal(present.change_root, absent.change_root)
  assert.deepEqual(present.assertions.slice(0, 3), absent.assertions.slice(0, 3))
  const assertPromptsHideGradedOutcomes = (scenarios: Scenario[]) => {
    assert.doesNotMatch(
      scenarios.map((scenario) => scenario.prompt).join('\n'),
      /full suite|owning worker test|applicable test-reliability requirements|restoration|negative-control|quiescent-teardown|concurrent-process|optional guidance|does not copy/i,
    )
  }
  assertPromptsHideGradedOutcomes([present, absent])
  assert.throws(() =>
    assertPromptsHideGradedOutcomes([present, { ...absent, prompt: `${absent.prompt} Leave the full suite to CI.` }]),
  )
})

test('translation target migration scenarios keep concrete policy semantics', () => {
  const corpus = readCorpus('dsh-spec-translate-docs')
  const byId = new Map(corpus.evals.map((scenario) => [scenario.id, scenario]))
  const requirements = [
    {
      id: 'explicit-multiple-targets-handoff',
      signature: /explicitly selects Chinese and Japanese/i,
      assertion: /No counterpart or aggregate record is created/i,
    },
    {
      id: 'progressive-target-addition-single-source',
      signature: /Update .*first\.md.*target-addition policy.*docs\/new\.md/i,
      assertion: /untouched source remains unchanged/i,
    },
    {
      id: 'target-removal-active-scope',
      signature: /eligible active docs/i,
      assertion: /archived Japanese document remains unchanged/i,
    },
    {
      id: 'range-operation-does-not-create-missing-target',
      signature: /ordinary range check and record commands/i,
      assertion: /No missing Japanese counterpart is created/i,
    },
    {
      id: 'source-rename-keeps-pair',
      signature: /rename docs\/old-guide\.md to docs\/new-guide\.md/i,
      assertion: /aggregate record follows the renamed source/i,
    },
    {
      id: 'briefing-is-delta-plus-style-source',
      signature: /declared docs\/style\.md/i,
      assertion: /briefing is treated as the change-local delta plus rules/i,
    },
  ]
  for (const requirement of requirements) {
    const scenario = byId.get(requirement.id)
    assert.ok(scenario, 'missing translation migration scenario ' + requirement.id)
    assert.match(JSON.stringify(scenario), requirement.signature)
    assert.match(scenario.assertions.join('\n'), requirement.assertion)
  }
})

test('stacked-PR refresh evidence covers rerere safety and the rebase default', () => {
  const scenario = readCorpus('dsh-spec-merging-stacked-prs').evals.find(
    (entry) => entry.id === 'refresh-stack-with-rerere',
  )
  assert.ok(scenario, 'missing stacked-PR refresh scenario')
  assert.match(scenario.expected_output, /rerere\.autoUpdate.*unset or false/i)
  assert.match(scenario.assertions.join('\n'), /native cascading rebase/i)
  assert.match(scenario.assertions.join('\n'), /does not require an author request/i)
  const skill = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-merging-stacked-prs/SKILL.md'), 'utf8')
  assert.match(skill, /need not be the repository default branch/i)
  assert.match(skill, /native stack also requires linear history/i)
  assert.match(skill, /gh pr checks <pr> --required/i)
})

test('the companion scenario corpus fails closed when evidence is missing', () => {
  const required = GENERAL_REQUIRED[0]
  assert.throws(() => validateGeneralCorpus({ skill_name: required.skill, evals: [] }, required), /empty eval corpus/)
  const evidenceFree = readCorpus(required.skill)
  evidenceFree.evals[0].assertions = []
  assert.throws(() => validateGeneralCorpus(evidenceFree, required), /assertions must not be empty/)
  const meaningless = readCorpus(required.skill)
  meaningless.evals[0].prompt = 'Do something useful.'
  meaningless.evals[0].expected_output = 'The task succeeded.'
  meaningless.evals[0].assertions = ['The result looks good.']
  assert.throws(() => validateGeneralCorpus(meaningless, required), /must preserve/)

  const prePushRequired = GENERAL_REQUIRED.find((profile) => profile.skill === 'dsh-spec-pre-push-checks')
  assert.ok(prePushRequired)
  const missingInstall = readCorpus(prePushRequired.skill)
  const present = missingInstall.evals.find((scenario) => scenario.id === 'route-test-reliability-with-sibling')
  assert.ok(present)
  delete present.install
  assert.throws(
    () => validateGeneralCorpus(missingInstall, prePushRequired),
    /must preserve the declared sibling installation/,
  )
})

test('completion evidence and handoff evidence are both present for absent capabilities', () => {
  for (const required of REQUIRED) {
    const corpus = readCorpus(required.skill)
    const noIsolation = corpus.evals.filter((scenario) => required.noIsolationIds.includes(scenario.id))
    assert.ok(
      noIsolation.some((scenario) =>
        scenario.assertions.some((assertion) => /complete|completes|success|validation|check/i.test(assertion)),
      ),
      required.skill + ' needs a no-isolation completion path',
    )
    assert.ok(
      noIsolation.some((scenario) => required.handoffIds.includes(scenario.id)),
      required.skill + ' needs a no-isolation handoff path',
    )
  }
})

test('development eval corpora stage into a temporary skill with the official layout', (t) => {
  for (const required of ALL_REQUIRED) {
    const { temporaryRoot, skillRoot } = stageSkillWithEvals(required.skill)
    t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }))
    assert.equal(skillRoot.split(sep).at(-1), required.skill)
    assert.equal(
      readFileSync(join(skillRoot, 'evals', 'evals.json'), 'utf8'),
      readFileSync(scenarioPath(required.skill), 'utf8'),
      required.skill + ' staged a different corpus',
    )
    const corpus = readCorpus(required.skill)
    for (const scenario of corpus.evals) {
      for (const file of scenario.files ?? []) {
        assertInputFile(skillRoot, file, scenario.id)
        const sibling = /\/\.agents\/skills\/([^/]+)\/scripts\/[^/]+$/.exec(file)?.[1]
        if (sibling !== undefined) {
          assert.ok(
            existsSync(
              join(skillRoot, file.slice(0, file.indexOf('/.agents/skills/')), '.agents/skills', sibling, 'scripts'),
            ),
            scenario.id + ' stages an incomplete ' + sibling + ' installation',
          )
        }
      }
    }
    assert.equal(existsSync(join(REPO_ROOT, 'skills', required.skill, 'evals')), false, required.skill + ' ships evals')
    assert.equal(
      existsSync(join(REPO_ROOT, '.agents', 'skills', required.skill, 'evals')),
      false,
      required.skill + ' installs evals',
    )
    const gate = spawnSync(
      process.execPath,
      [join(REPO_ROOT, 'skills', 'dsh-spec-skill-forge', 'scripts', 'verify-skill-spec.mjs'), skillRoot],
      { encoding: 'utf8' },
    )
    assert.equal(gate.status, 0, (gate.stdout ?? '') + (gate.stderr ?? ''))
  }
})

test('the translation fixture starts as a consistent existing pair', (t) => {
  const { temporaryRoot, skillRoot } = stageSkillWithEvals('dsh-spec-translate-docs')
  t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }))
  const script = join(skillRoot, 'scripts/translate-pair.mjs')
  const result = spawnSync(
    process.execPath,
    [script, 'check', 'docs/guide.md', '--target', 'zh=中文', '--root', 'evals/files/vendor'],
    {
      cwd: skillRoot,
      encoding: 'utf8',
    },
  )
  assert.equal(result.status, 0, (result.stdout ?? '') + (result.stderr ?? ''))
  assert.match(result.stdout ?? '', /1 pair\(s\) consistent/)
})

test('an empty or evidence-free capability corpus fails closed', () => {
  const required = REQUIRED[0]
  assert.throws(() => validateCorpus({ skill_name: required.skill, evals: [] }, required), /empty eval corpus/)
  const evidenceFree = readCorpus(required.skill)
  evidenceFree.evals[0].assertions = []
  assert.throws(() => validateCorpus(evidenceFree, required), /assertions must not be empty/)
  const blankEvidence = readCorpus(required.skill)
  blankEvidence.evals[0].assertions = ['   ']
  assert.throws(() => validateCorpus(blankEvidence, required), /assertions must not be blank/)
  const nonArrayEvidence = readCorpus(required.skill)
  const malformedScenario = nonArrayEvidence.evals[0] as { assertions: unknown }
  malformedScenario.assertions = 'not an array'
  assert.throws(() => validateCorpus(nonArrayEvidence, required), /assertions must be an array/)
})

test('the forge requires selective evaluation coverage', () => {
  const forge = readFileSync(join(REPO_ROOT, 'skills', 'dsh-spec-skill-forge', 'SKILL.md'), 'utf8')
  assert.match(forge, /A natural-language requirement central to the forged skill carries a development eval scenario/)
  assert.match(forge, /Model evals run when the owned behavior changes and remain outside the delivered skill/)
})

test('the forge eval covers capability preference, fallback and a bounded handoff', () => {
  const corpus = readCorpus(FORGE_REQUIRED.skill)
  const scenario = corpus.evals.find((entry) => entry.id === FORGE_REQUIRED.ids[0])
  assert.ok(scenario)
  assert.match(scenario.prompt, /isolated execution/)
  assert.match(scenario.expected_output, /optional mechanism/)
  assert.match(scenario.expected_output, /fallback or explicit handoff/)
  assert.ok(scenario.assertions.some((assertion) => /resumable next step/.test(assertion)))
})

test('the forge eval derives descriptions from real trigger boundaries', () => {
  const corpus = readCorpus(FORGE_REQUIRED.skill)
  const scenario = corpus.evals.find((entry) => entry.id === 'description-derived-from-role-triggers-and-exclusions')
  assert.ok(scenario)
  assert.match(scenario.prompt, /catalog description and body boundary agree/i)
  assert.match(scenario.prompt, /body boundary agree/i)
  assert.match(scenario.prompt, /near-miss selection query/i)
  assert.match(scenario.expected_output, /role, trigger, and exclusion projection/i)
  assert.match(scenario.expected_output, /including security approval and incident response/i)
  const assertions = scenario.assertions.join('\n')
  assert.match(assertions, /body agree/i)
  assert.match(assertions, /execution detail/i)
  assert.match(assertions, /near-miss query/i)
  assert.match(assertions, /audit work versus execution or ownership/i)
})

test('the forge catalog description fits the repository budget', () => {
  const skill = readFileSync(join(REPO_ROOT, 'skills', 'dsh-spec-skill-forge', 'SKILL.md'), 'utf8')
  const description = /^description:\s*"(.+)"$/m.exec(skill)?.[1]
  assert.ok(description)
  assert.ok(description.length <= 500, `${description.length} description characters`)
  assert.equal(
    Array.from(description).some((character) => (character.codePointAt(0) as number) > 0xffff),
    false,
  )
  assert.match(description, /creating, rewriting, or migrating a whole Agent Skill/i)
  assert.match(description, /changing prompt or instruction text.*role and structure stay settled/i)
  assert.match(
    skill,
    /The forge owns creating, rewriting or migrating a whole Agent Skill.*Within an existing Agent Skill, changing only prompt or instruction text while that skill's role and structure stay settled uses the project's prompt requirements/,
  )
})

test('forge trigger corpus separates skill authoring from adjacent work', () => {
  const skill = 'dsh-spec-skill-forge'
  assertTriggerCorpusIdentity(skill)
  const corpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.deepEqual(
    corpus.queries.map((query) => [query.id, query.should_trigger]),
    [
      ['forge-from-source-material', true],
      ['rewrite-whole-agent-skill', true],
      ['rewrite-drifted-skill-description', true],
      ['migrate-legacy-skill', true],
      ['repair-agent-skill-structure', true],
      ['package-repeated-agent-playbook', true],
      ['tighten-overbroad-agent-capability', true],
      ['install-published-skill', false],
      ['use-installed-skill', false],
      ['reshape-skill-instructions', false],
      ['edit-unrelated-system-prompt', false],
      ['openapi-description-near-miss', false],
      ['review-runtime-code', false],
      ['tool-definition-near-miss', false],
    ],
  )
  assert.equal(new Set(corpus.queries.map((query) => query.id)).size, corpus.queries.length)
  for (const query of corpus.queries) {
    assertNonEmptyString(query.id, 'forge trigger id')
    assertNonEmptyString(query.query, query.id + ' trigger query')
  }
})

test('forge description evidence binds the behavior scenario and trigger corpus', () => {
  const skill = 'dsh-spec-skill-forge'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-pr154', skill)
  const scenario = readCorpus(skill).evals.find(
    (entry) => entry.id === 'description-derived-from-role-triggers-and-exclusions',
  )
  assert.ok(scenario)

  const root = join(evidenceRoot, scenario.id)
  assertEvidencePath(evidenceRoot, root, scenario.id, 'directory')
  const status = readFileSync(join(root, 'status.txt'), 'utf8')
  assert.match(status, /^status: pass$/m)
  assert.match(status, /^run_exit_code: 0$/m)
  assert.match(status, /^assertions: 5\/5$/m)
  assert.deepEqual(
    readFileSync(join(root, 'assertions.txt'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.replace(/^PASS /, '')),
    scenario.assertions,
  )
  const recorded = validateRecordedScenario(
    skill,
    JSON.parse(readFileSync(join(root, 'scenario-definition.json'), 'utf8')),
    scenario.id,
  )
  assert.deepEqual(recorded, scenario)
  assert.equal(
    readFileSync(join(root, 'scenario-definition.sha256'), 'utf8').trim(),
    `${scenarioDefinitionHash(recorded)}  ${skill}:${scenario.id}`,
  )
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'capabilities.json'), 'utf8')), {
    auth: 'host-proxy',
    browser: false,
    media: false,
    sandbox: 'workspace-write',
    subagents: false,
  })
  assertBehaviorSkillProvenance(root, skill)
  assertAnswerBlindTraceWithSkillOutput(root, skill)
  assert.ok(traceCommandsFor(root).some((command) => commandPrintsSkill(command, skill)))
  assert.equal(replayEvidencePatch(root, skill, scenario), true)
  assertCurrentTriggerEvidence(skill, evidenceRoot, true)
})

test('agent-experience evidence binds prompt behavior and the forge selection boundary', () => {
  const skill = 'dsh-spec-agent-experience'
  const skillText = readFileSync(join(REPO_ROOT, 'skills', skill, 'SKILL.md'), 'utf8')
  const description = /^description:\s*"(.+)"$/m.exec(skillText)?.[1]
  assert.ok(description)
  assert.ok(description.length <= 500, `${description.length} agent-experience description characters`)
  assert.equal(
    Array.from(description).some((character) => (character.codePointAt(0) as number) > 0xffff),
    false,
  )
  assert.match(description, /an existing Agent Skill's instruction text/i)
  assert.match(description, /Not for creating, rewriting, or migrating a whole Agent Skill/i)
  assert.match(skillText, /Own prompt text, not whole-skill design/)
  assert.match(skillText, /This skill shapes prompt and instruction text/)
  assert.match(
    skillText,
    /For an existing Agent Skill, it applies once the skill's role and structure are settled.*Creating, rewriting or migrating a whole Agent Skill.*outside this skill/,
  )
  const corpus = readCorpus(skill)
  assert.deepEqual(
    corpus.evals.map((scenario) => scenario.id),
    [
      'minimal-context-and-explicit-discovery',
      'tool-parameter-rules-stay-with-parameters',
      'bounded-results-with-local-context-and-retrieval',
    ],
  )

  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue148', skill)
  for (const scenario of corpus.evals) {
    const root = join(evidenceRoot, scenario.id)
    assertEvidencePath(evidenceRoot, root, scenario.id, 'directory')
    const status = readFileSync(join(root, 'status.txt'), 'utf8')
    assert.match(status, /^status: pass$/m)
    assert.match(status, /^run_exit_code: 0$/m)
    assert.match(status, /^assertions: 5\/5$/m)
    assertExpectedAssertions(root, scenario.assertions, scenario.id)
    assert.deepEqual(
      readFileSync(join(root, 'assertions.txt'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.replace(/^PASS /, '')),
      scenario.assertions,
    )
    const recorded = validateRecordedScenario(
      skill,
      JSON.parse(readFileSync(join(root, 'scenario-definition.json'), 'utf8')),
      scenario.id,
    )
    assert.deepEqual(recorded, scenario)
    assert.equal(
      readFileSync(join(root, 'scenario-definition.sha256'), 'utf8').trim(),
      `${scenarioDefinitionHash(recorded)}  ${skill}:${scenario.id}`,
    )
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'capabilities.json'), 'utf8')), {
      auth: 'host-proxy',
      browser: false,
      media: false,
      sandbox: 'workspace-write',
      subagents: false,
    })
    assertBehaviorSkillProvenance(root, skill)
    assertAnswerBlindTraceWithSkillOutput(root, skill)
    assert.ok(traceCommandsFor(root).some((command) => commandPrintsSkill(command, skill)))
    assert.equal(replayEvidencePatch(root, skill, scenario), true)
  }
  assertCurrentTriggerEvidence(skill, evidenceRoot, true)
})

test('agent-experience trigger corpus covers prompt surfaces and adjacent work', () => {
  const skill = 'dsh-spec-agent-experience'
  assertTriggerCorpusIdentity(skill)
  const corpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.deepEqual(
    corpus.queries.map((query) => [query.id, query.should_trigger]),
    [
      ['rewrite-system-prompt-for-discovery', true],
      ['place-tool-parameter-rules', true],
      ['reshape-skill-instructions', true],
      ['reduce-context-loading-overhead', true],
      ['shorten-multi-step-workflow-context', true],
      ['create-whole-agent-skill', false],
      ['rewrite-whole-agent-skill', false],
      ['trim-readme-prose', false],
      ['review-code-only', false],
    ],
  )
  assert.match(corpus.queries[0]?.query ?? '', /system prompt/i)
  assert.match(corpus.queries[1]?.query ?? '', /tool definition/i)
  assert.match(corpus.queries[2]?.query ?? '', /instructions.*Agent Skill/i)
  assert.match(corpus.queries[3]?.query ?? '', /context-loading instructions/i)
  assert.match(corpus.queries[4]?.query ?? '', /workflow steps/i)
  assert.match(corpus.queries[5]?.query ?? '', /new Agent Skill.*forge the complete package/i)
  assert.match(corpus.queries[6]?.query ?? '', /complete Agent Skill.*re-evaluate the whole skill/i)
  assert.match(corpus.queries[7]?.query ?? '', /prose/i)
  assert.match(corpus.queries[8]?.query ?? '', /Review .* only for correctness/i)
})

test('overlap triggers route whole-skill work and settled instruction text to different owners', () => {
  const readQueries = (skill: string) =>
    (
      JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
        queries: Array<{ id: string; query: string; should_trigger: boolean }>
      }
    ).queries
  const agentQueries = readQueries('dsh-spec-agent-experience')
  const forgeQueries = readQueries('dsh-spec-skill-forge')
  for (const [id, agentExpected, forgeExpected] of [
    ['reshape-skill-instructions', true, false],
    ['rewrite-whole-agent-skill', false, true],
  ] as const) {
    const agent = agentQueries.find((query) => query.id === id)
    const forge = forgeQueries.find((query) => query.id === id)
    assert.ok(agent && forge, id + ' overlap query is missing')
    assert.equal(agent.query, forge.query, id + ' overlap query differs between corpora')
    assert.equal(agent.should_trigger, agentExpected, id + ' agent-experience expectation')
    assert.equal(forge.should_trigger, forgeExpected, id + ' forge expectation')
    const agentFinal = readFileSync(
      join(
        REPO_ROOT,
        'tests/skill-evals/evidence/2026-11-26-issue148/dsh-spec-agent-experience/trigger',
        id,
        'final.md',
      ),
      'utf8',
    )
    const forgeFinal = readFileSync(
      join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-pr154/dsh-spec-skill-forge/trigger', id, 'final.md'),
      'utf8',
    )
    assert.equal(
      agentFinal.trim().split('\n').at(-1),
      agentExpected ? 'SELECT: dsh-spec-agent-experience' : 'SELECT: none',
      id + ' agent-experience evidence',
    )
    assert.equal(
      forgeFinal.trim().split('\n').at(-1),
      forgeExpected ? 'SELECT: dsh-spec-skill-forge' : 'SELECT: none',
      id + ' forge evidence',
    )
  }
})

test('error handling description, body and triggers cover embedded and batch failures', () => {
  const skillText = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-error-handling/SKILL.md'), 'utf8')
  const description = /^description:\s*"(.+)"$/m.exec(skillText)?.[1]
  assert.ok(description)
  assert.ok(description.length <= 500, `${description.length} error-handling description characters`)
  assert.equal(
    Array.from(description).some((character) => (character.codePointAt(0) as number) > 0xffff),
    false,
  )
  assert.match(description, /services, embedded systems, and batch systems/)
  assert.match(
    skillText,
    /Define failures, their owners, and what remains safe after failure in applications, libraries, command-line tools, services, embedded systems, and batch systems\./,
  )
  const corpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', 'trigger-evals.json'), 'utf8'),
  ) as {
    skill_name: string
    agent_file: string
    queries: Array<{ id: string; query: string; should_trigger: boolean; files?: string[] }>
  }
  assert.equal(corpus.skill_name, 'dsh-spec-error-handling')
  assertNonEmptyString(corpus.agent_file, 'trigger agent file')
  assert.ok(corpus.agent_file.startsWith('trigger-fixtures/'))
  assert.ok(existsSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', corpus.agent_file)))
  assert.deepEqual(
    corpus.queries.map((entry) => [entry.id, entry.should_trigger]),
    [
      ['worker-loses-variant', true],
      ['cleanup-catch-scope', true],
      ['provider-status-mapping', true],
      ['cli-exit-handling', true],
      ['visible-unknown-outcome', true],
      ['embedded-state-after-fault', true],
      ['batch-partial-failure', true],
      ['readme-prose-only', false],
      ['unit-assertion-diff', false],
      ['add-pagination', false],
      ['build-performance', false],
      ['rename-variable', false],
      ['log-level-only', false],
    ],
  )
  assert.equal(corpus.queries.length, 13)
  assert.equal(new Set(corpus.queries.map((entry) => entry.id)).size, corpus.queries.length)
  assert.equal(corpus.queries.filter((entry) => entry.should_trigger).length, 7)
  assert.equal(corpus.queries.filter((entry) => !entry.should_trigger).length, 6)
  assert.match(
    corpus.queries.find((entry) => entry.id === 'embedded-state-after-fault')?.query ?? '',
    /embedded.*failure identity.*safe state.*recovery owner.*device-visible report/i,
  )
  assert.match(
    corpus.queries.find((entry) => entry.id === 'batch-partial-failure')?.query ?? '',
    /operation outcome.*per-record failure identity.*retry ownership.*partial-failure report/i,
  )
  assert.match(
    corpus.queries.find((entry) => entry.id === 'log-level-only')?.query ?? '',
    /startup log message.*keep.*log level.*behavior unchanged/i,
  )
  for (const entry of corpus.queries) {
    assertNonEmptyString(entry.id, 'trigger eval id')
    assertNonEmptyString(entry.query, entry.id + ' trigger query')
    for (const file of entry.files ?? []) {
      assert.ok(file.startsWith('trigger-fixtures/'), entry.id + ' fixture escapes trigger-fixtures')
      const absolute = join(EVAL_SOURCE_ROOT, 'dsh-spec-error-handling', file)
      assert.ok(existsSync(absolute), entry.id + ' fixture is missing: ' + file)
      assert.ok(statSync(absolute).size > 0, entry.id + ' fixture is empty: ' + file)
    }
  }
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue-147/dsh-spec-error-handling')
  assertCurrentTriggerEvidence('dsh-spec-error-handling', evidenceRoot, true, 'read-skill')
})

test('error handling current behavior evidence binds the affected scenarios', () => {
  const skill = 'dsh-spec-error-handling'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue-147/dsh-spec-error-handling')
  const corpus = readCorpus(skill)
  for (const id of [
    'existing-project-identity-remains-authoritative',
    'silent-handler-covers-one-safe-failure',
    'worker-boundary-preserves-failure-identity',
  ]) {
    const scenario = corpus.evals.find((entry) => entry.id === id)
    assert.ok(scenario, id + ' is missing from the current error-handling corpus')
    assertCurrentBehaviorEvidence(join(evidenceRoot, id), skill, scenario)
  }
})

test('speed-up-perf trigger corpus routes runtime paths and excludes adjacent work', () => {
  const skill = 'dsh-spec-speed-up-perf'
  assertTriggerCorpusIdentity(skill)
  const corpus = JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, skill, 'trigger-evals.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.deepEqual(
    corpus.queries.map((query) => query.id),
    [
      'backend-p95',
      'browser-input-delay',
      'cli-startup',
      'end-to-end-upload',
      'memory-growth',
      'benchmark-gate-profile',
      'ci-port-flake',
      'slow-test-fixtures',
      'coverage-only',
      'pre-push-selection',
      'visual-review',
      'general-code-review',
      'capacity-model',
    ],
  )
  assert.equal(corpus.queries.filter((query) => query.should_trigger).length, 6)
  assert.equal(corpus.queries.filter((query) => !query.should_trigger).length, 7)
  assert.match(
    corpus.queries.find((query) => query.id === 'benchmark-gate-profile')?.query ?? '',
    /benchmark.*gate.*profiling plan/i,
  )
  assert.match(corpus.queries.find((query) => query.id === 'capacity-model')?.query ?? '', /how many tenants/i)
})

test('error handling historical evidence retains candidate, baseline and trigger traces', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr113')
  const candidateSkillHash = readSkillTreeManifest(join(evidenceRoot, 'skills-tree.sha256')).get(
    'skills/dsh-spec-error-handling/SKILL.md',
  )
  assert.match(candidateSkillHash ?? '', /^[0-9a-f]{64}$/, 'error handling evidence has no candidate skill revision')
  const scenarios = ['existing-identity', 'message-only', 'numeric-no-cause', 'silent-handler', 'worker-boundary']
  for (const scenario of scenarios) {
    for (const profile of ['baseline', 'previous', 'candidate']) {
      const run = join(evidenceRoot, profile + '-' + scenario)
      const final = readFileSync(join(run, 'final.md'), 'utf8')
      const status = readFileSync(join(run, 'status.txt'), 'utf8')
      assert.ok(final.trim().length > 0, run + ' must retain a final response')
      assert.match(status, /^assertions: \d\/\d$/m)
      if (profile !== 'previous' || scenario !== 'silent-handler') {
        assert.match(status, /^status: pass$/m)
        assert.match(status, /^assertions: 4\/4$/m)
      } else {
        assert.match(status, /^status: fail$/m)
        assert.match(status, /^assertions: 2\/4$/m)
      }
    }
  }

  const triggerRoot = join(evidenceRoot, 'trigger')
  const triggerInputs = new Map(
    readFileSync(join(evidenceRoot, 'trigger-input.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const entry = parseHashPath(line, 'error handling trigger input')
        return [entry.path, entry.hash] as const
      }),
  )
  assert.deepEqual(
    [...triggerInputs].sort(([left], [right]) => left.localeCompare(right)),
    [
      [
        'tests/skill-evals/dsh-spec-error-handling/trigger-evals.json',
        '5e0359c35e91888ad872f6cfdaabb539961ca1078ffc04206a5ebbb22fc0d888',
      ],
      [
        'tests/skill-evals/dsh-spec-error-handling/trigger-fixtures/AGENTS.md',
        '5fb6adb893006d0f847b9fc10698fb190a5c7cecaa9d6380c7e7496c12bd8961',
      ],
      [
        triggerSurfacePath('dsh-spec-error-handling'),
        '9921fb9af3ba8c68c839bb3c6a1186faa578811925410d713673baa5d17b64cb',
      ],
    ].sort(([left], [right]) => left.localeCompare(right)),
    'historical error handling trigger inputs changed',
  )
  const matrixLines = readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8').trim().split('\n')
  assert.equal(matrixLines[0], 'id\tshould_trigger\tread_skill\tresult')
  const matrix = new Map(
    matrixLines.slice(1).map((line) => {
      const [id, shouldTrigger, readSkill, result] = line.split('\t')
      assert.ok(id && shouldTrigger && readSkill && result, 'malformed trigger matrix row: ' + line)
      return [id, { shouldTrigger, readSkill, result }] as const
    }),
  )
  const historicalQueries = [
    ['worker-loses-variant', true],
    ['cleanup-catch-scope', true],
    ['provider-status-mapping', true],
    ['cli-exit-handling', true],
    ['visible-unknown-outcome', true],
    ['readme-prose-only', false],
    ['unit-assertion-diff', false],
    ['add-pagination', false],
    ['build-performance', false],
    ['rename-variable', false],
  ] as const
  assert.equal(matrix.size, historicalQueries.length)
  for (const [id, shouldTrigger] of historicalQueries) {
    const row = matrix.get(id)
    assert.ok(row, 'missing trigger matrix row ' + id)
    assert.equal(row.shouldTrigger, String(shouldTrigger))
    const trace = readFileSync(join(triggerRoot, id, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string; command?: string; exit_code?: number | null; sha256?: string })
    const skillEvents = trace.filter((entry) => entry.type === 'skill')
    assert.equal(skillEvents.length, 1, id + ' trace context must identify the skill revision used')
    assert.equal(skillEvents[0]?.sha256, candidateSkillHash)
    const readSkill = trace.some(
      (entry) =>
        entry.type === 'command' &&
        entry.exit_code === 0 &&
        commandReadsSkill(entry.command, 'dsh-spec-error-handling'),
    )
    assert.equal(row.readSkill, String(readSkill), id + ' trace disagrees with the matrix')
    assert.equal(row.result, shouldTrigger === readSkill ? 'pass' : 'fail')
    assert.equal(row.result, 'pass', id + ' has the wrong trigger result')
    assert.ok(
      trace.some((entry) => entry.type === 'turn.completed'),
      id + ' trace lacks usage',
    )
    assert.ok(readFileSync(join(triggerRoot, id, 'final.md'), 'utf8').trim().length > 0)
    assert.ok(readFileSync(join(triggerRoot, id, 'stderr.log'), 'utf8').trim().length > 0)
  }
  assert.doesNotMatch(
    readFileSync(join(triggerRoot, 'visible-unknown-outcome', 'final.md'), 'utf8'),
    /stderr\.log|events\.jsonl/,
  )
})

test('web UI trigger corpus keeps positive and near-miss coverage', () => {
  const corpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', 'trigger-evals.json'), 'utf8'),
  ) as {
    skill_name: string
    agent_file: string
    queries: Array<{ id: string; query: string; should_trigger: boolean }>
  }
  assert.equal(corpus.skill_name, 'dsh-spec-client-ui-ux')
  assert.equal(corpus.queries.length, 12)
  assert.equal(new Set(corpus.queries.map((entry) => entry.id)).size, corpus.queries.length)
  assert.equal(corpus.queries.filter((entry) => entry.should_trigger).length, 6)
  assert.equal(corpus.queries.filter((entry) => !entry.should_trigger).length, 6)
  assert.ok(existsSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', corpus.agent_file)))
  const skill = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-client-ui-ux/SKILL.md'), 'utf8')
  assert.match(skill, /State authenticity:.*real interaction or state mechanism/)
  assert.match(skill, /forced class, data attribute, debug overlay, or copied style/)
  assert.match(skill, /concrete resumable action naming the environment, scene, or artifact/)
  assert.doesNotMatch(skill, /组件消费者/)
  for (const entry of corpus.queries) {
    assertNonEmptyString(entry.id, 'Web UI trigger eval id')
    assertNonEmptyString(entry.query, entry.id + ' trigger query')
  }
})

test('web UI spacing grouping and overlay fit requirements remain explicit', () => {
  const skill = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-client-ui-ux/SKILL.md'), 'utf8')
  const spacing = readFileSync(join(REPO_ROOT, 'skills/dsh-spec-client-ui-ux/references/spacing.md'), 'utf8')
  assert.match(skill, /object and action groups at each nesting level/i)
  assert.match(
    skill,
    /compare the separation within each group with the separation between comparable neighboring groups/i,
  )
  assert.match(skill, /heading closer to its own content than to a preceding group/i)
  assert.match(skill, /padding, borders, line boxes and glyph whitespace/i)
  assert.match(skill, /outside click and on Escape when it is focusable/i)
  assert.match(skill, /fit the supported viewport with the project's edge margin/i)
  assert.match(skill, /Flip only into a side that fits/i)
  assert.match(skill, /repeated back-and-forth oscillation/i)
  assert.match(spacing, /greater separation between groups than within them/i)
  assert.match(spacing, /heading must remain closer to its own content than to the preceding group/i)
  assert.match(spacing, /CSS margins, box-area ratios or one spacing token/i)
  assert.doesNotMatch(`${skill}\n${spacing}`, /portal to body|React component|Toast/i)
})

test('web UI historical model evidence and trigger traces stay auditable', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr114')
  const evidenceReadme = readFileSync(join(evidenceRoot, 'README.md'), 'utf8')
  assert.match(evidenceReadme, /^> \*\*Historical status:\*\* these runs predate/m)
  const recordedSkillHash = /^Skill file SHA-256: `([0-9a-f]{64})`\.$/m.exec(evidenceReadme)?.[1]
  assert.ok(recordedSkillHash, 'Web UI evidence does not record its skill revision')
  const behaviorRuns = [
    ['candidate-shared-widget', true, 'shared-widget-consumer-coverage', 'pass', 5],
    ['candidate-missing-render', true, 'missing-rendered-evidence-handoff', 'pass', 4],
    ['baseline-screenshot-pair', false, 'project-declares-equivalent-evidence', 'fail', 4],
    ['candidate-screenshot-pair', true, 'project-declares-equivalent-evidence', 'pass', 4],
    ['candidate-capability-present', true, 'capability-present-real-browser', 'pass', 4],
  ] as const
  const scenarios = new Map(
    (
      JSON.parse(readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', 'evals', 'evals.json'), 'utf8')) as {
        evals: Array<{ id: string; files?: string[]; assertions: string[] }>
      }
    ).evals.map((scenario) => [scenario.id, scenario]),
  )

  for (const [runName, candidate, scenarioId, status, assertionCount] of behaviorRuns) {
    const run = join(evidenceRoot, runName)
    const scenario = scenarios.get(scenarioId)
    assert.ok(scenario, 'missing scenario ' + scenarioId)
    assert.equal(scenario.assertions.length, assertionCount)
    assert.ok(readFileSync(join(run, 'final.md'), 'utf8').trim().length > 0)
    const body = readFileSync(join(run, 'status.txt'), 'utf8')
    assert.match(body, new RegExp('^status: ' + status + '$', 'm'))
    const graded = readFileSync(join(run, 'assertions.txt'), 'utf8').trim().split('\n').filter(Boolean)
    assert.equal(graded.length, assertionCount, runName + ' assertion count')
    assert.deepEqual(
      graded.map((line) => line.replace(/^(?:PASS|FAIL) /, '')),
      scenario.assertions,
      runName + ' assertion text differs from the canonical scenario',
    )
    const passedAssertions = graded.filter((line) => /^PASS /.test(line)).length
    if (status === 'pass') assert.equal(passedAssertions, assertionCount)
    else assert.ok(passedAssertions < assertionCount, runName + ' has no failed assertion')

    const manifest = readFileSync(join(run, 'input-manifest.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => /^([0-9a-f]{64})  (.+?)(?:  mode=[0-7]{4})?$/.exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => ({ hash: match[1], path: match[2] }))
    assert.equal(manifest.length, scenario.files?.length ?? 0, runName + ' input manifest')
    assert.deepEqual(
      manifest.map((entry) => entry.path).sort(),
      [...(scenario.files ?? [])].sort(),
      runName + ' does not cover the scenario files',
    )
    for (const entry of manifest) assert.match(entry.hash, /^[0-9a-f]{64}$/, runName + ' malformed input hash')

    const traceText = readFileSync(join(run, 'trace.jsonl'), 'utf8')
    const trace = traceText
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string
            sha256?: string
            path?: string
            item?: { type?: string; command?: string; exit_code?: number }
          },
      )
    const skillReads = trace.filter(
      (entry) =>
        entry.type === 'item.completed' &&
        entry.item?.type === 'command_execution' &&
        entry.item.exit_code === 0 &&
        commandReadsSkill(entry.item.command, 'dsh-spec-client-ui-ux'),
    )
    const skillEvents: typeof trace = trace.filter(
      (entry) => entry.type === 'skill' && entry.sha256 === recordedSkillHash,
    )
    assert.equal(
      skillReads.length > 0 || skillEvents.length > 0,
      candidate,
      runName + (candidate ? ' did not read its candidate skill' : ' read the skill it was testing'),
    )
    assert.equal(trace.filter((entry) => entry.type === 'turn.completed').length, 1)
    for (const entry of trace.filter((candidate) => candidate.type === 'stderr')) {
      assert.ok(entry.path, runName + ' stderr entry lacks a path')
      assert.ok(readFileSync(join(run, entry.path), 'utf8').trim().length > 0, runName + ' stderr is empty')
    }

    if (scenarioId === 'capability-present-real-browser') {
      assert.doesNotMatch(traceText, /browser-skill|\bbsk\b/i)
      const artifacts = readFileSync(join(run, 'artifacts.sha256'), 'utf8').trim().split('\n').filter(Boolean)
      assert.ok(artifacts.length >= 5, runName + ' lacks rendered artifacts')
      for (const line of artifacts) {
        const [hash, path] = line.split('  ')
        assert.ok(hash && path, runName + ' malformed artifact manifest')
        assert.equal(
          createHash('sha256')
            .update(readFileSync(join(run, path)))
            .digest('hex'),
          hash,
          runName + ' artifact differs: ' + path,
        )
      }
    }
  }

  const triggerCorpus = JSON.parse(
    readFileSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', 'trigger-evals.json'), 'utf8'),
  ) as { queries: Array<{ id: string; should_trigger: boolean }> }
  const triggerInputs = new Map(
    readFileSync(join(evidenceRoot, 'trigger-input.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, path] = line.split('  ')
        return [path, hash] as const
      }),
  )
  for (const path of [
    'tests/skill-evals/dsh-spec-client-ui-ux/trigger-evals.json',
    'tests/skill-evals/dsh-spec-client-ui-ux/trigger-fixtures/AGENTS.md',
  ] as const) {
    assert.equal(
      triggerInputs.get(path),
      createHash('sha256')
        .update(readFileSync(join(REPO_ROOT, path)))
        .digest('hex'),
      'trigger input differs: ' + path,
    )
  }
  assert.equal(
    triggerInputs.get(triggerSurfacePath('dsh-spec-client-ui-ux')),
    triggerSurfaceHash('dsh-spec-client-ui-ux'),
    'Web UI trigger surface differs',
  )
  const matrix = new Map(
    readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8')
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => {
        const [id, shouldTrigger, readSkill, result] = line.split('\t')
        assert.ok(id && shouldTrigger && readSkill && result, 'malformed Web UI trigger row')
        return [id, { shouldTrigger, readSkill, result }] as const
      }),
  )
  assert.equal(matrix.size, triggerCorpus.queries.length)
  for (const query of triggerCorpus.queries) {
    const row = matrix.get(query.id)
    assert.ok(row, 'missing Web UI trigger row ' + query.id)
    assert.equal(row.shouldTrigger, String(query.should_trigger))
    const trace = readFileSync(join(evidenceRoot, 'trigger', query.id, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string; command?: string; exit_code?: number | null; sha256?: string })
    const skillEvents = trace.filter((entry) => entry.type === 'skill')
    assert.equal(skillEvents.length, 1, query.id + ' does not identify the Web UI revision used')
    assert.equal(skillEvents[0]?.sha256, recordedSkillHash)
    const readSkill = trace.some(
      (entry) =>
        entry.type === 'command' && entry.exit_code === 0 && commandReadsSkill(entry.command, 'dsh-spec-client-ui-ux'),
    )
    assert.equal(row.readSkill, String(readSkill))
    assert.equal(row.result, query.should_trigger === readSkill ? 'pass' : 'fail')
    assert.equal(row.result, 'pass')
    assert.ok(readFileSync(join(evidenceRoot, 'trigger', query.id, 'final.md'), 'utf8').trim().length > 0)
  }
})

test('web UI fixtures are runnable and retain real media signatures', () => {
  const files = join(EVAL_SOURCE_ROOT, 'dsh-spec-client-ui-ux', 'evals', 'files')
  const shared = join(files, 'shared-widget-project')
  const missing = join(files, 'no-render-project')
  const sharedTest = spawnSync(process.execPath, ['--test', 'tests/button-consumers.test.mjs'], {
    cwd: shared,
    encoding: 'utf8',
  })
  assert.equal(sharedTest.status, 0, (sharedTest.stdout ?? '') + (sharedTest.stderr ?? ''))
  const missingTest = spawnSync(process.execPath, ['--test', 'tests/dialog-check.mjs'], {
    cwd: missing,
    encoding: 'utf8',
  })
  assert.equal(missingTest.status, 0, (missingTest.stdout ?? '') + (missingTest.stderr ?? ''))
  const captureCheck = spawnSync(process.execPath, ['--check', 'capture-browser.mjs'], {
    cwd: shared,
    encoding: 'utf8',
  })
  assert.equal(captureCheck.status, 0, (captureCheck.stdout ?? '') + (captureCheck.stderr ?? ''))

  for (const name of [
    'search-before.png',
    'search-after.png',
    'settings-before.png',
    'settings-after.png',
    'search-focus-before.png',
    'search-focus-after.png',
    'settings-saving-before.png',
    'settings-saving-after.png',
  ]) {
    assert.equal(
      readFileSync(join(shared, 'evidence', name))
        .subarray(1, 4)
        .toString('ascii'),
      'PNG',
    )
  }
  assert.equal(
    readFileSync(join(shared, 'evidence', 'shared-button.gif'))
      .subarray(0, 3)
      .toString('ascii'),
    'GIF',
  )
})

function assertCaptureDidNotTimeOut(result: ReturnType<typeof spawnSync>): void {
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
}

async function assertCaptureProcessesGone(fixture: ReturnType<typeof createCaptureFixture>): Promise<void> {
  for (const path of [fixture.serverPidFile, fixture.chromePidFile, fixture.descendantPidFile]) {
    const pid = fixture.pid(path)
    assert.equal(await waitForProcessGone(pid), true, 'capture left process ' + pid)
  }
  assert.deepEqual(fixture.captureRunDirectories(), [])
}

test('client UI capture rejects an unready server before Chrome and clears old evidence', async (t) => {
  const fixture = createCaptureFixture(t, 'capture-server-unready-')
  fixture.seedOldEvidence()
  const result = fixture.run('success', {
    FAKE_SERVER_MODE: 'unready',
    SERVER_READY_TIMEOUT_MS: '100',
  })

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /SERVER_UNREADY: server did not report a URL/)
  assert.equal(fixture.pid(fixture.chromePidFile), undefined)
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture cleans up Chrome startup failure and stale evidence', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-chrome-exit-')
  fixture.seedOldEvidence()
  const result = fixture.run('exit-before-ready')

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CHROME_START_FAILED: Chrome exited before readiness: 7/)
  assert.ok(fixture.events(fixture.chromeEvents).some((entry) => entry.event === 'start'))
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture rejects a command pending when DevTools disconnects', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-disconnect-')
  fixture.seedOldEvidence()
  const result = fixture.run('disconnect-pending', {
    CDP_COMMAND_TIMEOUT_MS: '2000',
    CAPTURE_TIMEOUT_MS: '3000',
  })

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CDP_DISCONNECTED: Chrome DevTools connection (?:closed|failed)/)
  assert.ok(fixture.events(fixture.chromeEvents).some((entry) => entry.event === 'websocket-open'))
  assert.ok(fixture.events(fixture.chromeEvents).some((entry) => entry.event === 'command'))
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture bounds an unresponsive CDP command and removes its run', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-command-timeout-')
  fixture.seedOldEvidence()
  const result = fixture.run('command-timeout', {
    CDP_COMMAND_TIMEOUT_MS: '100',
    CAPTURE_TIMEOUT_MS: '2000',
  })

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CDP_COMMAND_TIMEOUT: Page\.enable did not finish within 100 ms/)
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture bounds the whole run when target discovery hangs', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-overall-timeout-')
  fixture.seedOldEvidence()
  const result = fixture.run('overall-timeout', {
    CDP_COMMAND_TIMEOUT_MS: '2000',
    CHROME_READY_TIMEOUT_MS: '2000',
    CAPTURE_TIMEOUT_MS: '200',
  })

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CAPTURE_TIMEOUT: capture did not finish within 200 ms/)
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture publishes one complete run and removes its process tree', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-success-')
  fixture.seedOldEvidence()
  const result = fixture.run('success')

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(
    readdirSync(fixture.evidence).sort(),
    [
      'delete-disabled.png',
      'narrow-after-idle.png',
      'review-state.json',
      'search-hover.png',
      'search-keyboard-focus.png',
      'search-pressed.png',
      'wide-after-idle.png',
    ].sort(),
  )
  assert.equal(existsSync(join(fixture.evidence, 'stale.png')), false)
  const report = JSON.parse(readFileSync(join(fixture.evidence, 'review-state.json'), 'utf8')) as {
    screenshots: Record<string, { path: string; sha256: string; bytes: number }>
  }
  assert.deepEqual(JSON.parse(result.stdout), report)
  for (const screenshot of Object.values(report.screenshots)) {
    const bytes = readFileSync(join(fixture.root, screenshot.path))
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG')
    assert.equal(bytes.length, screenshot.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), screenshot.sha256)
  }
  assert.ok(fixture.events(fixture.serverEvents).some((entry) => entry.event === 'ready'))
  const chromeEvents = fixture.events(fixture.chromeEvents)
  assert.equal(chromeEvents.filter((entry) => entry.event === 'screenshot').length, 6)
  assert.ok(
    chromeEvents.some((entry) => entry.event === 'command' && entry.method === 'Browser.close'),
    'capture did not ask Chrome to close before process-tree cleanup',
  )
  assert.notEqual(fixture.pid(fixture.descendantPidFile), undefined)
  await assertCaptureProcessesGone(fixture)
})

test('client UI capture discards prior evidence and its partial run after failure', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the deterministic fake Chrome executable uses POSIX launch semantics')
    return
  }
  const fixture = createCaptureFixture(t, 'capture-partial-failure-')
  fixture.seedOldEvidence()
  const result = fixture.run('fail-after-first-screenshot')

  assertCaptureDidNotTimeOut(result)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /CDP_COMMAND_FAILED: injected CDP failure/)
  assert.ok(fixture.events(fixture.chromeEvents).some((entry) => entry.event === 'screenshot'))
  assert.equal(existsSync(fixture.evidence), false)
  await assertCaptureProcessesGone(fixture)
})

test('browser GIF fixtures build and their capture entries parse', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'browser-gif-fixture-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const scenario = readCorpus('dsh-spec-record-browser-gif').evals.find(
    (entry) => entry.id === 'real-ui-change-uses-one-isolated-run',
  )
  assert.ok(scenario)
  const prefix = 'evals/files/shared-gif-project/'
  for (const file of scenario.files ?? []) {
    assert.ok(file.startsWith(prefix), 'unexpected browser GIF fixture input: ' + file)
    const destination = join(root, file.slice(prefix.length))
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(join(EVAL_SOURCE_ROOT, 'dsh-spec-record-browser-gif', file), destination)
  }

  const build = spawnSync(process.execPath, ['build.mjs'], { cwd: root, encoding: 'utf8' })
  assert.equal(build.status, 0, (build.stdout ?? '') + (build.stderr ?? ''))
  for (const file of ['dist/index.html', 'dist/src/app.js']) {
    assert.equal(existsSync(join(root, file)), true, 'fixture build did not produce ' + file)
  }
  for (const file of ['capture-browser.mjs', 'server.mjs']) {
    const syntax = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' })
    assert.equal(syntax.status, 0, (syntax.stdout ?? '') + (syntax.stderr ?? ''))
  }
})

test('test reliability fixtures run with the intended positive and negative controls', () => {
  const root = join(EVAL_SOURCE_ROOT, 'dsh-spec-ci-test-reliability', 'evals', 'files')
  const positiveRoot = join(EVAL_SOURCE_ROOT, 'dsh-spec-ci-test-reliability', 'positive-controls')
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const collidingPort = spawnSync(process.execPath, ['--test', 'tests/server.test.mjs'], {
    cwd: join(root, 'port-collision'),
    encoding: 'utf8',
    env,
  })
  assert.notEqual(collidingPort.status, 0)
  assert.match((collidingPort.stdout ?? '') + (collidingPort.stderr ?? ''), /EADDRINUSE/)
  const atomicPort = spawnSync(process.execPath, ['--test', 'tests/server.test.mjs'], {
    cwd: join(positiveRoot, 'port-collision'),
    encoding: 'utf8',
    env,
    timeout: 10_000,
  })
  assert.equal(atomicPort.status, 0, (atomicPort.stdout ?? '') + (atomicPort.stderr ?? ''))
  assert.doesNotMatch((atomicPort.stdout ?? '') + (atomicPort.stderr ?? ''), /EADDRINUSE/)
  assert.match(atomicPort.stdout ?? '', /pass 1/)
  assert.match(atomicPort.stdout ?? '', /fail 0/)
  for (const [project, args] of [
    ['diagnosis-only', ['--test', 'tests/server.test.mjs']],
    ['slow-suite', ['--test', 'tests/report.test.mjs']],
  ] as const) {
    const result = spawnSync(process.execPath, [...args], { cwd: join(root, project), encoding: 'utf8', env })
    assert.equal(result.status, 0, project + ': ' + (result.stdout ?? '') + (result.stderr ?? ''))
  }
  const leakingGlobals = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/config.test.mjs'], {
    cwd: join(root, 'global-state'),
    encoding: 'utf8',
    env,
  })
  assert.notEqual(leakingGlobals.status, 0)
  assert.match((leakingGlobals.stdout ?? '') + (leakingGlobals.stderr ?? ''), /restores the pre-test global state/)
  for (const featureFlag of ['absent', 'empty'] as const) {
    const positiveEnv = { ...env }
    if (featureFlag === 'absent') {
      delete positiveEnv.FEATURE_FLAG
    } else {
      positiveEnv.FEATURE_FLAG = ''
    }
    const restoredGlobals = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/config.test.mjs'], {
      cwd: join(positiveRoot, 'global-state'),
      encoding: 'utf8',
      env: positiveEnv,
      timeout: 10_000,
    })
    assert.equal(
      restoredGlobals.status,
      0,
      featureFlag + ': ' + (restoredGlobals.stdout ?? '') + (restoredGlobals.stderr ?? ''),
    )
    assert.match(restoredGlobals.stdout ?? '', /pass 3/)
    assert.match(restoredGlobals.stdout ?? '', /fail 0/)
  }
  const portPositive = readFileSync(join(positiveRoot, 'port-collision/tests/server.test.mjs'), 'utf8')
  assert.match(portPositive, /competitor/)
  assert.doesNotMatch(portPositive, /findFreePort/)
  const portPositiveServer = readFileSync(join(positiveRoot, 'port-collision/support/server.mjs'), 'utf8')
  assert.match(portPositiveServer, /server\.listen\(0, '127\.0\.0\.1'/)
  const globalPositive = readFileSync(join(positiveRoot, 'global-state/tests/config.test.mjs'), 'utf8')
  assert.match(globalPositive, /Object\.hasOwn\(process\.env, 'FEATURE_FLAG'\)/)
  assert.match(globalPositive, /delete process\.env\.FEATURE_FLAG/)
  assert.match(globalPositive, /assert\.deepEqual\(captureGlobals\(\), snapshot\)/)
})

test('speed-up-perf fixtures expose runnable production paths and measurement boundaries', () => {
  const root = join(EVAL_SOURCE_ROOT, 'dsh-spec-speed-up-perf', 'evals', 'files')
  for (const [project, testFile] of [
    ['measurement-decisions', 'tests/report.test.mjs'],
    ['frontend-input-to-paint', 'tests/input-behavior.test.mjs'],
    ['end-to-end-boundary', 'tests/path.test.mjs'],
    ['cold-start-process-memory', 'tests/session.test.mjs'],
    ['stable-identity-subscription', 'tests/store.test.mjs'],
    ['authorized-deliberate-difference', 'tests/report.test.mjs'],
  ] as const) {
    const result = spawnSync(process.execPath, ['--test', testFile], {
      cwd: join(root, project),
      encoding: 'utf8',
      timeout: 10_000,
    })
    assert.equal(result.status, 0, project + ': ' + (result.stdout ?? '') + (result.stderr ?? ''))
  }

  const measurement = join(root, 'measurement-decisions')
  const benchmark = spawnSync(process.execPath, ['bench.mjs'], {
    cwd: measurement,
    encoding: 'utf8',
    timeout: 30_000,
  })
  assert.equal(benchmark.status, 0, (benchmark.stdout ?? '') + (benchmark.stderr ?? ''))
  const benchmarkResult = JSON.parse(benchmark.stdout) as {
    warmupSamplesMs: number[]
    samplesMs: number[]
    medianMs: number
    p95Ms: number
  }
  assert.equal(benchmarkResult.warmupSamplesMs.length, 2)
  assert.equal(benchmarkResult.samplesMs.length, 7)
  assert.ok(benchmarkResult.samplesMs.every((sample) => Number.isFinite(sample) && sample > 0))
  assert.ok(Number.isFinite(benchmarkResult.medianMs) && benchmarkResult.medianMs > 0)
  assert.ok(Number.isFinite(benchmarkResult.p95Ms) && benchmarkResult.p95Ms > 0)

  const gate = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import { gateDecision } from './gate.mjs'; console.log(JSON.stringify([gateDecision(59), gateDecision(61)]))",
    ],
    {
      cwd: measurement,
      encoding: 'utf8',
      timeout: 10_000,
    },
  )
  assert.equal(gate.status, 0, (gate.stdout ?? '') + (gate.stderr ?? ''))
  const [passingGate, failingGate] = JSON.parse(gate.stdout) as Array<{
    passed: boolean
    limitMs: number
  }>
  assert.equal(passingGate?.passed, true)
  assert.equal(failingGate?.passed, false)
  assert.equal(passingGate?.limitMs, 60)
  assert.equal(failingGate?.limitMs, 60)

  const gateRun = spawnSync(process.execPath, ['gate.mjs'], {
    cwd: measurement,
    encoding: 'utf8',
    timeout: 30_000,
  })
  assert.ok([0, 1].includes(gateRun.status ?? -1), (gateRun.stdout ?? '') + (gateRun.stderr ?? ''))
  const gateResult = JSON.parse(gateRun.stdout) as { passed: boolean; limitMs: number }
  assert.equal(gateResult.passed, gateRun.status === 0)
  assert.equal(gateResult.limitMs, 60)

  const profile = spawnSync(process.execPath, ['profile.mjs'], {
    cwd: measurement,
    encoding: 'utf8',
    timeout: 30_000,
  })
  assert.equal(profile.status, 0, (profile.stdout ?? '') + (profile.stderr ?? ''))
  const profileResult = JSON.parse(profile.stdout) as {
    inventoryRows: number
    seenScans: number
    regionFilters: number
    regionCandidates: number
    profileEntries: number
  }
  assert.ok(profileResult.inventoryRows > 5_000)
  assert.ok(profileResult.seenScans >= profileResult.inventoryRows)
  assert.equal(profileResult.regionFilters, profileResult.profileEntries)
  assert.ok(profileResult.regionCandidates > profileResult.inventoryRows)

  const frontend = join(root, 'frontend-input-to-paint')
  const build = spawnSync(process.execPath, ['build.mjs'], { cwd: frontend, encoding: 'utf8' })
  assert.equal(build.status, 0, (build.stdout ?? '') + (build.stderr ?? ''))
  for (const file of ['dist/index.html', 'dist/app.js', 'dist/filter.mjs']) {
    assert.ok(existsSync(join(frontend, file)), 'frontend build did not produce ' + file)
  }
  for (const file of ['measure.mjs', 'server.mjs']) {
    const syntax = spawnSync(process.execPath, ['--check', file], { cwd: frontend, encoding: 'utf8' })
    assert.equal(syntax.status, 0, (syntax.stdout ?? '') + (syntax.stderr ?? ''))
  }

  const boundary = join(root, 'end-to-end-boundary')
  const controlled = spawnSync(process.execPath, ['diagnose.mjs'], {
    cwd: boundary,
    encoding: 'utf8',
    env: { ...process.env, EXTERNAL_DELAY_MS: '0' },
  })
  assert.equal(controlled.status, 0, (controlled.stdout ?? '') + (controlled.stderr ?? ''))
  const boundaryResult = JSON.parse(controlled.stdout) as {
    samples: Array<{ totalMs: number; externalMs: number; localMs: number; itemCount: number }>
  }
  assert.equal(boundaryResult.samples.length, 3)
  for (const sample of boundaryResult.samples) {
    assert.ok(sample.totalMs > 0)
    assert.ok(sample.externalMs < 10)
    assert.ok(sample.localMs > 0)
    assert.ok(sample.itemCount > 0)
  }

  const coldStart = join(root, 'cold-start-process-memory')
  const probe = spawnSync(process.execPath, ['probe.mjs'], {
    cwd: coldStart,
    encoding: 'utf8',
    timeout: 30_000,
  })
  assert.equal(probe.status, 0, (probe.stdout ?? '') + (probe.stderr ?? ''))
  const coldResult = JSON.parse(probe.stdout) as {
    samples: Array<{
      wallMs: number
      heapDeltaBytes: number
      retainedArrayBufferDeltaBytes: number
      gc: string
      retainedBatches: number
      negativeControl: { retainedBatches: number; arrayBufferDeltaBytes: number }
    }>
  }
  assert.equal(coldResult.samples.length, 5)
  for (const sample of coldResult.samples) {
    assert.ok(Number.isFinite(sample.wallMs))
    assert.ok(sample.wallMs > 0)
    assert.ok(Number.isFinite(sample.heapDeltaBytes))
    assert.ok(Number.isFinite(sample.retainedArrayBufferDeltaBytes))
    assert.ok(Number.isFinite(sample.negativeControl.arrayBufferDeltaBytes))
    assert.match(sample.gc, /explicit synchronous major global\.gc/)
    assert.equal(sample.retainedBatches, 30)
    assert.equal(sample.negativeControl.retainedBatches, 0)
  }

  const identity = join(root, 'stable-identity-subscription')
  const diagnosis = spawnSync(process.execPath, ['diagnose.mjs'], {
    cwd: identity,
    encoding: 'utf8',
    timeout: 10_000,
  })
  assert.equal(diagnosis.status, 0, (diagnosis.stdout ?? '') + (diagnosis.stderr ?? ''))
  const identityResult = JSON.parse(diagnosis.stdout) as {
    events: Array<{ order: string[] }>
    retainedIdentityByRow: Record<string, boolean>
  }
  assert.deepEqual(
    identityResult.events.map((event) => event.order),
    [
      ['north', 'south', 'west'],
      ['north', 'south', 'west'],
    ],
  )
  assert.deepEqual(identityResult.retainedIdentityByRow, {
    north: false,
    south: false,
    west: false,
  })

  const authorized = join(root, 'authorized-deliberate-difference')
  const visibleChange = spawnSync(process.execPath, ['measure.mjs'], {
    cwd: authorized,
    encoding: 'utf8',
    timeout: 30_000,
  })
  assert.equal(visibleChange.status, 0, (visibleChange.stdout ?? '') + (visibleChange.stderr ?? ''))
  const visibleResult = JSON.parse(visibleChange.stdout) as { samplesMs: number[]; medianMs: number }
  assert.equal(visibleResult.samplesMs.length, 7)
  assert.ok(visibleResult.medianMs > 0)
})

test('speed-up-perf model evidence binds scenarios, capabilities and provenance', () => {
  const skill = 'dsh-spec-speed-up-perf'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue-166', skill)
  const currentUsername = userInfo().username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const hostAccountPatterns = [
    new RegExp(`[bcdlps-][rwxStTs-]{9}[+@.]?\\s+\\d+\\s+${currentUsername}(?=\\s|:)`, 'i'),
    new RegExp(`(?:uid|gid)=\\d+\\(${currentUsername}\\)`, 'i'),
    new RegExp(`(?:^|\\\\n)${currentUsername}(?=\\s+\\d+\\s+\\d+\\s+)`, 'im'),
  ]
  for (const file of listFiles(evidenceRoot)) {
    const text = readFileSync(join(evidenceRoot, file), 'utf8')
    for (const pattern of hostAccountPatterns) {
      assert.doesNotMatch(text, pattern, file + ' exposes the current host account')
    }
  }
  for (const scenario of readCorpus(skill).evals) {
    const root = join(evidenceRoot, scenario.id)
    assertEvidencePath(evidenceRoot, root, scenario.id, 'directory')
    const status = readFileSync(join(root, 'status.txt'), 'utf8')
    assert.match(status, /^status: pass$/m, scenario.id)
    assert.match(status, /^run_exit_code: 0$/m, scenario.id)
    assert.match(
      status,
      new RegExp(`^assertions: ${scenario.assertions.length}/${scenario.assertions.length}$`, 'm'),
      scenario.id,
    )
    const assertionLines = readFileSync(join(root, 'assertions.txt'), 'utf8').trim().split('\n')
    assert.deepEqual(
      assertionLines.map((line) => line.replace(/^(?:PASS|FAIL) /, '')),
      scenario.assertions,
      scenario.id + ' assertion text differs',
    )
    assertionLines.forEach((line) => assert.match(line, /^PASS /, scenario.id))
    const recorded = validateRecordedScenario(
      skill,
      JSON.parse(readFileSync(join(root, 'scenario-definition.json'), 'utf8')),
      scenario.id,
    )
    assert.deepEqual(recorded, scenario, scenario.id + ' scenario definition differs')
    assertBehaviorScenarioTraceBinding(root, skill, scenario)
    assertEvidenceArtifactManifest(root, scenario.id)
    assert.equal(
      readFileSync(join(root, 'scenario-definition.sha256'), 'utf8').trim(),
      `${scenarioDefinitionHash(recorded)}  ${skill}:${scenario.id}`,
      scenario.id + ' scenario hash differs',
    )
    assert.deepEqual(
      JSON.parse(readFileSync(join(root, 'capabilities.json'), 'utf8')),
      {
        auth: 'host-proxy',
        browser: scenario.capabilities?.browser ?? false,
        media: scenario.capabilities?.media ?? false,
        sandbox: 'workspace-write',
        subagents: scenario.allow_subagents ?? false,
      },
      scenario.id + ' capability profile differs',
    )
    assertBehaviorSkillProvenance(root, skill, scenario.install ?? [])
    const skillRoot = join(REPO_ROOT, 'skills', skill)
    const currentSkillHashes = listFiles(skillRoot).map(
      (file) => `${fileHash(join(skillRoot, file))}  skills/${skill}/${file}  mode=${fileMode(join(skillRoot, file))}`,
    )
    for (const [entryPath, entry] of readSkillHashEntries(root)) {
      const currentPath = join(REPO_ROOT, entryPath)
      assert.equal(entry.hash, fileHash(currentPath), scenario.id + ' stale skill hash: ' + entryPath)
      assert.equal(entry.mode, fileMode(currentPath), scenario.id + ' stale skill mode: ' + entryPath)
    }
    const metadata = JSON.parse(readFileSync(join(root, 'evidence.json'), 'utf8')) as {
      arm: string
      claim: { subject: string; type: string }
      evidence: { currentness: { input_manifest_sha256: string; scenario_sha256: string } }
      provenance: { target_skill_tree_sha256: string | null }
    }
    evidencePolicy.inspectRetainedRun(root, metadata)
    assert.equal(metadata.arm, 'target-present', scenario.id)
    assert.equal(metadata.claim.subject, `${skill}:${scenario.id}`, scenario.id)
    assert.equal(metadata.evidence.currentness.scenario_sha256, scenarioDefinitionHash(scenario), scenario.id)
    assert.equal(
      metadata.evidence.currentness.input_manifest_sha256,
      fileHash(join(root, 'input-manifest.sha256')),
      scenario.id,
    )
    assert.equal(
      metadata.provenance.target_skill_tree_sha256,
      createHash('sha256').update(currentSkillHashes.join('\n')).digest('hex'),
      scenario.id + ' skill tree differs',
    )
    assert.equal(replayEvidencePatch(root, skill, scenario), true, scenario.id + ' inputs changed')
    assertAnswerBlindTrace(root)
    assert.ok(
      traceCommandsFor(root).some((command) => commandPrintsSkill(command, skill)),
      scenario.id + ' did not read the installed skill',
    )
    const trace = readEvidenceTrace(join(root, 'trace.jsonl'))
    assert.equal(trace.at(-1)?.type, 'turn.completed', scenario.id + ' did not complete')
    assert.ok(readFileSync(join(root, 'final.md'), 'utf8').trim().length > 0, scenario.id + ' final answer')
  }

  const privateFinal = readFileSync(join(evidenceRoot, 'private-corpus-remains-aggregate/final.md'), 'utf8')
  for (const sentinel of [
    'ALICE-SECRET-9182',
    'alice@example.com',
    '/home/alice/private/order.txt',
    'session-alice-private',
  ]) {
    assert.doesNotMatch(privateFinal, new RegExp(sentinel.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.equal(
    readFileSync(join(evidenceRoot, 'private-corpus-remains-aggregate/changed-paths.txt'), 'utf8').trim(),
    '',
  )

  const baseline = join(evidenceRoot, 'baseline-measurement-decisions')
  const baselineStatus = readFileSync(join(baseline, 'status.txt'), 'utf8')
  assert.match(baselineStatus, /^role: no-skill baseline$/m)
  assert.match(baselineStatus, /^status: fail$/m)
  assert.match(baselineStatus, /^assertions: 5\/6$/m)
  assert.match(baselineStatus, /^answer_blind: false$/m)
  assert.equal(
    traceCommandsFor(baseline).some((command) => commandPrintsSkill(command, skill)),
    false,
    'the baseline used the target skill',
  )
  assert.match(readFileSync(join(baseline, 'patch.diff'), 'utf8'), /report\.mjs|unitsByRegion|regionalUnits|Map/)
  const comparisonScenario = readCorpus(skill).evals.find((scenario) => scenario.id === 'measurement-decisions')
  assert.ok(comparisonScenario)
  assert.equal(replayEvidencePatch(baseline, skill, comparisonScenario), true, 'baseline inputs changed')
  assertBehaviorScenarioTraceBinding(baseline, skill, comparisonScenario)
  assertEvidenceArtifactManifest(baseline, 'baseline-measurement-decisions')
  const baselineEvidence = JSON.parse(readFileSync(join(baseline, 'evidence.json'), 'utf8')) as {
    comparison: { counterpart_evidence_sha256: string | null; pair_status: string }
  }
  const candidateEvidence = JSON.parse(readFileSync(join(evidenceRoot, 'measurement-decisions/evidence.json'), 'utf8'))
  evidencePolicy.inspectRetainedRun(baseline, baselineEvidence)
  evidencePolicy.inspectRetainedRun(join(evidenceRoot, 'measurement-decisions'), candidateEvidence)
  evidencePolicy.assertComparableEvidenceArms(candidateEvidence, baselineEvidence, {
    scenario: comparisonScenario,
    candidateEvidenceSha256: evidencePolicy.hashEvidenceMetadata(join(evidenceRoot, 'measurement-decisions')),
    baselineEvidenceSha256: evidencePolicy.hashEvidenceMetadata(baseline),
  })
  assert.equal(baselineEvidence.comparison.pair_status, 'paired')
  assert.equal(
    baselineEvidence.comparison.counterpart_evidence_sha256,
    evidencePolicy.hashEvidenceMetadata(join(evidenceRoot, 'measurement-decisions')),
  )
})

test('speed-up-perf evidence rejects cross-scenario and artifact swaps', () => {
  const skill = 'dsh-spec-speed-up-perf'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue-166', skill)
  const scenario = readCorpus(skill).evals.find((entry) => entry.id === 'measurement-decisions')
  assert.ok(scenario)
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'speed-up-perf-evidence-swap-'))
  try {
    const copied = join(temporaryRoot, scenario.id)
    cpSync(join(evidenceRoot, scenario.id), copied, { recursive: true })

    cpSync(join(evidenceRoot, 'frontend-input-to-paint/trace.jsonl'), join(copied, 'trace.jsonl'))
    assert.throws(
      () => assertBehaviorScenarioTraceBinding(copied, skill, scenario),
      /trace subject|trace scenario hash/,
    )

    cpSync(join(evidenceRoot, scenario.id, 'trace.jsonl'), join(copied, 'trace.jsonl'))
    cpSync(join(evidenceRoot, 'frontend-input-to-paint/final.md'), join(copied, 'final.md'))
    assert.throws(() => assertBehaviorScenarioTraceBinding(copied, skill, scenario), /final differs from the trace/)

    cpSync(join(evidenceRoot, scenario.id, 'final.md'), join(copied, 'final.md'))
    writeFileSync(
      join(copied, 'artifact/evals/files/measurement-decisions/src/report.mjs'),
      'unexpected artifact contents\n',
    )
    assert.throws(() => assertEvidenceArtifactManifest(copied, 'speed-up-perf swap control'), /artifact differs/)

    cpSync(
      join(evidenceRoot, scenario.id, 'artifact/evals/files/measurement-decisions/src/report.mjs'),
      join(copied, 'artifact/evals/files/measurement-decisions/src/report.mjs'),
    )
    writeFileSync(join(copied, 'artifact/evals/files/measurement-decisions/extra.txt'), 'unexpected artifact\n')
    assert.throws(
      () => assertEvidenceArtifactManifest(copied, 'speed-up-perf swap control'),
      /artifact directory differs from its manifest/,
    )
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
})

test('PR #129 performance traces remain historical after the reforge', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-24-pr129/dsh-spec-performance-investigation')
  assert.match(readFileSync(join(evidenceRoot, 'README.md'), 'utf8'), /^> \*\*Historical status:\*\*/m)
  for (const scenario of [
    'backend-budgetless-latency',
    'browser-measurement-unavailable',
    'end-to-end-external-boundary',
    'frontend-input-to-paint',
    'private-corpus-remains-aggregate',
  ]) {
    const root = join(evidenceRoot, scenario)
    assert.ok(readFileSync(join(root, 'final.md'), 'utf8').trim().length > 0, scenario)
    assert.ok(readFileSync(join(root, 'trace.jsonl'), 'utf8').trim().length > 0, scenario)
    assert.doesNotMatch(
      readFileSync(join(root, 'skill-hashes.txt'), 'utf8'),
      /dsh-spec-speed-up-perf/,
      scenario + ' incorrectly claims the renamed skill',
    )
  }
})

test('find-simplifications authority evidence binds scenario, inputs and skill provenance', () => {
  const skill = 'dsh-spec-find-simplifications'
  const scenario = readCorpus(skill).evals.find((entry) => entry.id === 'agents-md-owns-conflicting-instructions')
  assert.ok(scenario)
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-pr146', skill)
  const root = join(evidenceRoot, scenario.id)
  assertEvidencePath(evidenceRoot, root, scenario.id, 'directory')

  const status = readFileSync(join(root, 'status.txt'), 'utf8')
  assert.match(status, /^status: pass$/m)
  assert.match(status, /^run_exit_code: 0$/m)
  assert.match(status, /^assertions: 4\/4$/m)
  assert.deepEqual(
    readFileSync(join(root, 'assertions.txt'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.replace(/^PASS /, '')),
    scenario.assertions,
  )

  const recorded = validateRecordedScenario(
    skill,
    JSON.parse(readFileSync(join(root, 'scenario-definition.json'), 'utf8')),
    scenario.id,
  )
  assert.deepEqual(recorded, scenario)
  assert.equal(
    readFileSync(join(root, 'scenario-definition.sha256'), 'utf8').trim(),
    `${scenarioDefinitionHash(recorded)}  ${skill}:${scenario.id}`,
  )
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'capabilities.json'), 'utf8')), {
    auth: 'host-proxy',
    browser: false,
    media: false,
    sandbox: 'workspace-write',
    subagents: false,
  })
  const inputManifest = readFileSync(join(root, 'input-manifest.sha256'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => parseHashPath(line, 'find-simplifications input manifest'))
  const expectedInputs = (scenario.files ?? []).sort()
  assert.deepEqual(
    inputManifest.map((entry) => entry.path).sort(),
    expectedInputs,
    'find-simplifications input manifest path set differs',
  )
  for (const entry of inputManifest) {
    const source = join(EVAL_SOURCE_ROOT, skill, entry.path)
    assert.equal(entry.hash, fileHash(source), 'find-simplifications changed input ' + entry.path)
    assert.equal(entry.mode, fileMode(source), 'find-simplifications changed input mode ' + entry.path)
  }
  assertBehaviorSkillProvenance(root, skill)
  assertAnswerBlindTrace(root)
  assert.ok(traceCommandsFor(root).some((command) => commandPrintsSkill(command, skill)))
  const trace = readEvidenceTrace(join(root, 'trace.jsonl'))
  assert.equal(trace.at(-1)?.type, 'turn.completed')
  const final = readFileSync(join(root, 'final.md'), 'utf8')
  assert.equal(finalEvidenceMessage(trace)?.trim(), final.trim())
  assert.match(final, /AGENTS\.md.*audit policy/s)
  assert.match(final, /jsonAdapter/)
  assert.match(final, /CLAUDE\.md/)
})

test('the browser evidence fixture does not leak an unready server', async (t) => {
  if (process.platform === 'win32') {
    t.skip('the failure path uses POSIX process liveness checks')
    return
  }
  const root = mkdtempSync(join(tmpdir(), 'capture-cleanup-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const [fixture, serverEntry] of [
    ['dsh-spec-client-ui-ux/evals/files/shared-widget-project', 'hang-server.mjs'],
    ['dsh-spec-record-browser-gif/evals/files/shared-gif-project', 'server.mjs'],
  ] as const) {
    const fixtureRoot = join(root, fixture.split('/')[0])
    const profiles = join(fixtureRoot, 'profiles')
    const pidFile = join(fixtureRoot, 'server.pid')
    mkdirSync(profiles, { recursive: true })
    cpSync(join(EVAL_SOURCE_ROOT, fixture, 'capture-browser.mjs'), join(fixtureRoot, 'capture-browser.mjs'))
    writeFileSync(
      join(fixtureRoot, serverEntry),
      "import { writeFileSync } from 'node:fs'\n" +
        'writeFileSync(process.env.SERVER_PID_FILE, String(process.pid))\n' +
        'setInterval(() => {}, 1000)\n',
    )
    const result = spawnSync(process.execPath, ['capture-browser.mjs'], {
      cwd: fixtureRoot,
      env: {
        ...process.env,
        CHROME_PATH: existsSync('/bin/true') ? '/bin/true' : process.execPath,
        ...(serverEntry === 'hang-server.mjs' ? { SERVER_ENTRY: serverEntry } : {}),
        SERVER_PID_FILE: pidFile,
        SERVER_READY_TIMEOUT_MS: '100',
        TMPDIR: profiles,
      },
      encoding: 'utf8',
      timeout: 5_000,
    })
    assert.notEqual(result.status, 0, fixture + ' unexpectedly succeeded')
    const deadline = Date.now() + 2_000
    while (!existsSync(pidFile) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    assert.ok(existsSync(pidFile), fixture + ' server never recorded its PID')
    const pid = Number(readFileSync(pidFile, 'utf8'))
    assert.throws(() => process.kill(pid, 0), /ESRCH/, fixture + ' leaked its server')
    assert.deepEqual(readdirSync(profiles), [], fixture + ' leaked its browser profile')
  }
})

test('test reliability recorded model evidence binds scenarios, inputs and outputs', () => {
  const skill = 'dsh-spec-ci-test-reliability'
  const evidenceSkill = 'dsh-spec-test-reliability'
  const corpusRoot = join(EVAL_SOURCE_ROOT, skill)
  assertTriggerCorpusIdentity(skill)
  const historicalTriggerInputs = readHashManifest(
    join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr116/trigger-input.sha256'),
    'historical test reliability trigger inputs',
  )
  assert.deepEqual(
    [...historicalTriggerInputs].sort(([left], [right]) => left.localeCompare(right)),
    [
      [
        `tests/skill-evals/${evidenceSkill}/trigger-evals.json`,
        '66b1ee5bed802d8c4ad6bc04c25082a69681a01f2fafe79014d03653a688233c',
      ],
      [
        `tests/skill-evals/${evidenceSkill}/trigger-fixtures/AGENTS.md`,
        'bfa0eda9a2a85e47d18789d4c5bd3ad02fa389ddbf5adb3f952b3d74010a7327',
      ],
      [triggerSurfacePath(evidenceSkill), '60c37dabfea6125882694cddb7d78b071b71505d36b072a4017e1332e57e5c13'],
    ].sort(([left], [right]) => left.localeCompare(right)),
    'historical test reliability trigger inputs changed',
  )
  const corpusScenarios = new Map(readCorpus(skill).evals.map((scenario) => [scenario.id, scenario] as const))
  const evidenceSets = [
    {
      root: join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr116'),
      answerBlind: false,
      runs: [
        ['candidate-port', 'reserve-port-at-listener', 5],
        ['candidate-global-state', 'restore-exact-global-state', 4],
        ['candidate-diagnosis', 'diagnose-without-fixing', 3],
        ['candidate-slow-suite', 'redesign-slow-repeated-suite', 4],
      ],
    },
    {
      root: join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-23-pr116'),
      answerBlind: true,
      runs: [
        ['diagnose-without-fixing', 'diagnose-without-fixing', 5],
        ['redesign-slow-repeated-suite', 'redesign-slow-repeated-suite', 4],
      ],
    },
  ] as const

  for (const evidence of evidenceSets) {
    const readme = readFileSync(join(evidence.root, 'README.md'), 'utf8')
    assert.match(readme, /historical|recorded/i)
    const definitionsPath = join(evidence.root, 'scenario-definitions.json')
    const definitions = existsSync(definitionsPath)
      ? (JSON.parse(readFileSync(definitionsPath, 'utf8')) as Record<string, Scenario[]>)
      : null
    const historicalText = existsSync(join(evidence.root, 'evaluation-files.sha256'))
      ? readFileSync(join(evidence.root, 'evaluation-files.sha256'), 'utf8')
      : ''
    const historicalFiles = new Map(
      historicalText
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, path] = line.split(/\s{2,}/)
          return [path, hash] as const
        }),
    )
    const skillTreePath = join(evidence.root, 'skills-tree.sha256')
    const recordedSkillTree = existsSync(skillTreePath)
      ? readSkillTreeManifest(skillTreePath).get(`skills/${evidenceSkill}/SKILL.md`)
      : undefined
    let recordedSkillHash: string | undefined
    const recordedInputs = new Map<string, string>()

    for (const [run, scenarioId, assertionCount] of evidence.runs) {
      const root = join(evidence.root, run)
      const scenario =
        definitions?.[evidenceSkill]?.find((entry) => entry.id === scenarioId) ?? corpusScenarios.get(scenarioId)
      assert.ok(scenario, run + ' names no scenario')

      const status = readFileSync(join(root, 'status.txt'), 'utf8')
      assert.match(status, /^status: pass$/m, run)
      if (/^run_exit_code:/m.test(status)) assert.match(status, /^run_exit_code: 0$/m, run)
      assert.match(status, new RegExp(`^assertions: ${assertionCount}/${assertionCount}$`, 'm'), run)
      const scenarioDefinitionFile = join(root, 'scenario-definition.json')
      const recordedScenario = existsSync(scenarioDefinitionFile)
        ? (JSON.parse(readFileSync(scenarioDefinitionFile, 'utf8')) as Scenario)
        : scenario
      assert.equal(recordedScenario.id, scenarioId, run + ' records the wrong scenario')
      assert.equal(recordedScenario.assertions.length, assertionCount, run + ' assertion count')
      const expectedAssertions = recordedScenario.assertions.map((entry) => `PASS ${entry}`).join('\n')
      assert.equal(readFileSync(join(root, 'assertions.txt'), 'utf8').trim(), expectedAssertions, run)
      if (existsSync(join(root, 'assertions.expected.txt'))) {
        assert.equal(readFileSync(join(root, 'assertions.expected.txt'), 'utf8').trim(), expectedAssertions, run)
      }
      if (existsSync(scenarioDefinitionFile)) {
        assert.equal(
          readFileSync(join(root, 'scenario-definition.sha256'), 'utf8').trim(),
          `${scenarioDefinitionHash(recordedScenario)}  ${evidenceSkill}:${scenarioId}`,
          run + ' scenario hash differs',
        )
      }

      const inputs = readOrderedHashManifest(join(root, 'input-manifest.sha256'))
      assert.deepEqual(
        inputs.map((entry) => entry.path),
        recordedScenario.files,
        run + ' input manifest differs from its scenario',
      )
      for (const entry of inputs) {
        const frozenHash = historicalFiles.get(`tests/skill-evals/${evidenceSkill}/${entry.path}`)
        if (frozenHash !== undefined) {
          assert.equal(entry.hash, frozenHash, run + ' differs from its frozen input: ' + entry.path)
          continue
        }
        const priorHash = recordedInputs.get(entry.path)
        if (priorHash !== undefined) assert.equal(entry.hash, priorHash, run + ' changed ' + entry.path)
        else recordedInputs.set(entry.path, entry.hash)
        assertRegularEvidenceFile(join(corpusRoot, entry.path), run + ' current input path ' + entry.path)
      }

      const runSkillHashFile = join(root, 'skill.sha256')
      const runSkillHashesFile = join(root, 'skill-hashes.txt')
      const runSkillHash = existsSync(runSkillHashFile)
        ? readFileSync(runSkillHashFile, 'utf8').trim()
        : readHashManifest(runSkillHashesFile, run + ' skill hashes').get(`skills/${evidenceSkill}/SKILL.md`)
      assert.match(runSkillHash ?? '', /^[0-9a-f]{64}$/, run + ' records no skill revision')
      if (recordedSkillHash === undefined) recordedSkillHash = runSkillHash
      else assert.equal(runSkillHash, recordedSkillHash, run + ' records a different skill revision')

      const traceText = readFileSync(join(root, 'trace.jsonl'), 'utf8')
      if (evidence.answerBlind) {
        assert.doesNotMatch(traceText, /evals\/evals\.json|tests\/skill-evals|expected_output/, run + ' trace')
      }
      const trace = readEvidenceTrace(join(root, 'trace.jsonl'))
      assert.equal(trace.filter((entry) => entry.type === 'turn.completed').length, 1, run + ' completion count')
      assert.equal(trace.at(-1)?.type, 'turn.completed', run + ' did not complete')
      assert.equal(
        trace.some(
          (entry) =>
            entry.type === 'item.completed' &&
            entry.item?.type === 'command_execution' &&
            entry.item.exit_code === 0 &&
            commandPrintsSkill(entry.item.command, evidenceSkill),
        ),
        true,
        run + ' did not read the installed skill',
      )
      const finalMessage = finalEvidenceMessage(trace)
      assert.ok(finalMessage, run + ' has no final message')
      assert.equal(readFileSync(join(root, 'final.md'), 'utf8').trim(), finalMessage.trim(), run + ' final message')

      const patchFile = join(root, 'patch.diff')
      const patch = existsSync(patchFile) ? readFileSync(patchFile, 'utf8').trim() : ''
      const changedPathFile = join(root, 'changed-paths.txt')
      const changedPaths = existsSync(changedPathFile) ? readFileSync(changedPathFile, 'utf8').trim() : ''
      const artifactsFile = join(root, 'artifacts.sha256')
      const artifacts = existsSync(artifactsFile) ? readOrderedHashManifest(artifactsFile) : []
      if (run === 'candidate-diagnosis' || run === 'diagnose-without-fixing') {
        assert.equal(changedPaths, '', run + ' changed project files')
        assert.equal(patch, '', run + ' retained a patch')
        assert.deepEqual(artifacts, [], run + ' retained artifacts')
      } else {
        assert.notEqual(patch, '', run + ' retained no patch')
        if (existsSync(changedPathFile)) assert.ok(changedPaths.length > 0, run + ' retained no changed paths')
        assert.ok(artifacts.length > 0, run + ' retained no artifacts')
        for (const artifact of artifacts) {
          assertRegularEvidenceFile(join(root, artifact.path), run + ' artifact ' + artifact.path)
          assert.equal(fileHash(join(root, artifact.path)), artifact.hash, run + ' artifact differs')
        }
        if (existsSync(join(root, 'test-output.txt'))) {
          assert.match(readFileSync(join(root, 'test-output.txt'), 'utf8'), /pass [1-9]/)
        }
      }
    }
    if (recordedSkillTree !== undefined) {
      assert.equal(recordedSkillHash, recordedSkillTree, 'recorded run and skill tree disagree')
    }
  }
})

test('historical review integration evidence points to its answer-blind replacement', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr119')
  const evidenceReadme = readFileSync(join(evidenceRoot, 'README.md'), 'utf8')
  assert.match(evidenceReadme, /^> \*\*Historical status:\*\* these runs exposed `evals\/evals\.json`/m)
  assert.match(evidenceReadme, /not answer-blind/)
  assert.match(evidenceReadme, /tests\/skill-evals\/evidence\/2026-11-23-pr121\//)
  // A fresh checkout need not retain rewritten candidate OIDs for provenance that is no longer current.
  if (evidenceReadme.includes('**Historical status:**')) return
})

test('browser GIF model evidence binds inputs, scores, artifacts and trigger decisions', () => {
  const skill = 'dsh-spec-record-browser-gif'
  const historicalSkill = 'dsh-spec-browser-gif-evidence'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr115')
  const evidenceReadme = readFileSync(join(evidenceRoot, 'README.md'), 'utf8')
  assert.match(evidenceReadme, /^> \*\*Historical status:\*\* these runs predate the final fixture/m)
  assert.match(evidenceReadme, /2026-11-23-pr122\/dsh-spec-browser-gif-evidence\/real-ui-change/)
  const historicalInputs = readHashManifest(
    join(evidenceRoot, 'evaluation-files.sha256'),
    'browser GIF evaluation files',
  )
  const corpusRoot = join(EVAL_SOURCE_ROOT, skill)
  const historical = JSON.parse(readFileSync(join(evidenceRoot, 'scenario-definitions.json'), 'utf8')) as Record<
    string,
    Scenario[]
  >
  const behaviorScenarios = new Map([
    ['candidate-real', 'real-ui-change-uses-one-isolated-run'],
    ['candidate-absent', 'missing-capture-capability-hands-off'],
    ['candidate-fixture', 'explicit-fixture-recording-is-disclosed'],
  ])
  const historicalScenarios = new Map(
    (historical[historicalSkill] ?? []).map((scenario) => [scenario.id, scenario] as const),
  )
  for (const run of ['candidate-absent', 'candidate-fixture']) {
    const root = join(evidenceRoot, run)
    const recordedSkillHash = existsSync(join(root, 'skill-hashes.txt'))
      ? readSkillHashes(root).get(`skills/${historicalSkill}/SKILL.md`)
      : undefined
    const status = readFileSync(join(root, 'status.txt'), 'utf8')
    assert.match(status, /^status: pass$/m)
    assert.match(status, /^assertions: 4\/4$/m)
    if (run === 'candidate-real') {
      assert.match(status, /^evidence_status: historical$/m)
      assert.match(status, /^coherence: non-coherent$/m)
      assert.match(status, /^current_proof: false$/m)
    }
    const assertions = readFileSync(join(root, 'assertions.txt'), 'utf8').trim().split('\n')
    const scenario = historicalScenarios.get(behaviorScenarios.get(run) ?? '')
    assert.ok(scenario, run + ' names no scenario')
    assert.equal(assertions.length, 4, run + ' assertion count')
    assert.deepEqual(
      assertions.map((line) => line.replace(/^PASS /, '')),
      scenario.assertions,
      run + ' assertion text differs from the scenario',
    )
    assert.equal(
      assertions.every((line) => line.startsWith('PASS ')),
      true,
      run + ' has a failed assertion',
    )
    const finalText = readFileSync(join(root, 'final.md'), 'utf8')
    assert.ok(finalText.trim().length > 0)
    const trace = readFileSync(join(root, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string
            sha256?: string
            path?: string
            item?: { type?: string; command?: string; exit_code?: number }
          },
      )
    assert.equal(trace.at(-1)?.type, 'turn.completed', run + ' did not complete')
    const skillEvents = trace.filter((entry) => entry.type === 'skill')
    for (const event of skillEvents) {
      assert.equal(event.path, `.agents/skills/${historicalSkill}/SKILL.md`)
      if (recordedSkillHash !== undefined) assert.equal(event.sha256, recordedSkillHash)
    }
    assert.equal(
      trace.some(
        (entry) =>
          entry.type === 'item.completed' &&
          entry.item?.type === 'command_execution' &&
          entry.item.exit_code === 0 &&
          commandReadsSkill(entry.item.command, historicalSkill),
      ),
      true,
      run + ' trace context did not record a read of the candidate skill',
    )
    const manifests =
      run === 'candidate-absent' ? ['input-manifest.sha256'] : ['input-manifest.sha256', 'artifacts.sha256']
    for (const manifest of manifests) {
      const lines = readFileSync(join(root, manifest), 'utf8').trim().split('\n')
      if (manifest === 'input-manifest.sha256') {
        const inputEntries = lines.map((line) => parseHashPath(line, run + ' input manifest'))
        const scenario = historicalScenarios.get(behaviorScenarios.get(run) ?? '')
        assert.ok(scenario)
        assert.deepEqual(
          inputEntries.map((entry) => entry.path),
          scenario.files,
          run + ' input manifest does not match the declared scenario files',
        )
      }
      for (const line of lines) {
        const { hash, path: relative } = parseHashPath(line, run + ' evidence manifest')
        if (manifest === 'input-manifest.sha256') {
          assert.equal(
            historicalInputs.get(`tests/skill-evals/${historicalSkill}/${relative}`),
            hash,
            run + ' input differs from its recorded historical manifest: ' + relative,
          )
          continue
        }
        const artifact = join(root, relative ?? '')
        assertRegularEvidenceFile(artifact, run + ' artifact ' + relative)
        const target = readFileSync(artifact)
        assert.equal(createHash('sha256').update(target).digest('hex'), hash, run + ' changed ' + relative)
      }
    }
    if (run === 'candidate-absent') assert.equal(existsSync(join(root, 'artifact')), false)
  }
  for (const run of ['candidate-fixture']) {
    const artifactRoot = join(evidenceRoot, run, 'artifact')
    const gifs = listFiles(artifactRoot).filter((path) => path.endsWith('.gif'))
    assert.equal(gifs.length, 1, run + ' GIF count')
    assert.equal(
      readFileSync(join(artifactRoot, gifs[0] as string))
        .subarray(0, 3)
        .toString('ascii'),
      'GIF',
    )
    const reports = listFiles(artifactRoot).filter((path) => path.endsWith('/capture-report.json'))
    assert.equal(reports.length, 1, run + ' capture report count')
    const report = JSON.parse(readFileSync(join(artifactRoot, reports[0] as string), 'utf8')) as {
      origin: string
      states: Record<string, { status: string; button: string; disabled: boolean }>
    }
    assert.deepEqual(report.states.initial, {
      status: 'Unsaved changes',
      button: 'Save changes',
      disabled: false,
    })
    assert.deepEqual(report.states.saving, {
      status: 'Saving changes',
      button: 'Saving…',
      disabled: true,
    })
    assert.deepEqual(report.states.final, {
      status: 'Changes saved',
      button: 'Save changes',
      disabled: false,
    })
    if (run === 'candidate-real') {
      const final = readFileSync(join(evidenceRoot, run, 'final.md'), 'utf8')
      const finalOrigin = /http:\/\/127\.0\.0\.1:\d+/.exec(final)?.[0]
      const finalBytesText = /([\d,]+) bytes/.exec(final)?.[1]
      const gifBytes = statSync(join(artifactRoot, gifs[0] as string)).size
      assert.ok(finalOrigin)
      assert.ok(finalBytesText)
      const finalBytes = Number(finalBytesText.replaceAll(',', ''))
      assert.ok(Number.isSafeInteger(finalBytes))
      assert.notEqual(finalOrigin, report.origin, 'historical real final must not be treated as coherent')
      assert.notEqual(finalBytes, gifBytes, 'historical real final must not be treated as current media proof')
      assert.match(
        readFileSync(join(evidenceRoot, 'README.md'), 'utf8'),
        /Historical, non-coherent evidence/,
        'historical real evidence is not visibly downgraded',
      )
    }
  }

  const triggerInputs = new Map(
    readFileSync(join(evidenceRoot, 'trigger-input.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const entry = parseHashPath(line, 'browser GIF trigger input')
        return [entry.path, entry.hash] as const
      }),
  )
  assert.equal(triggerInputs.size, 3, 'historical browser GIF trigger input count differs')
  assert.deepEqual(
    [...triggerInputs].sort(([left], [right]) => left.localeCompare(right)),
    [
      [
        `tests/skill-evals/${historicalSkill}/trigger-evals.json`,
        '7bd1beef19f88046487800b8840c12f780d9287b8e61535e90450ed275927a6d',
      ],
      [
        `tests/skill-evals/${historicalSkill}/trigger-fixtures/AGENTS.md`,
        'e025241e4677dbe3dbf648628fc1424f351405be0779f09de350ef776e1cf972',
      ],
      [triggerSurfacePath(historicalSkill), '7180bb31efc276354b3ffac5f84c061e02e0db66078b6a472d75ee66c3f212fd'],
    ].sort(([left], [right]) => left.localeCompare(right)),
    'historical browser GIF trigger inputs changed',
  )

  const triggerCorpus = JSON.parse(readFileSync(join(corpusRoot, 'trigger-evals.json'), 'utf8')) as {
    skill_name: string
    queries: Array<{ id: string; should_trigger: boolean }>
  }
  assertTriggerCorpusIdentity(skill)
  const matrix = new Map(
    readFileSync(join(evidenceRoot, 'trigger-matrix.tsv'), 'utf8')
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => {
        const [id, shouldTrigger, selected, result] = line.split('\t')
        assert.ok(id && shouldTrigger && selected && result, 'malformed browser GIF trigger row')
        return [id, { shouldTrigger, selected, result }] as const
      }),
  )
  assert.equal(matrix.size, triggerCorpus.queries.length)
  for (const query of triggerCorpus.queries) {
    const row = matrix.get(query.id)
    assert.ok(row, 'missing browser GIF trigger row ' + query.id)
    const final = readFileSync(join(evidenceRoot, 'trigger', query.id, 'final.md'), 'utf8')
    const marker = final.trim().split('\n').at(-1)
    assert.ok(
      marker === 'SELECT: dsh-spec-browser-gif-evidence' || marker === 'SELECT: none',
      query.id + ' is missing a stable selection marker',
    )
    const selected = marker === 'SELECT: dsh-spec-browser-gif-evidence'
    const trace = readFileSync(join(evidenceRoot, 'trigger', query.id, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { type: string })
    assert.equal(trace.at(-1)?.type, 'turn.completed', query.id + ' did not complete')
    assert.equal(row.shouldTrigger, String(query.should_trigger))
    assert.equal(row.selected, String(selected))
    assert.equal(row.result, query.should_trigger === selected ? 'pass' : 'fail')
    assert.equal(row.result, 'pass')
    assert.ok(final.trim().length > 0)
  }
})

test('browser GIF publication evidence preserves local, moved-head, split and fail-closed state', () => {
  const skill = 'dsh-spec-record-browser-gif'
  const root = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue151', skill)
  const currentReadme = readFileSync(join(root, 'README.md'), 'utf8')
  assert.match(currentReadme, /five current behavior runs/i)
  assert.match(currentReadme, /explicit-fixture-recording-is-disclosed.*historical provenance/is)
  const artifactRoot = (run: string) => join(root, run, 'artifact/evals/files/publication-project/publication/cases')
  const readJson = <T>(run: string, relative: string): T =>
    JSON.parse(readFileSync(join(artifactRoot(run), relative), 'utf8')) as T

  const noPr = join(artifactRoot('no-pr-keeps-verified-evidence-local'), 'no-pr')
  assert.equal(existsSync(join(noPr, 'invocations.jsonl')), false, 'the no-PR run invoked the review platform')
  assert.equal(existsSync(join(noPr, 'remote.json')), false, 'the no-PR run changed remote state')
  assert.equal(statSync(join(noPr, 'evidence/demo.gif')).isFile(), true, 'the no-PR GIF is missing')
  assert.match(
    readFileSync(join(root, 'no-pr-keeps-verified-evidence-local/final.md'), 'utf8'),
    /No pull request|not performed/i,
  )

  const moved = artifactRoot('moved-live-head-stops-attachment')
  assert.deepEqual(
    readFileSync(join(moved, 'moved-head/invocations.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => (JSON.parse(line) as { event: string }).event),
    ['pr-view'],
    'the moved-head run performed a write',
  )
  assert.equal(existsSync(join(moved, 'moved-head/remote.json')), false, 'the moved-head run attached evidence')
  assert.match(
    readFileSync(join(root, 'moved-live-head-stops-attachment/final.md'), 'utf8'),
    /(?:pr edit.*not (?:run|invoked)|No `pr edit` or (?:upload|attachment) (?:occurred|was executed))/i,
  )

  const partial = readJson<{
    body: string
    operations: Array<{ attachments: Array<{ path: string }> }>
    uploads: Array<{ order: number; path: string }>
  }>('partial-attach-failure-reports-exact-state', 'partial/remote.json')
  assert.deepEqual(
    partial.operations[0]?.attachments.map((attachment) => attachment.path),
    ['publication/cases/partial/evidence/part-01.gif', 'publication/cases/partial/evidence/part-02.gif'],
  )
  assert.deepEqual(
    partial.uploads.map((upload) => [upload.order, upload.path]),
    [[1, 'publication/cases/partial/evidence/part-01.gif']],
  )
  assert.match(partial.body, /part-02\.gif\)/)
  assert.match(
    readFileSync(join(root, 'partial-attach-failure-reports-exact-state/final.md'), 'utf8'),
    /Attachment did not complete|Publication (?:failed|is incomplete)/i,
  )

  const unreferenced = readJson<{
    body: string
    uploads: Array<{ order: number; path: string; url: string }>
  }>('unreferenced-upload-fails-closed', 'unreferenced/remote.json')
  assert.deepEqual(
    unreferenced.uploads.map((upload) => [upload.order, upload.path]),
    [
      [1, 'publication/cases/unreferenced/evidence/part-01.gif'],
      [2, 'publication/cases/unreferenced/evidence/part-02.gif'],
    ],
  )
  assert.match(unreferenced.body, /assets\/151\/1-part-01\.gif/)
  assert.match(unreferenced.body, /\]\(publication\/cases\/unreferenced\/evidence\/part-02\.gif\)/)
  assert.doesNotMatch(unreferenced.body, /assets\/151\/2-part-02\.gif/)
  assert.match(
    readFileSync(join(root, 'unreferenced-upload-fails-closed/final.md'), 'utf8'),
    /not fully published|did not (?:complete|pass verification)|publication failed/i,
  )

  const manifest = readJson<{
    full: { bytes: number; temporary: boolean }
    maxBytes: number
    parts: Array<{ order: number; path: string; range: string }>
  }>('oversized-evidence-splits-in-order', 'split/evidence/split-manifest.json')
  assert.ok(manifest.full.bytes > manifest.maxBytes)
  assert.equal(manifest.full.temporary, true)
  assert.equal(
    existsSync(join(artifactRoot('oversized-evidence-splits-in-order'), 'split/evidence/overlimit.gif')),
    false,
    'the retained split evidence copied the temporary over-limit GIF',
  )
  assert.deepEqual(
    listFiles(root).filter((path) => statSync(join(root, path)).size > 1024 * 1024),
    [],
    'the retained publication evidence contains a large media file',
  )
  assert.deepEqual(
    manifest.parts.map((part) => [part.order, part.range]),
    [
      [1, '0.000-1.600s'],
      [2, '1.600-3.200s'],
    ],
  )
  const split = readJson<{
    body: string
    headAtEdit: string
    liveHead: string
    operations: Array<{ attachments: Array<{ path: string }> }>
    uploads: Array<{ order: number; path: string }>
  }>('oversized-evidence-splits-in-order', 'split/remote.json')
  assert.equal(split.headAtEdit, split.liveHead)
  assert.equal(split.operations.length, 1)
  assert.deepEqual(
    split.operations[0]?.attachments.map((attachment) => attachment.path),
    manifest.parts.map((part) => part.path),
  )
  assert.deepEqual(
    split.uploads.map((upload) => [upload.order, upload.path]),
    manifest.parts.map((part) => [part.order, part.path]),
  )
  assert.ok(split.body.indexOf('/1-part-01.gif') < split.body.indexOf('/2-part-02.gif'))
  assert.doesNotMatch(split.body, /\]\(publication\/cases\/split\/evidence\//)
  assert.match(
    readFileSync(join(root, 'oversized-evidence-splits-in-order/final.md'), 'utf8'),
    /exactly one uploaded reference per part in source order.*no unresolved local GIF references|exactly two ordered uploaded-image references.*no local references|exactly two remote image references.*no unresolved local references/i,
  )

  const historicalReadme = readFileSync(
    join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-20-pr115/README.md'),
    'utf8',
  )
  assert.match(historicalReadme, /^> \*\*Historical status:\*\*/m)
})

test('targeted model evidence binds current scenarios, inputs and recorded provenance', () => {
  const historicalEvidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-23-pr121')
  const historicalBrowserReadmePath = join(historicalEvidenceRoot, 'dsh-spec-browser-gif-evidence/README.md')
  assertEvidencePath(historicalEvidenceRoot, historicalBrowserReadmePath, 'historical browser README', 'file')
  const historicalBrowserReadme = readFileSync(historicalBrowserReadmePath, 'utf8')
  assert.match(historicalBrowserReadme, /^> \*\*Historical status:\*\* this run used the pre-final fixture/m)
  assert.match(historicalBrowserReadme, /2026-11-23-pr122\/dsh-spec-browser-gif-evidence\/real-ui-change/)
  assert.match(
    readFileSync(join(historicalEvidenceRoot, 'dsh-spec-translate-docs/README.md'), 'utf8'),
    /^> \*\*Historical status:\*\*/m,
    'PR121 translate-docs evidence is not visibly historical',
  )
  const skillsTreePath = join(historicalEvidenceRoot, 'skills-tree.sha256')
  assertEvidencePath(historicalEvidenceRoot, skillsTreePath, 'PR121 skills tree', 'file')
  const skillsTree = readSkillTreeManifest(skillsTreePath)
  const historicalInputsPath = join(historicalEvidenceRoot, 'evaluation-files.sha256')
  assertEvidencePath(historicalEvidenceRoot, historicalInputsPath, 'PR121 evaluation files', 'file')
  const historicalInputs = readHashManifest(historicalInputsPath, 'PR121 evaluation files')
  const pr122EvidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-23-pr122')
  const pr122PrDescriptionSkillTree = join(pr122EvidenceRoot, 'dsh-spec-pr-description', 'skills-tree.sha256')
  const issue140EvidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-issue-140')
  const historicalPrePushReadme = join(pr122EvidenceRoot, 'dsh-spec-pre-push-checks', 'README.md')
  assertEvidencePath(pr122EvidenceRoot, historicalPrePushReadme, 'PR122 pre-push README', 'file')
  assert.match(
    readFileSync(historicalPrePushReadme, 'utf8'),
    /^> \*\*Historical status:\*\* this run used the pre-routing-change `dsh-spec-pre-push-checks` skill tree\./m,
  )
  const pr141EvidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-pr141')
  assert.match(
    readFileSync(join(pr122EvidenceRoot, 'dsh-spec-translate-docs/README.md'), 'utf8'),
    /^> \*\*Historical status:\*\*/m,
    'pre-#142 translate-docs evidence is not visibly historical',
  )
  const pr142EvidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-pr142')
  const pr143EvidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-issue143')
  const issue147EvidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue-147')
  const proseEvidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue149')
  type EvidenceRun = {
    skill: string
    run: string
    evidenceSkill?: string
    evidenceRoot?: string
    current?: boolean
    historicalSkillTree?: string
    historicalInputs?: string
    historicalSkillRevision?: boolean
  }
  const runs: EvidenceRun[] = [
    { skill: 'dsh-spec-pr-description', run: 'stack-layer-replaces-legacy-ai-section' },
    { skill: 'dsh-spec-agent-notes', run: 'no-peer-uses-user-language' },
    { skill: 'dsh-spec-agent-notes', run: 'archive-readiness' },
    { skill: 'dsh-spec-agent-notes', run: 'external-companion-mechanism' },
    { skill: 'dsh-spec-translate-docs', run: 'local-update' },
    { skill: 'dsh-spec-translate-docs', run: 'explicit-multiple-targets-handoff' },
    { skill: 'dsh-spec-translate-docs', run: 'whole-document-handoff' },
    { skill: 'dsh-spec-translate-docs', run: 'target-removal' },
    { skill: 'dsh-spec-client-ui-ux', run: 'shared-widget-consumer-coverage' },
    { skill: 'dsh-spec-client-ui-ux', run: 'responsive-draft-and-touch-input' },
    {
      skill: 'dsh-spec-record-browser-gif',
      run: 'candidate-real',
      evidenceSkill: 'dsh-spec-browser-gif-evidence',
    },
    {
      skill: 'dsh-spec-code-review',
      run: 'review-with-integrated-guidance',
      evidenceRoot: pr141EvidenceRoot,
    },
    {
      skill: 'dsh-spec-code-review',
      run: 'review-without-siblings',
      evidenceRoot: pr141EvidenceRoot,
    },
    {
      skill: 'dsh-spec-code-review',
      run: 'review-ordinary-ui-with-optional-reports-absent',
      evidenceRoot: pr141EvidenceRoot,
    },
    {
      skill: 'dsh-spec-code-review',
      run: 'review-projection-state-size-history-and-migration',
      evidenceRoot: pr141EvidenceRoot,
    },
    {
      skill: 'dsh-spec-code-review',
      run: 'review-projection-rules-unavailable',
      evidenceRoot: pr141EvidenceRoot,
    },
    { skill: 'dsh-spec-error-handling', run: 'outcome-classification-and-extensible-codes' },
    { skill: 'dsh-spec-pre-push-checks', run: 'select-integrated-evidence' },
    { skill: 'dsh-spec-pre-push-checks', run: 'select-minimum-without-siblings' },
    {
      skill: 'dsh-spec-ci-test-reliability',
      run: 'diagnose-without-fixing',
      evidenceSkill: 'dsh-spec-test-reliability',
    },
    {
      skill: 'dsh-spec-ci-test-reliability',
      run: 'redesign-slow-repeated-suite',
      evidenceSkill: 'dsh-spec-test-reliability',
    },
    {
      skill: 'dsh-spec-pr-description',
      run: 'workspace-boundaries-expose-reverse-edge',
      evidenceRoot: pr122EvidenceRoot,
      historicalSkillTree: pr122PrDescriptionSkillTree,
      historicalSkillRevision: true,
    },
    {
      skill: 'dsh-spec-pr-description',
      run: 'stack-layer-replaces-legacy-ai-section',
      evidenceRoot: pr143EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-pr-description',
      run: 'tracked-issue-reference-count',
      evidenceRoot: pr143EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-pr-description',
      run: 'tracker-without-matching-issue',
      evidenceRoot: pr143EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-pr-description',
      run: 'unfinished-review-does-not-update',
      evidenceRoot: pr143EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-pr-description',
      run: 'handled-review-updates-ai-usage',
      evidenceRoot: pr143EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-prose-standard',
      run: 'coordinator-contract-survives-transcript-trim',
      evidenceRoot: proseEvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-prose-standard',
      run: 'control-flow-comment-keeps-load-order-contract',
      evidenceRoot: proseEvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-prose-standard',
      run: 'leakage-keeps-survive-mixed-readme-audit',
      evidenceRoot: proseEvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-code-review',
      run: 'review-dependency-edges-and-reverse-edge',
      evidenceRoot: pr141EvidenceRoot,
    },
    {
      skill: 'dsh-spec-code-review',
      run: 'review-cites-numbered-rule',
      evidenceRoot: pr141EvidenceRoot,
    },
    {
      skill: 'dsh-spec-pre-push-checks',
      run: 'select-rebase-refresh-with-rerere',
      evidenceRoot: pr122EvidenceRoot,
      current: false,
      historicalSkillTree: join(pr122EvidenceRoot, 'dsh-spec-pre-push-checks', 'skills-tree.sha256'),
      historicalInputs: join(pr122EvidenceRoot, 'dsh-spec-pre-push-checks', 'input-files.sha256'),
    },
    {
      skill: 'dsh-spec-error-handling',
      run: 'empty-catch-names-and-separates-operation',
      evidenceRoot: pr122EvidenceRoot,
      current: false,
      historicalSkillTree: join(
        pr122EvidenceRoot,
        'dsh-spec-error-handling/empty-catch-names-and-separates-operation/skill-hashes.txt',
      ),
      historicalInputs: join(pr122EvidenceRoot, 'dsh-spec-error-handling/evaluation-files.sha256'),
    },
    {
      skill: 'dsh-spec-error-handling',
      run: 'empty-catch-names-and-documents-safe-failure',
      evidenceRoot: pr122EvidenceRoot,
      current: false,
      historicalSkillTree: join(
        pr122EvidenceRoot,
        'dsh-spec-error-handling/empty-catch-names-and-documents-safe-failure/skill-hashes.txt',
      ),
      historicalInputs: join(pr122EvidenceRoot, 'dsh-spec-error-handling/evaluation-files.sha256'),
    },
    {
      skill: 'dsh-spec-error-handling',
      run: 'wrapper-preserves-cancellation-timeout-and-denial',
      evidenceRoot: pr122EvidenceRoot,
      current: false,
      historicalSkillTree: join(
        pr122EvidenceRoot,
        'dsh-spec-error-handling/wrapper-preserves-cancellation-timeout-and-denial/skill-hashes.txt',
      ),
      historicalInputs: join(pr122EvidenceRoot, 'dsh-spec-error-handling/evaluation-files.sha256'),
    },
    {
      skill: 'dsh-spec-error-handling',
      run: 'existing-project-identity-remains-authoritative',
      evidenceRoot: issue147EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-error-handling',
      run: 'silent-handler-covers-one-safe-failure',
      evidenceRoot: issue147EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-error-handling',
      run: 'worker-boundary-preserves-failure-identity',
      evidenceRoot: issue147EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-client-ui-ux',
      run: 'shared-icon-rendering-contract',
      evidenceRoot: pr122EvidenceRoot,
      current: false,
      historicalSkillTree: join(pr122EvidenceRoot, 'dsh-spec-client-ui-ux', 'skills-tree.sha256'),
      historicalInputs: join(pr122EvidenceRoot, 'dsh-spec-client-ui-ux', 'input-files.sha256'),
    },
    {
      skill: 'dsh-spec-client-ui-ux',
      run: 'spacing-grouping-and-overlay-fit',
      evidenceRoot: issue140EvidenceRoot,
      current: true,
    },
    {
      skill: 'dsh-spec-record-browser-gif',
      run: 'missing-capture-capability-hands-off',
      evidenceSkill: 'dsh-spec-browser-gif-evidence',
      evidenceRoot: pr122EvidenceRoot,
    },
    {
      skill: 'dsh-spec-record-browser-gif',
      run: 'real-ui-change-uses-one-isolated-run',
      evidenceSkill: 'dsh-spec-browser-gif-evidence',
      evidenceRoot: pr122EvidenceRoot,
    },
    {
      skill: 'dsh-spec-record-browser-gif',
      run: 'no-pr-keeps-verified-evidence-local',
      evidenceRoot: join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue151'),
      current: true,
    },
    {
      skill: 'dsh-spec-record-browser-gif',
      run: 'moved-live-head-stops-attachment',
      evidenceRoot: join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue151'),
      current: true,
    },
    {
      skill: 'dsh-spec-record-browser-gif',
      run: 'partial-attach-failure-reports-exact-state',
      evidenceRoot: join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue151'),
      current: true,
    },
    {
      skill: 'dsh-spec-record-browser-gif',
      run: 'unreferenced-upload-fails-closed',
      evidenceRoot: join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue151'),
      current: true,
    },
    {
      skill: 'dsh-spec-record-browser-gif',
      run: 'oversized-evidence-splits-in-order',
      evidenceRoot: join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-26-issue151'),
      current: true,
    },
    {
      skill: 'dsh-spec-merging-stacked-prs',
      run: 'refresh-stack-with-rerere',
      evidenceRoot: pr122EvidenceRoot,
    },
    {
      skill: 'dsh-spec-merging-stacked-prs',
      run: 'dependency-only-blocked-stack-can-land',
      evidenceRoot: pr122EvidenceRoot,
    },
    {
      skill: 'dsh-spec-translate-docs',
      run: 'source-rename-keeps-pair',
      evidenceRoot: pr122EvidenceRoot,
      current: false,
      historicalSkillTree: join(pr122EvidenceRoot, 'dsh-spec-translate-docs', 'skills-tree.sha256'),
      historicalInputs: join(pr122EvidenceRoot, 'dsh-spec-translate-docs', 'input-files.sha256'),
    },
    {
      skill: 'dsh-spec-translate-docs',
      run: 'locale-selected-pages-are-unpaired',
      evidenceRoot: pr122EvidenceRoot,
      current: false,
      historicalSkillTree: join(pr122EvidenceRoot, 'dsh-spec-translate-docs', 'skills-tree.sha256'),
      historicalInputs: join(pr122EvidenceRoot, 'dsh-spec-translate-docs', 'input-files.sha256'),
    },
    {
      skill: 'dsh-spec-translate-docs',
      run: 'briefing-style',
      evidenceRoot: pr142EvidenceRoot,
      current: true,
    },
  ]
  const scenarioIds: Record<string, string> = {
    'dsh-spec-pr-description:stack-layer-replaces-legacy-ai-section': 'stack-layer-replaces-legacy-ai-section',
    'dsh-spec-agent-notes:no-peer-uses-user-language': 'no-peer-uses-user-language',
    'dsh-spec-agent-notes:archive-readiness': 'archive-readiness-required',
    'dsh-spec-agent-notes:external-companion-mechanism': 'external-companion-mechanism',
    'dsh-spec-translate-docs:local-update': 'no-isolation-local-update-completes',
    'dsh-spec-translate-docs:explicit-multiple-targets-handoff': 'explicit-multiple-targets-handoff',
    'dsh-spec-translate-docs:whole-document-handoff': 'no-isolation-whole-document-handoff',
    'dsh-spec-translate-docs:target-removal': 'target-removal-active-scope',
    'dsh-spec-client-ui-ux:shared-widget-consumer-coverage': 'shared-widget-consumer-coverage',
    'dsh-spec-client-ui-ux:responsive-draft-and-touch-input': 'responsive-draft-and-touch-input',
    'dsh-spec-record-browser-gif:candidate-real': 'real-ui-change-uses-one-isolated-run',
    'dsh-spec-code-review:review-with-integrated-guidance': 'review-with-integrated-guidance',
    'dsh-spec-code-review:review-without-siblings': 'review-without-siblings',
    'dsh-spec-error-handling:outcome-classification-and-extensible-codes':
      'outcome-classification-and-extensible-codes',
    'dsh-spec-pre-push-checks:select-integrated-evidence': 'select-integrated-evidence',
    'dsh-spec-pre-push-checks:select-minimum-without-siblings': 'select-minimum-without-siblings',
    'dsh-spec-pre-push-checks:select-rebase-refresh-with-rerere': 'select-rebase-refresh-with-rerere',
    'dsh-spec-ci-test-reliability:diagnose-without-fixing': 'diagnose-without-fixing',
    'dsh-spec-ci-test-reliability:redesign-slow-repeated-suite': 'redesign-slow-repeated-suite',
    'dsh-spec-pr-description:workspace-boundaries-expose-reverse-edge': 'workspace-boundaries-expose-reverse-edge',
    'dsh-spec-pr-description:tracked-issue-reference-count': 'tracked-issue-reference-count',
    'dsh-spec-pr-description:tracker-without-matching-issue': 'tracker-without-matching-issue',
    'dsh-spec-pr-description:unfinished-review-does-not-update': 'unfinished-review-does-not-update',
    'dsh-spec-pr-description:handled-review-updates-ai-usage': 'handled-review-updates-ai-usage',
    'dsh-spec-prose-standard:coordinator-contract-survives-transcript-trim':
      'coordinator-contract-survives-transcript-trim',
    'dsh-spec-prose-standard:control-flow-comment-keeps-load-order-contract':
      'control-flow-comment-keeps-load-order-contract',
    'dsh-spec-prose-standard:leakage-keeps-survive-mixed-readme-audit': 'leakage-keeps-survive-mixed-readme-audit',
    'dsh-spec-code-review:review-dependency-edges-and-reverse-edge': 'review-dependency-edges-and-reverse-edge',
    'dsh-spec-code-review:review-cites-numbered-rule': 'review-cites-numbered-rule',
    'dsh-spec-code-review:review-ordinary-ui-with-optional-reports-absent':
      'review-ordinary-ui-with-optional-reports-absent',
    'dsh-spec-code-review:review-projection-state-size-history-and-migration':
      'review-projection-state-size-history-and-migration',
    'dsh-spec-code-review:review-projection-rules-unavailable': 'review-projection-rules-unavailable',
    'dsh-spec-error-handling:empty-catch-names-and-separates-operation': 'empty-catch-names-and-separates-operation',
    'dsh-spec-error-handling:empty-catch-names-and-documents-safe-failure':
      'empty-catch-names-and-documents-safe-failure',
    'dsh-spec-error-handling:wrapper-preserves-cancellation-timeout-and-denial':
      'wrapper-preserves-cancellation-timeout-and-denial',
    'dsh-spec-error-handling:existing-project-identity-remains-authoritative':
      'existing-project-identity-remains-authoritative',
    'dsh-spec-error-handling:silent-handler-covers-one-safe-failure': 'silent-handler-covers-one-safe-failure',
    'dsh-spec-error-handling:worker-boundary-preserves-failure-identity': 'worker-boundary-preserves-failure-identity',
    'dsh-spec-client-ui-ux:shared-icon-rendering-contract': 'shared-icon-rendering-contract',
    'dsh-spec-client-ui-ux:spacing-grouping-and-overlay-fit': 'spacing-grouping-and-overlay-fit',
    'dsh-spec-record-browser-gif:missing-capture-capability-hands-off': 'missing-capture-capability-hands-off',
    'dsh-spec-record-browser-gif:real-ui-change-uses-one-isolated-run': 'real-ui-change-uses-one-isolated-run',
    'dsh-spec-record-browser-gif:no-pr-keeps-verified-evidence-local': 'no-pr-keeps-verified-evidence-local',
    'dsh-spec-record-browser-gif:moved-live-head-stops-attachment': 'moved-live-head-stops-attachment',
    'dsh-spec-record-browser-gif:partial-attach-failure-reports-exact-state':
      'partial-attach-failure-reports-exact-state',
    'dsh-spec-record-browser-gif:unreferenced-upload-fails-closed': 'unreferenced-upload-fails-closed',
    'dsh-spec-record-browser-gif:oversized-evidence-splits-in-order': 'oversized-evidence-splits-in-order',
    'dsh-spec-merging-stacked-prs:refresh-stack-with-rerere': 'refresh-stack-with-rerere',
    'dsh-spec-merging-stacked-prs:dependency-only-blocked-stack-can-land': 'dependency-only-blocked-stack-can-land',
    'dsh-spec-translate-docs:source-rename-keeps-pair': 'source-rename-keeps-pair',
    'dsh-spec-translate-docs:locale-selected-pages-are-unpaired': 'locale-selected-pages-are-unpaired',
    'dsh-spec-translate-docs:briefing-style': 'briefing-is-delta-plus-style-source',
  }
  const requiredCommands: Record<string, RegExp[]> = {
    'dsh-spec-record-browser-gif:candidate-real': [
      /npm run build(?:\s|$|['"])/,
      /npm run evidence(?:\s|$|['"])/,
      /encode-browser-gif\.mjs/,
      /ffprobe(?:\s|$|['"])/,
    ],
    'dsh-spec-record-browser-gif:real-ui-change-uses-one-isolated-run': [
      /npm run build(?:\s|$|['"])/,
      /npm run evidence(?:\s|$|['"])/,
      /encode-browser-gif\.mjs/,
    ],
    'dsh-spec-record-browser-gif:no-pr-keeps-verified-evidence-local': [
      /prepare-publication-fixture\.mjs no-pr(?:\s|$|['"])/,
    ],
    'dsh-spec-record-browser-gif:moved-live-head-stops-attachment': [
      /dsh-spec-record-browser-gif\/references\/publication\.md/,
      /bin\/gh pr view 151(?:\s|$|['"])/,
    ],
    'dsh-spec-record-browser-gif:partial-attach-failure-reports-exact-state': [
      /dsh-spec-record-browser-gif\/references\/publication\.md/,
      /prepare-publication-fixture\.mjs partial(?:\s|$|['"])/,
      /bin\/gh pr view 151(?:\s|$|['"])/,
    ],
    'dsh-spec-record-browser-gif:unreferenced-upload-fails-closed': [
      /dsh-spec-record-browser-gif\/references\/publication\.md/,
      /prepare-publication-fixture\.mjs unreferenced(?:\s|$|['"])/,
      /bin\/gh pr view 151(?:\s|$|['"])/,
      /bin\/gh pr edit 151.*part-01\.gif.*part-02\.gif/,
    ],
    'dsh-spec-record-browser-gif:oversized-evidence-splits-in-order': [
      /dsh-spec-record-browser-gif\/references\/publication\.md/,
      /prepare-publication-fixture\.mjs split(?:\s|$|['"])/,
      /ffprobe(?:\s|$|['"])/,
      /bin\/gh pr edit 151.*part-01\.gif.*part-02\.gif/,
    ],
    'dsh-spec-ci-test-reliability:redesign-slow-repeated-suite': [
      /npm test(?:\s|$|['"])/,
      /npm run test:contract(?:\s|$|['"])/,
      /npm run test:integration(?:\s|$|['"])/,
    ],
    'dsh-spec-translate-docs:briefing-style': [
      /translate-pair\.mjs\s+brief(?:\s|$).*--root(?:\s|$)/,
      /docs\/style\.md(?:\s|$|['"])/,
      /\.agents\/dsh-spec-translate-docs\/terminology\.md(?:\s|$|['"])/,
      /references\/translation-rules\.md(?:\s|$|['"])/,
    ],
  }
  const expectedFailureCommands: Record<string, RegExp[]> = {
    'dsh-spec-record-browser-gif:partial-attach-failure-reports-exact-state': [
      /bin\/gh pr edit 151.*part-01\.gif.*part-02\.gif/,
    ],
  }

  for (const item of runs) {
    const runEvidenceRoot = item.evidenceRoot ?? historicalEvidenceRoot
    const evidenceSkill = item.evidenceSkill ?? item.skill
    const root = join(runEvidenceRoot, evidenceSkill, item.run)
    assertEvidencePath(runEvidenceRoot, root, evidenceSkill + '/' + item.run + ' run', 'directory')
    const scenarioId = scenarioIds[`${item.skill}:${item.run}`]
    assert.ok(scenarioId, item.skill + '/' + item.run + ' has no behavior id')
    const scenario = readCorpus(item.skill).evals.find((entry) => entry.id === scenarioId)
    assert.ok(scenario, item.skill + '/' + item.run + ' names no current scenario')
    const current = item.current ?? (item.evidenceRoot === pr122EvidenceRoot || item.evidenceRoot === pr141EvidenceRoot)
    const scenarioDefinitionFile = join(root, 'scenario-definition.json')
    assertEvidencePath(root, scenarioDefinitionFile, item.skill + '/' + item.run + ' scenario definition', 'file')
    assertRegularEvidenceFile(scenarioDefinitionFile, item.skill + '/' + item.run + ' scenario definition')
    const recordedScenario = validateRecordedScenario(
      item.skill,
      JSON.parse(readFileSync(scenarioDefinitionFile, 'utf8')),
      item.skill + '/' + item.run + ' scenario definition',
    )
    const requiredRunFiles = [
      'input-manifest.sha256',
      'skill-hashes.txt',
      'status.txt',
      'assertions.txt',
      'final.md',
      'trace.jsonl',
      'artifacts.sha256',
    ]
    if (current) requiredRunFiles.push('assertions.expected.txt')
    for (const file of requiredRunFiles) {
      const path = join(root, file)
      if (file === 'skill-hashes.txt' && existsSync(join(root, 'skill.sha256'))) continue
      assertEvidencePath(root, path, item.skill + '/' + item.run + ' ' + file, 'file')
      assertRegularEvidenceFile(path, item.skill + '/' + item.run + ' ' + file)
    }
    assertAnswerBlindTrace(root)
    assertEvidencePath(
      root,
      join(root, 'scenario-definition.sha256'),
      item.skill + '/' + item.run + ' scenario hash',
      'file',
    )
    assert.equal(
      readFileSync(join(root, 'scenario-definition.sha256'), 'utf8').trim(),
      `${scenarioDefinitionHash(recordedScenario)}  ${evidenceSkill}:${scenarioId}`,
      item.skill + '/' + item.run + ' scenario definition differs',
    )
    const evidenceMetadataPath = join(root, 'evidence.json')
    const executionProfilePath = join(root, 'execution.json')
    assert.equal(
      existsSync(evidenceMetadataPath),
      existsSync(executionProfilePath),
      item.skill + '/' + item.run + ' has an incomplete evidence metadata pair',
    )
    if (existsSync(evidenceMetadataPath)) {
      assertRegularEvidenceFile(evidenceMetadataPath, item.skill + '/' + item.run + ' evidence metadata')
      assertRegularEvidenceFile(executionProfilePath, item.skill + '/' + item.run + ' execution profile')
      const metadataRecord = evidencePolicy.readEvidenceMetadataRecord(root)
      assert.equal(
        metadataRecord.metadata.claim.subject,
        `${item.skill}:${scenarioId}`,
        item.skill + '/' + item.run + ' evidence metadata names another subject',
      )
      assert.deepEqual(
        evidencePolicy.inspectRetainedRun(root, metadataRecord.metadata).scenario,
        recordedScenario,
        item.skill + '/' + item.run + ' evidence metadata differs from its scenario',
      )
    }
    if (current) assert.deepEqual(recordedScenario, scenario, item.skill + '/' + item.run + ' is not current')
    const effectiveScenario = current ? scenario : recordedScenario
    const renamedEvidence = evidenceSkill !== item.skill
    if (current) {
      assertEvidencePath(root, join(root, 'capabilities.json'), item.skill + '/' + item.run + ' capabilities', 'file')
      assert.deepEqual(
        JSON.parse(readFileSync(join(root, 'capabilities.json'), 'utf8')),
        {
          auth: 'host-proxy',
          browser: effectiveScenario.capabilities?.browser ?? false,
          media: effectiveScenario.capabilities?.media ?? false,
          sandbox: 'workspace-write',
          subagents: effectiveScenario.allow_subagents ?? false,
        },
        item.skill + '/' + item.run + ' capability profile differs',
      )
    }
    if (current && renamedEvidence && item.historicalSkillRevision !== true) {
      assert.equal(
        item.skill,
        'dsh-spec-record-browser-gif',
        item.skill + '/' + item.run + ' has no name-only revision policy',
      )
      assertBrowserNameOnlyProvenance(root, evidenceSkill)
    } else if (item.historicalSkillRevision === true) {
      assert.ok(item.historicalSkillTree, item.skill + '/' + item.run + ' has no historical skill tree')
      assertEvidencePath(
        runEvidenceRoot,
        item.historicalSkillTree,
        item.skill + '/' + item.run + ' historical skill tree',
        'file',
      )
      assertHistoricalSkillRevision(
        root,
        evidenceSkill,
        effectiveScenario.install ?? [],
        readSkillTreeManifest(item.historicalSkillTree),
      )
    } else if (current) {
      assertBehaviorSkillProvenance(root, evidenceSkill, effectiveScenario.install ?? [])
    } else if (!current) {
      const revisionTree = item.historicalSkillTree ? readSkillTreeManifest(item.historicalSkillTree) : skillsTree
      assertHistoricalSkillRevision(root, evidenceSkill, effectiveScenario.install ?? [], revisionTree)
    }
    const status = readFileSync(join(root, 'status.txt'), 'utf8')
    assert.match(status, /^status: pass$/m, item.skill + '/' + item.run)
    assert.match(status, /^run_exit_code: 0$/m, item.skill + '/' + item.run)
    const recordedAssertionCount = Number(/^assertions: (\d+)\/\1$/m.exec(status)?.[1])
    assert.ok(recordedAssertionCount > 0, item.skill + '/' + item.run + ' has no passing assertion count')
    const graded = readFileSync(join(root, 'assertions.txt'), 'utf8').trim().split('\n')
    const expectedAssertions = effectiveScenario.assertions
    assert.equal(graded.length, expectedAssertions.length, item.skill + '/' + item.run + ' assertion count')
    assert.equal(
      recordedAssertionCount,
      expectedAssertions.length,
      item.skill + '/' + item.run + ' status count differs from its assertions',
    )
    assert.deepEqual(
      graded.map((line) => line.replace(/^PASS /, '')),
      expectedAssertions,
      item.skill + '/' + item.run + ' assertion text differs',
    )
    assert.equal(
      graded.every((line) => line.startsWith('PASS ')),
      true,
      item.skill + '/' + item.run + ' has a failed assertion',
    )
    if (current) assertExpectedAssertions(root, expectedAssertions, item.skill + '/' + item.run)
    const finalText = readFileSync(join(root, 'final.md'), 'utf8')
    assert.ok(finalText.trim().length > 0)

    const inputManifest = readFileSync(join(root, 'input-manifest.sha256'), 'utf8').trim()
    const inputs = (inputManifest ? inputManifest.split('\n') : []).map((line) => {
      const match = /^([0-9a-f]{64})  (.+)  mode=([0-7]{4})$/.exec(line)
      assert.ok(match, item.skill + '/' + item.run + ' has a malformed input manifest line')
      const [, hash, relative, mode] = match
      return { hash, relative, mode }
    })
    assert.deepEqual(
      inputs.map((entry) => entry.relative).sort(),
      [...(effectiveScenario.files ?? [])].sort(),
      item.skill + '/' + item.run + ' input manifest differs',
    )
    if (current) {
      for (const entry of inputs) {
        const path = join(EVAL_SOURCE_ROOT, item.skill, entry.relative ?? '')
        const stat = lstatSync(path)
        assert.equal(stat.isSymbolicLink(), false, item.skill + '/' + item.run + ' input is a symbolic link')
        assert.equal(stat.isFile(), true, item.skill + '/' + item.run + ' input is not a regular file')
        assert.equal(
          createHash('sha256').update(readFileSync(path)).digest('hex'),
          entry.hash,
          item.skill + '/' + item.run + ' input changed: ' + entry.relative,
        )
        assert.equal(entry.mode, fileMode(path), item.skill + '/' + item.run + ' input mode changed: ' + entry.relative)
      }
    } else {
      const recordedHistoricalInputs = item.historicalInputs
        ? readHashManifest(item.historicalInputs, item.skill + '/' + item.run + ' historical inputs')
        : historicalInputs
      for (const entry of inputs) {
        assert.equal(
          recordedHistoricalInputs.get(`tests/skill-evals/${evidenceSkill}/${entry.relative}`),
          entry.hash,
          item.skill + '/' + item.run + ' input differs from its recorded historical manifest: ' + entry.relative,
        )
      }
    }

    const skillHashFile = join(root, 'skill.sha256')
    if (existsSync(skillHashFile)) {
      assertEvidencePath(root, skillHashFile, item.skill + '/' + item.run + ' skill hash', 'file')
      assertRegularEvidenceFile(skillHashFile, item.skill + '/' + item.run + ' skill hash')
    }
    const skillRevisions = new Map<string, string>()
    const skillModes = new Map<string, string>()
    const skillHashText = readFileSync(
      existsSync(skillHashFile) ? skillHashFile : join(root, 'skill-hashes.txt'),
      'utf8',
    )
    for (const line of skillHashText.trim().split('\n')) {
      if (/^[0-9a-f]{64}$/.test(line)) {
        skillRevisions.set(`skills/${evidenceSkill}/SKILL.md`, line)
        continue
      }
      const entry = parseHashPath(line, item.skill + '/' + item.run)
      skillRevisions.set(entry.path, entry.hash)
      if (entry.mode) skillModes.set(entry.path, entry.mode)
    }
    const recordedSkillHash = skillRevisions.get(`skills/${evidenceSkill}/SKILL.md`)
    assert.ok(recordedSkillHash, item.skill + '/' + item.run + ' records no target skill hash')
    if (current && evidenceSkill === item.skill) {
      for (const path of skillRevisions.keys()) {
        assert.equal(
          skillModes.get(path),
          fileMode(join(REPO_ROOT, path)),
          item.skill + '/' + item.run + ' skill mode changed: ' + path,
        )
      }
    }
    const trace = readFileSync(join(root, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            type: string
            path?: string
            sha256?: string
            command?: string
            exit_code?: number | null
            item?: { type?: string; command?: string; exit_code?: number; aggregated_output?: string }
          },
      )
    assert.equal(trace.at(-1)?.type, 'turn.completed', item.skill + '/' + item.run + ' did not complete')
    const commands: Array<{
      command?: string
      exit_code?: number | null
      aggregated_output?: string
    }> = []
    for (const entry of trace) {
      if (entry.type === 'item.completed' && entry.item?.type === 'command_execution') commands.push(entry.item)
      else if (entry.type === 'command') {
        commands.push({ command: entry.command, exit_code: entry.exit_code })
      }
    }
    for (const pattern of requiredCommands[`${item.skill}:${item.run}`] ?? []) {
      assert.ok(
        commands.some((entry) => entry.exit_code === 0 && pattern.test(entry.command ?? '')),
        item.skill + '/' + item.run + ' trace context did not record required command ' + pattern,
      )
    }
    for (const pattern of expectedFailureCommands[`${item.skill}:${item.run}`] ?? []) {
      assert.ok(
        commands.some(
          (entry) => entry.exit_code !== null && entry.exit_code !== 0 && pattern.test(entry.command ?? ''),
        ),
        item.skill + '/' + item.run + ' trace context did not record expected failing command ' + pattern,
      )
    }
    for (const [path, expectedHash] of skillRevisions) {
      if (!path.endsWith('/SKILL.md')) continue
      const match = /^skills\/([^/]+)\/SKILL\.md$/.exec(path)
      assert.ok(match, item.skill + '/' + item.run + ' has a malformed skill path: ' + path)
      const name = match[1] ?? ''
      const reads = commands.filter((entry) => entry.exit_code === 0 && commandPrintsSkill(entry.command, name))
      const events = trace.filter(
        (entry) => entry.type === 'skill' && entry.sha256 === expectedHash && entry.path?.endsWith(`/${path}`) === true,
      )
      const conflictingEvents = trace.filter(
        (entry) =>
          entry.type === 'skill' &&
          entry.path?.endsWith(`/${path}`) === true &&
          entry.sha256 !== undefined &&
          entry.sha256 !== expectedHash,
      )
      assert.deepEqual(conflictingEvents, [], item.skill + '/' + item.run + ' observed another revision of ' + name)
      assert.ok(reads.length > 0, item.skill + '/' + item.run + ' trace context did not record a read of ' + name)
      const observedHashes = reads.flatMap((read) => {
        if (read.aggregated_output === undefined) return []
        const candidates = [read.aggregated_output]
        for (
          let frontmatter = read.aggregated_output.indexOf('---\n');
          frontmatter >= 0;
          frontmatter = read.aggregated_output.indexOf('---\n', frontmatter + 4)
        ) {
          if (!read.aggregated_output.startsWith('name:', frontmatter + 4)) continue
          candidates.push(read.aggregated_output.slice(frontmatter))
          break
        }
        if (current && evidenceSkill === item.skill) {
          const skillText = readFileSync(join(REPO_ROOT, path), 'utf8')
          if (read.aggregated_output.includes(skillText)) candidates.push(skillText)
        }
        return candidates.map((output) => createHash('sha256').update(output).digest('hex'))
      })
      const unverifiableReads = reads.filter((read) => read.aggregated_output === undefined).length
      assert.ok(
        events.length >= unverifiableReads,
        item.skill + '/' + item.run + ' has an unverifiable read of ' + name,
      )
      observedHashes.push(...events.flatMap((entry) => (entry.sha256 ? [entry.sha256] : [])))
      assert.ok(observedHashes.length > 0, item.skill + '/' + item.run + ' has no revision evidence for ' + name)
      assert.ok(
        observedHashes.includes(expectedHash),
        item.skill + '/' + item.run + ' did not observe the recorded revision for ' + name,
      )
    }

    const artifactManifest = join(root, 'artifacts.sha256')
    const artifactDir = join(root, 'artifact')
    assertEvidencePath(root, artifactManifest, item.skill + '/' + item.run + ' artifact manifest', 'file')
    assert.ok(existsSync(artifactManifest), item.skill + '/' + item.run + ' is missing its artifact manifest')
    {
      const manifestText = readFileSync(artifactManifest, 'utf8').trim()
      const manifestLines = manifestText ? manifestText.split('\n') : []
      const listedArtifacts = manifestLines.map((line) => {
        const { hash, path: artifactPath } = parseHashPath(line, item.skill + '/' + item.run)
        assert.ok(artifactPath, item.skill + '/' + item.run + ' has an empty artifact path')
        const retained = join(root, artifactPath)
        const local = relative(root, retained)
        assert.equal(
          isAbsolute(local) || local.startsWith(`..${sep}`),
          false,
          item.skill + '/' + item.run + ' escapes its evidence root',
        )
        assert.ok(existsSync(retained), item.skill + '/' + item.run + ' is missing artifact: ' + artifactPath)
        assertEvidencePath(root, retained, item.skill + '/' + item.run + ' artifact ' + artifactPath, 'file')
        assertRegularEvidenceFile(retained, item.skill + '/' + item.run + ' artifact ' + artifactPath)
        assert.equal(
          createHash('sha256').update(readFileSync(retained)).digest('hex'),
          hash,
          item.skill + '/' + item.run + ' changed artifact: ' + artifactPath,
        )
        return artifactPath
      })
      if (existsSync(artifactDir)) {
        assertEvidencePath(root, artifactDir, item.skill + '/' + item.run + ' artifact root', 'directory')
        const actualArtifacts = listFiles(artifactDir).map((path) => `artifact/${path}`)
        assert.deepEqual(
          listedArtifacts.filter((path) => path.startsWith('artifact/')).sort(),
          actualArtifacts,
          item.skill + '/' + item.run + ' artifact manifest does not cover the artifact directory exactly',
        )
      }
      if (
        current &&
        item.skill === 'dsh-spec-record-browser-gif' &&
        item.run === 'real-ui-change-uses-one-isolated-run'
      ) {
        const gifs = listedArtifacts.filter((path) => path.endsWith('.gif'))
        assert.equal(gifs.length, 1, 'the real browser run must retain one GIF')
        const gif = join(root, gifs[0] as string)
        const gifSize = lstatSync(gif).size
        assert.ok(
          [String(gifSize), gifSize.toLocaleString('en-US')].some((value) => finalText.includes(value + ' bytes')),
          'the final report names another GIF',
        )
      }
    }
    if (current && item.skill === 'dsh-spec-translate-docs' && item.run === 'briefing-style') {
      assert.equal(
        readFileSync(join(root, 'changed-paths.txt'), 'utf8').trim(),
        '',
        'briefing handoff edited files without working separation',
      )
      assert.match(
        finalText,
        /canonical briefing|change-local/i,
        'briefing evidence claims the brief is self-contained',
      )
      assert.match(finalText, /docs\/style\.md/, 'briefing handoff omits the declared style source')
      assert.match(finalText, /terminology/i, 'briefing handoff omits the terminology read')
      assert.match(finalText, /guide\.zh\.md/i, 'briefing handoff omits the pending counterpart')
      assert.match(finalText, /record/i, 'briefing handoff omits the pending record')
      assert.match(finalText, /check/i, 'briefing handoff omits the pending pair check')
    }
    const replayable = replayEvidencePatch(root, item.skill, effectiveScenario)
    if (current) assert.equal(replayable, true, item.skill + '/' + item.run + ' is not replayable from its inputs')
    else if (!replayable) {
      assert.match(
        readFileSync(join(historicalEvidenceRoot, 'README.md'), 'utf8'),
        /historical/i,
        item.skill + '/' + item.run + ' is not replayable but its evidence is not marked historical',
      )
    }
  }

  const prDescriptionRoot = join(pr143EvidenceRoot, 'dsh-spec-pr-description')
  const prDescriptionRun = join(prDescriptionRoot, 'stack-layer-replaces-legacy-ai-section')
  assert.ok(
    traceCommandsFor(prDescriptionRun).some((command) =>
      commandPrintsFile(command, '.agents/skills/dsh-spec-pr-description/references/ai-usage.md'),
    ),
    'PR description trace context did not record a read of the current AI Usage reference',
  )
  const prBody = readFileSync(join(prDescriptionRun, 'artifact/evals/files/project/pr-body.md'), 'utf8')
  assert.doesNotMatch(prBody, /^## Human and Agent Roles$/m)
  assert.equal(prBody.match(/^## AI Usage$/gm)?.length, 1)
  assert.equal(prBody.match(/ai-declaration:start/g)?.length, 1)
  assert.doesNotMatch(prBody, /labels?:|Project fields?:|Start Date|telemetry/i)

  const proseRoot = join(proseEvidenceRoot, 'dsh-spec-prose-standard')
  const coordinatorDoc = readFileSync(
    join(
      proseRoot,
      'coordinator-contract-survives-transcript-trim/artifact/evals/files/coordinator/docs/coordinator.md',
    ),
    'utf8',
  )
  assert.match(coordinatorDoc, /serializes writes (?:within (?:a|each) session|per session|to a backend by session)/i)
  assert.match(coordinatorDoc, /different sessions\s+(?:can|may)[\s\S]*independently/i)
  assert.match(
    coordinatorDoc,
    /slow backend(?:\s+(?:call|operation|write))?\s+in one session\s+(?:must not|does not)[\s\S]*block\s+another session/i,
  )
  assert.match(
    coordinatorDoc,
    /(?:(?:calls|submissions)\s+(?:to|through)\s+`write\(\)`\s+reject|`write\(\)`\s+calls\s+reject|`write\(\)`\s+rejects new submissions)/i,
  )
  assert.match(coordinatorDoc, /`coordinator is closing`/)
  assert.match(
    coordinatorDoc,
    /writes\s+accepted\s+before\s+disposal\s+(?:drain|complete)\s+before\s+buffered\s+events\s+are\s+flushed/i,
  )
  assert.match(coordinatorDoc, /(?:`dispose\(\)`|disposal\s+promise) resolves only after[\s\S]*flush completes/i)
  assert.match(
    coordinatorDoc,
    /flush(?:BufferedEvents\(\)| buffered events)[\s\S]*reject[\s\S]*(?:`dispose\(\)`|disposal)[\s\S]*error/i,
  )
  assert.match(coordinatorDoc, /(?:preserves|reports)\s+(?:that\s+|the\s+)?same backend error/i)
  assert.match(coordinatorDoc, /caller(?: that\s+submitted|'s promise)/i)
  assert.match(coordinatorDoc, /does not retry/i)
  assert.match(
    coordinatorDoc,
    /queued behind (?:the )?(?:failed|rejected) write[\s\S]*same backend error[\s\S]*without reaching the backend/i,
  )
  assert.match(coordinatorDoc, /(?:public API(?: surface)?|public surface) is unstable/i)
  assert.match(coordinatorDoc, /no compatibility (?:guarantee|promise)/i)
  assert.doesNotMatch(coordinatorDoc, /First I|old draft|rejected in review|This change/i)

  const pluginSource = readFileSync(
    join(EVAL_SOURCE_ROOT, 'dsh-spec-prose-standard/evals/files/plugin-order/src/register-tools.ts'),
    'utf8',
  )
  const pluginArtifact = readFileSync(
    join(
      proseRoot,
      'control-flow-comment-keeps-load-order-contract/artifact/evals/files/plugin-order/src/register-tools.ts',
    ),
    'utf8',
  )
  assert.doesNotMatch(pluginArtifact, /First read|Next sort|Then create|After that|Finally return/)
  assert.match(pluginArtifact, /Loading policy before the model-facing tools/)
  assert.match(pluginArtifact, /write and edit call[\s\S]*read-before-mutation gate/)
  const withoutBlockComment = (text: string) => text.replace(/\/\*[\s\S]*?\*\//, '')
  assert.equal(withoutBlockComment(pluginArtifact), withoutBlockComment(pluginSource))

  const leakageReadme = readFileSync(
    join(proseRoot, 'leakage-keeps-survive-mixed-readme-audit/artifact/evals/files/leakage-keeps/README.md'),
    'utf8',
  )
  assert.match(leakageReadme, /issue #1470 owns\s+the follow-up/)
  assert.match(leakageReadme, /manifest-depth cap applies to the complete rendered value, wrappers included/i)
  assert.match(leakageReadme, /Without the byte-length guard, multibyte labels double-encode/)
  assert.match(leakageReadme, /measured: 512 nests ≈ 0\.15s; 4096 blocks the event loop/)
  assert.match(leakageReadme, /old connection drains before the new one accepts/)
  assert.match(leakageReadme, /generic projection pair supplies badges/)
  assert.match(leakageReadme, /Resolved specs are not cached/)
  assert.match(leakageReadme, /Label processing[\s\S]*normalizes each label, truncates it, and wraps the result/)
  assert.doesNotMatch(
    leakageReadme,
    /This change|Earlier in this branch|tried v2|review rejected|First normalize|future change|replaces the probe field|in place of the probe field/i,
  )

  const notesRoot = join(historicalEvidenceRoot, 'dsh-spec-agent-notes')
  assert.ok(
    traceCommandsFor(join(notesRoot, 'no-peer-uses-user-language')).some((command) =>
      commandPrintsFile(command, '.agents/skills/dsh-spec-agent-notes/references/notes-contract.md'),
    ),
    'Agent Notes creation trace context did not record a read of the notes contract',
  )
  assert.ok(
    traceCommandsFor(join(notesRoot, 'archive-readiness')).some((command) =>
      commandPrintsFile(command, '.agents/skills/dsh-spec-agent-notes/references/archive-contract.md'),
    ),
    'Agent Notes archive trace context did not record a read of the archive contract',
  )
})

test('Agent Notes proposal-first model evidence is current and typed', () => {
  const skill = 'dsh-spec-agent-notes'
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence/2026-11-25-issue133', skill)
  const corpus = readCorpus(skill)
  const runs = [
    { id: 'proposal-first-issue-links-active-note', assertions: 5, install: [] },
    { id: 'proposal-unavailable-hands-off-inventory', assertions: 4, install: [] },
    {
      id: 'proposal-checkpoint-keeps-partial-moves-complete',
      assertions: 5,
      install: ['dsh-spec-translate-docs'],
    },
  ] as const

  for (const run of runs) {
    const scenario = corpus.evals.find((entry) => entry.id === run.id)
    assert.ok(scenario, run.id + ' has no current scenario')
    if (run.id === 'proposal-checkpoint-keeps-partial-moves-complete') {
      assert.equal(scenario.project_root, 'evals/files/checkpoint')
    }
    const root = join(evidenceRoot, run.id)
    const { metadata } = evidencePolicy.readEvidenceMetadataRecord(root)
    assert.equal(metadata.claim.subject, `${skill}:${run.id}`)
    assert.equal(metadata.claim.type, 'behavior')
    assert.equal(metadata.arm, 'target-present')
    assert.equal(metadata.evidence.kind, 'model')
    assert.equal(metadata.execution.subagents, false)
    assert.equal(
      metadata.provenance.target_skill_tree_sha256,
      skillTreeDigest([skill]),
      run.id + ' does not bind the current target skill tree',
    )
    assert.equal(
      metadata.provenance.dependency_skill_tree_sha256,
      skillTreeDigest(scenario.install ?? []),
      run.id + ' does not bind its current dependency skills',
    )

    const inspected = evidencePolicy.inspectRetainedRun(root, metadata)
    assert.deepEqual(inspected.scenario, scenario, run.id + ' was recorded from another scenario')

    const status = readFileSync(join(root, 'status.txt'), 'utf8')
    assert.match(status, /^status: pass$/m)
    assert.match(status, /^run_exit_code: 0$/m)
    assert.match(status, new RegExp(`^assertions: ${run.assertions}/${run.assertions}$`, 'm'))
    assert.match(status, /^evidence_status: current$/m)
    assert.match(status, /^current_proof: true$/m)

    const expectedAssertions = scenario.assertions.map((assertion) => `PASS ${assertion}`).join('\n')
    assert.equal(readFileSync(join(root, 'assertions.expected.txt'), 'utf8').trim(), expectedAssertions)
    assert.equal(readFileSync(join(root, 'assertions.txt'), 'utf8').trim(), expectedAssertions)

    const inputs = readFileSync(join(root, 'input-manifest.sha256'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const match = /^([0-9a-f]{64})  (.+)  mode=([0-7]{4})$/.exec(line)
        assert.ok(match, run.id + ' has a malformed input manifest')
        return { hash: match[1] as string, path: match[2] as string, mode: match[3] as string }
      })
    assert.deepEqual(
      inputs.map((entry) => entry.path),
      scenario.files,
      run.id + ' input order differs from its current scenario',
    )
    for (const entry of inputs) {
      const path = join(EVAL_SOURCE_ROOT, skill, entry.path)
      assert.equal(fileHash(path), entry.hash, run.id + ' input changed: ' + entry.path)
      assert.equal(fileMode(path), entry.mode, run.id + ' input mode changed: ' + entry.path)
    }

    assert.equal(replayEvidencePatch(root, skill, scenario), true, run.id + ' is not replayable')
    assertAnswerBlindTrace(root)
    const commands = traceCommandsFor(root)
    assert.ok(
      commands.some((command) =>
        commandPrintsFile(command, '.agents/skills/dsh-spec-agent-notes/references/workflow.md'),
      ),
      run.id + ' did not read the workflow contract',
    )
    assert.ok(
      commands.some((command) =>
        commandPrintsFile(command, '.agents/skills/dsh-spec-agent-notes/references/notes-contract.md'),
      ),
      run.id + ' did not read the notes contract',
    )
    if (run.id !== 'proposal-unavailable-hands-off-inventory') {
      assert.ok(commands.some((command) => /notes\.mjs check(?:\s|$|['"])/.test(command ?? '')))
    }
    if (run.id === 'proposal-checkpoint-keeps-partial-moves-complete') {
      const commandText = commands.join('\n')
      assert.match(commandText, /translate-pair\.mjs (?:check|write|brief)/)
      assert.doesNotMatch(commandText, /translate-pair\.mjs (?:brief|init)/)
      assert.doesNotMatch(commandText, /(?:subagent|spawn_agent)/)
      assert.doesNotMatch(commandText, /--root\s+evals\/files\/checkpoint\/\.agents\/dsh-spec-agent-notes/)
    }

    const changedPaths = JSON.parse(readFileSync(join(root, 'changed-paths.json'), 'utf8')) as string[]
    if (run.id === 'proposal-unavailable-hands-off-inventory') {
      assert.deepEqual(changedPaths, [], run.id + ' changed project files')
    }
    if (run.id === 'proposal-checkpoint-keeps-partial-moves-complete') {
      assert.deepEqual(changedPaths, [
        '.agents/dsh-spec-agent-notes/implemented/feature/2026-11-21-retention-policy.i18n.yaml',
        '.agents/dsh-spec-agent-notes/implemented/feature/2026-11-21-retention-policy.md',
        '.agents/dsh-spec-agent-notes/implemented/feature/2026-11-21-retention-policy.zh.md',
        'issue.md',
      ])
      const moveLifecycleTokens = (text: string) =>
        text
          .replace(/^Status: proposed$/m, 'Status: implemented')
          .replace(/^## Proposal$/m, '## Decision')
          .replace(/^## Acceptance criteria$/m, '## Testing')
          .replace(/^## Risks$/m, '## Consequences')
      const inputRoot = join(
        EVAL_SOURCE_ROOT,
        skill,
        'evals/files/checkpoint/.agents/dsh-spec-agent-notes/proposed/feature',
      )
      const movedRoot = join(root, 'artifact/.agents/dsh-spec-agent-notes/implemented/feature')
      for (const suffix of ['.md', '.zh.md']) {
        assert.equal(
          readFileSync(join(movedRoot, `2026-11-21-retention-policy${suffix}`), 'utf8'),
          moveLifecycleTokens(readFileSync(join(inputRoot, `2026-11-21-retention-policy${suffix}`), 'utf8')),
          run.id + ' rewrote translated or non-lifecycle prose in ' + suffix,
        )
      }
    }
  }
})

test('the scenario input check rejects missing, empty, directory and escaping files', () => {
  const root = mkdtempSync(join(tmpdir(), 'skill-scenarios-files-'))
  const files = join(root, 'evals', 'files')
  try {
    mkdirSync(files, { recursive: true })
    writeFileSync(join(root, 'SKILL.md'), '# skill\n')
    assert.throws(() => assertInputFile(root, 'evals/files/missing.md', 'missing'), /does not exist/)
    writeFileSync(join(files, 'empty.md'), '')
    assert.throws(() => assertInputFile(root, 'evals/files/empty.md', 'empty'), /is empty/)
    mkdirSync(join(files, 'directory'))
    assert.throws(() => assertInputFile(root, 'evals/files/directory', 'directory'), /not a regular file/)
    const outside = mkdtempSync(join(tmpdir(), 'skill-scenarios-outside-'))
    try {
      writeFileSync(join(outside, 'outside.md'), '# outside\n')
      symlinkSync(join(outside, 'outside.md'), join(files, 'outside.md'))
      assert.throws(() => assertInputFile(root, 'evals/files/outside.md', 'link'), /escapes evals\/files/)
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
    assert.throws(() => assertInputFile(root, 'evals/files/../../SKILL.md', 'traversal'), /escapes evals\/files/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a non-reading mention of a skill path is not skill evidence', () => {
  const skill = '.agents/skills/dsh-spec-example/SKILL.md'
  for (const command of [
    `ls -l ${skill}`,
    `stat ${skill}`,
    `test -f ${skill}`,
    `echo ${skill}`,
    `printf '%s\\n' ${skill}`,
  ]) {
    assert.equal(commandPrintsFile(command, skill), false, command)
  }
  for (const command of [`cat ${skill}`, `sed -n '1,120p' ${skill}`, `head -40 ${skill}`, `tail -40 ${skill}`]) {
    assert.equal(commandPrintsFile(command, skill), true, command)
  }
})

type DirectoryReader = (directory: string) => Array<{ name: string; isDirectory(): boolean }>

function stableEvidenceEntries(
  root: string,
  readDirectory: DirectoryReader = (directory) => readdirSync(directory, { withFileTypes: true }),
): string[] {
  const entries: string[] = []
  const visit = (directory: string, relativeDirectory: string): void => {
    for (const entry of readDirectory(directory)) {
      if (entry.name.startsWith('.run-')) continue
      if (relativeDirectory === '' && entry.name.startsWith('2099-')) continue
      const relativePath = relativeDirectory ? join(relativeDirectory, entry.name) : entry.name
      entries.push(relativePath)
      if (entry.isDirectory()) {
        visit(join(directory, entry.name), relativePath)
      }
    }
  }
  visit(root, '')
  return entries.sort()
}

test('stable evidence traversal prunes ephemeral directories before descent', () => {
  const root = mkdtempSync(join(tmpdir(), 'skill-evidence-stable-'))
  const stableDate = join(root, '2026-11-20-pr113')
  const ephemeralDate = join(root, '2099-12-31-runner-privacy-canary')
  const topLevelRun = join(root, '.run-top-level')
  const nestedRun = join(stableDate, '.run-recursive')
  try {
    mkdirSync(stableDate, { recursive: true })
    mkdirSync(ephemeralDate, { recursive: true })
    mkdirSync(topLevelRun, { recursive: true })
    mkdirSync(nestedRun, { recursive: true })
    writeFileSync(join(stableDate, 'evidence.txt'), 'safe\n')
    writeFileSync(join(ephemeralDate, 'scratch.txt'), 'scratch\n')
    writeFileSync(join(topLevelRun, 'scratch.txt'), 'scratch\n')
    writeFileSync(join(nestedRun, 'scratch.txt'), 'scratch\n')

    const entries = stableEvidenceEntries(root, (directory) => {
      const listing = readdirSync(directory, { withFileTypes: true })
      if (directory === root) {
        rmSync(ephemeralDate, { recursive: true, force: true })
        rmSync(topLevelRun, { recursive: true, force: true })
      } else if (directory === stableDate) {
        rmSync(nestedRun, { recursive: true, force: true })
      }
      return listing
    })

    assert.deepEqual(entries, ['2026-11-20-pr113', join('2026-11-20-pr113', 'evidence.txt')])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('committed evidence text contains no local home or build-toolchain paths', () => {
  const root = join(REPO_ROOT, 'tests/skill-evals/evidence')
  for (const relative of stableEvidenceEntries(root)) {
    if (typeof relative !== 'string' || !/\.(?:md|txt|json|jsonl|log|yaml|yml)$/.test(relative)) continue
    const file = join(root, relative)
    assertRegularEvidenceFile(file, relative)
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(
      text,
      /\/home\/dreamstar|\/mnt\/c\/Users\/|\/home\/conda/i,
      relative + ' contains local environment paths',
    )
    if (!relative.startsWith('2026-11-19-pr100/')) {
      assert.doesNotMatch(text, /\/tmp\/|\/mnt\/c\//i, relative + ' contains local temporary or host paths')
    }
  }
})

test('every typed evidence leaf passes full retained policy under a different HOME', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence')
  let checked = 0
  for (const relativePath of stableEvidenceEntries(evidenceRoot)) {
    if (!relativePath.endsWith('evidence.json')) continue
    const root = dirname(join(evidenceRoot, relativePath))
    const metadata = evidencePolicy.readEvidenceMetadata(root)
    const [skill, scenarioId] = metadata.claim.subject.split(':')
    const canaries = evidencePolicy.privacyCanariesFor(skill, scenarioId, {
      includeCurrentHome: true,
      currentHome: '/home/privacy-verifier',
    })
    let observed: Record<string, string | null>
    let provenance: RetainedEvidenceObservation['provenance'] | undefined
    if (metadata.claim.type === 'trigger') {
      observed = evidencePolicy.inspectRetainedTriggerRun(root, metadata, canaries).currentness
    } else {
      const observation = evidencePolicy.inspectRetainedRun(root, metadata)
      observed = observation.currentness
      provenance = observation.provenance
      evidencePolicy.assertRetainedRunPolicy({
        root,
        metadata,
        observed,
        provenance,
        canaries,
      })
    }
    assert.throws(
      () =>
        evidencePolicy.assertRetainedRunPolicy({
          root,
          metadata: {
            ...metadata,
            privacy: { ...metadata.privacy, scope_sha256: 'e'.repeat(64) },
          },
          observed,
          provenance,
          canaries,
        }),
      /supplied canaries/,
      relativePath + ' accepted a forged privacy scope',
    )
    checked += 1
  }
  assert.equal(checked, 57, 'typed evidence leaf count changed')
})

test('the model runner refuses to replace the repository or evidence root', () => {
  const evidenceRoot = join(REPO_ROOT, 'tests/skill-evals/evidence')
  // Real-runner tests create 2099-* scratch leaves under this directory; their isolated lifecycle
  // is outside this rejection check's stable committed corpus.
  const stableEntries = () =>
    readdirSync(evidenceRoot).filter((entry) => !entry.startsWith('2099-') && !entry.startsWith('.run-'))
  const before = stableEntries()
  for (const output of ['.', 'tests/skill-evals/evidence', 'tests/skill-evals/evidence/2026-11-20-pr113']) {
    const result = spawnSync(
      process.execPath,
      [
        join(REPO_ROOT, 'tests/skill-evals/run-model-eval.mjs'),
        '--skill',
        'dsh-spec-agent-notes',
        '--scenario',
        'archive-readiness-required',
        '--output',
        output,
        '--replace',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    )
    assert.notEqual(result.status, 0, output + ' was accepted as an evidence output')
    assert.match(result.stderr, /evidence output/, output + ' did not fail on evidence containment')
  }
  assert.deepEqual(stableEntries(), before, 'the runner changed the evidence root')
})
