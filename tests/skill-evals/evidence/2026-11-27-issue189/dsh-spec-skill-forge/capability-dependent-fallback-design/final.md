Forged and published the smallest revision to [SKILL.md](/workspace/evals/files/vendor/isolated-audit/SKILL.md:8). The trigger, license, audit scope, and one-pass report remain unchanged. Execution now:

- Prefers isolated execution, including subagents, when supported.
- Allows another independent mechanism as a fallback.
- Stops without issuing a report when independence is unavailable, instead naming completed work, remaining work, missing capability, and a resumable next step.

The specification gate passed 13/13 checks, review pairing found no companions, and `git diff --check` passed. The full dispositions, capability scenarios, limitations, and rollback point are in [isolated-audit.md](/workspace/.agents/dsh-spec-skill-forge/record/isolated-audit.md:1). Only one source line changed; no subagents or outside-project reads were used.