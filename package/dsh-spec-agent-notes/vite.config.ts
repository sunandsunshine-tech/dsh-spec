export default {
  pack: {
    entry: ['notes.ts'],
    outDir: '../../.agents/dsh-spec-skill-forge/dsh-spec-agent-notes/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    clean: true,
  },
}
