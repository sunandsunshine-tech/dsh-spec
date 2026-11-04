const outRoot = process.env.SKILL_OUT_ROOT ?? '../../.agents/dsh-spec-skill-forge'

export default {
  pack: {
    entry: ['translate-pair.ts'],
    outDir: outRoot + '/dsh-spec-translate-docs/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    clean: true,
  },
}
