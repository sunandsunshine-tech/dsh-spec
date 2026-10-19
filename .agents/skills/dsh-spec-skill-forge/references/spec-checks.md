# Specification checks

Read this when verifying a forged skill (step 5) or designing a bundled script (step 4). The checks the gate makes are implemented in [`../scripts/verify-skill-spec.ts`](../scripts/verify-skill-spec.ts); its output is the authoritative list, and this file does not repeat them. This file owns the judgement checks below, the pages they cite, and their pass lines.

## Judgement checks

| Check | Source | How to decide | Pass line |
|---|---|---|---|
| Trigger quality | [Optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions) | Write about 20 realistic requests: 8–10 that should trigger the forged skill, and 8–10 near-misses that share its keywords but need something else. Make the forged skill discoverable to the agent harness in the target audience's environment — copy or register its directory in that harness's skills directory, then remove it. Run each request 3 times against that harness; record whether it loaded the forged skill, as the trigger rate, in the record. | Every should-trigger request triggers in more than half of its runs; every should-not-trigger request triggers in fewer than half. A miss is fixed or the description revised, then retested on requests kept out of the revision. |
| Scripts, when bundled | [Using scripts](https://agentskills.io/skill-creation/using-scripts) | Non-interactive; `--help` documents the interface; structured data on stdout and diagnostics on stderr; dependencies declared in the script; inputs, outputs and meaningful exit codes stated; idempotent where retry is possible; `--dry-run` for destructive work. | Every property holds, and the script removes more fragility than it adds. |


## Sources

- [Specification](https://agentskills.io/specification)
- [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)
