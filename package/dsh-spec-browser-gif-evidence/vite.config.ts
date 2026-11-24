const outRoot = process.env.SKILL_OUT_ROOT ?? '../../.agents/dsh-spec-skill-forge'

export default {
  pack: {
    entry: ['encode-browser-gif.ts'],
    outDir: outRoot + '/dsh-spec-browser-gif-evidence/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node24',
    clean: true,
  },
}
