**Scope resolution**

The skill gives `AGENTS.md` and its cited documents precedence as standing project instructions. I therefore followed [AGENTS.md](/workspace/evals/files/authority-conflict/AGENTS.md:3) and [audit-policy.md](/workspace/evals/files/authority-conflict/docs/audit-policy.md:3), which explicitly includes `src/adapters.ts`. [CLAUDE.md](/workspace/evals/files/authority-conflict/CLAUDE.md:3) claims that file is generated, but provides no supporting marker or metadata, so I did not apply its exclusion.

**Supported removal**

Remove `jsonAdapter` from [adapters.ts](/workspace/evals/files/authority-conflict/src/adapters.ts:5).

- Its only references are the declaration and [README.md](/workspace/evals/files/authority-conflict/README.md:3), which explicitly describes it as an internal convenience export with no documented consumer.
- No import or call site exists anywhere in the project.
- The README identifies `textAdapter` as the package’s only public adapter.
- Removal eliminates the undocumented `JSON.parse` adapter and its export without affecting `textAdapter` or the `Adapter` contract. The only compatibility loss is for an unsupported direct import.

**Retained**

`textAdapter` has both a public documentation contract and a first-party consumer through [compose.ts](/workspace/evals/files/authority-conflict/src/compose.ts:1). `firstPartyAdapter` is not supported for removal: it is the sole export of a composition module, and there is no package manifest or export map showing that such exports are internal. The audit policy specifically prevents removal based only on absent local callers. Likewise, `Adapter` remains the type contract for the public `textAdapter`.

I inspected all six project files and searched the exact export names and imports. There is no package manifest, build configuration, or declared test workflow, so no project checks were available. No files were changed.