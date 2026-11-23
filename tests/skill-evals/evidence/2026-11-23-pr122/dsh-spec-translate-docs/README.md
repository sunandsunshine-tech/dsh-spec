# PR #122 translation evidence

These runs exercise the current `dsh-spec-translate-docs` mechanism:

| Scenario | Assertions | Result |
|---|---:|---|
| `source-rename-keeps-pair` | 4/4 | The source, counterpart, aggregate record and inbound link move together and the pair remains consistent. |
| `locale-selected-pages-are-unpaired` | 4/4 | The maintained guide pair passes while `--unpaired` keeps both locale-selected detail pages outside pair discovery and artifact creation. |

The exact scenario, input, installed-skill, capability and artifact hashes are retained beside each
run. The runner used `--sandbox workspace-write`; the source and answer tree were isolated from the
staged project as documented in `tests/skill-evals/README.md`.
