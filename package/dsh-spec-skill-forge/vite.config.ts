const entry = process.env.SKILL_ENTRY ?? 'verify-skill-spec.ts'
const outRoot = process.env.SKILL_OUT_ROOT ?? '../../.agents/dsh-spec-skill-forge'

export default {
  pack: {
    entry: [entry],
    outDir: outRoot + '/dsh-spec-skill-forge/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    clean: process.env.SKILL_CLEAN !== '0',
  },
}
