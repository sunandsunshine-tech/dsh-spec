import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    semi: false,
    singleQuote: true,
    printWidth: 120,
    ignorePatterns: [
      '**/*.md',
      '**/*.json',
      '**/*.yaml',
      '**/*.yml',
      '**/*.html',
      '.agents/**',
      'skills/**',
      'submodules/**',
      'tests/skill-evals/evidence/**',
    ],
  },
  lint: {
    plugins: ['typescript'],
    env: { node: true },
    ignorePatterns: ['node_modules/**', '.agents/**', 'skills/**', 'submodules/**', 'tests/skill-evals/evidence/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        // node:test returns a Promise even for synchronous tests and intentionally registers them without awaiting.
        files: ['tests/**/*.test.ts'],
        rules: { 'typescript/no-floating-promises': 'off' },
      },
    ],
  },
})
