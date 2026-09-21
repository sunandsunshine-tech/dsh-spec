/**
 * Ported from dsh scripts/verify-agent-note-classification.ts @ ddefc45fbc7f8e46dd73185e68295696d1297887 (submodules/dsh). Relation: adapted.
 * Enforce Agent Note lifecycle/class paths and dated filenames. Structural rules
 * are shared with `agent-note-tree.ts`; the closed classification rules live
 * in `.agents/dsh-spec/notes/README.md`.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { agentNoteRoot, walkAgentNoteTree } from './agent-note-tree.ts'
import { notesRootExists } from './notes-root.ts'

// The notes root is `<repository>/.agents/dsh-spec/notes`, so two levels up is the repository.
const repositoryRoot = resolve(agentNoteRoot, '../..')

if (!notesRootExists(agentNoteRoot)) {
  console.error(`verify-agent-note-classification: no Agent Note tree at ${agentNoteRoot} — check --root or AGENT_NOTES_ROOT.`)
  process.exit(1)
}

const { notes, errors } = walkAgentNoteTree()

// Keep the former homes unavailable so new notes cannot silently escape this tree.
for (const legacyRoot of ['docs/rfc', 'docs/rfcs']) {
  if (existsSync(resolve(repositoryRoot, legacyRoot))) {
    errors.push(`legacy-path: ${legacyRoot}/ is forbidden — put Agent Notes under .agents/dsh-spec/notes/`)
  }
}

if (errors.length === 0) {
  console.log(`verify-agent-note-classification: ${notes.length} Agent Note(s) checked, structure consistent.`)
  process.exit(0)
}

console.error('verify-agent-note-classification: violations found:')
for (const e of errors) console.error(`  ${e}`)
process.exit(1)
