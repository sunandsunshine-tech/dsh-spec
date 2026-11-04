export default {
  pack: {
    entry: ['translate-pair.ts'],
    outDir: '../../.agents/dsh-spec-skill-forge/dsh-spec-translate-docs/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    clean: true,
  },
}
