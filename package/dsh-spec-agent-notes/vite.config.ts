const outRoot = process.env.SKILL_OUT_ROOT ?? '../../.agents/dsh-spec-skill-forge'

export default {
  pack: {
    entry: ['notes.ts'],
    outDir: outRoot + '/dsh-spec-agent-notes/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    clean: true,
  },
}
