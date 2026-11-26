# PR #122 translation evidence

> **Historical status:** these runs bind the pre-#142 translation skill. Their named behaviors remain
> useful history, but issue #142 changed the activation and briefing rules; current evidence is under
> `tests/skill-evals/evidence/2026-11-25-pr142/dsh-spec-translate-docs/`.

These runs exercised the `dsh-spec-translate-docs` mechanism at the PR #122 revision:

| Scenario | Assertions | Result |
|---|---:|---|
| `source-rename-keeps-pair` | 4/4 | The source, counterpart, aggregate record and inbound link move together and the pair remains consistent. |
| `locale-selected-pages-are-unpaired` | 4/4 | The maintained guide pair passes while `--unpaired` keeps both locale-selected detail pages outside pair discovery and artifact creation. |

The exact scenario, input, installed-skill, capability and artifact hashes are retained beside each
run. The runner used `--sandbox workspace-write`; the source and answer tree were isolated from the
staged project as documented in `tests/skill-evals/README.md`.
