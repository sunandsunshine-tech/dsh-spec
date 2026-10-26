export default {
  pack: {
    entry: ['verify-skill-spec.ts', 'forge.ts'],
    outDir: '../../.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    clean: true,
  },
}
