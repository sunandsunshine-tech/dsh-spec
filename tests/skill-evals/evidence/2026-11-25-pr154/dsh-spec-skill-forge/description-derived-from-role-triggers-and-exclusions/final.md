Reforged [release-audit/SKILL.md](/workspace/evals/files/vendor/release-audit/SKILL.md:3) so it selects only pre-ship evidence review and explicitly excludes deployment, migration execution, feature-flag management, security-exception approval, and incident response. The original version, migration, rollback, compatibility, and missing-evidence checks remain in the procedure.

Recorded one positive and one near-miss selection query in the [skill record](/workspace/.agents/dsh-spec-skill-forge/record/release-audit.md:45).

Validation passed all 13 skill-spec checks: 17 lines, 280-character description, and approximately 238 body tokens. `git diff --check` also passed.