const entry = process.env.SKILL_ENTRY ?? 'verify-skill-spec.ts'

export default {
  pack: {
    entry: [entry],
    outDir: '../../.agents/dsh-spec-skill-forge/dsh-spec-skill-forge/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    clean: process.env.SKILL_CLEAN !== '0',
  },
}
