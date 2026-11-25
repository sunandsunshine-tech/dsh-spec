---
name: release-audit
description: "Use when reviewing a release candidate's version, migration, rollback, and compatibility evidence before shipping. Limit the result to an evidence audit; do not use this skill to deploy, apply migrations, manage feature flags, approve security exceptions, or respond to incidents."
license: "MIT"
---

# Release audit

Audit a release candidate's version, migration, rollback, and compatibility evidence before shipping. Keep the work to evidence review and an evidence-gap report.

Do not deploy the candidate, apply migrations, change or manage feature flags, approve security exceptions, or respond to incidents. Treat requests that require those actions as outside this skill; state the boundary and hand them to the appropriate owner.

## Procedure

1. Compare the candidate version with the release plan.
2. Read the migration and rollback evidence. Use the provided plans, test results, and rehearsal records as evidence; do not execute their steps.
3. Report compatibility gaps and the evidence that is still missing. Identify each gap, the expected evidence, and its status.
