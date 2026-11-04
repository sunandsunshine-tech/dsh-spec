export default {
  pack: {
    entry: ['change-scope.ts'],
    outDir: '../../.agents/dsh-spec-skill-forge/dsh-spec-pre-push-checks/scripts',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    clean: true,
  },
}
