The fixture cannot support a causal profile as provided. It contains only [package.json](/workspace/build-performance/project/trigger-fixtures/build-performance/package.json:1) and [tsconfig.json](/workspace/build-performance/project/trigger-fixtures/build-performance/tsconfig.json:1); the referenced `packages/app` and `packages/tools` projects are absent. There is also no lockfile or installed TypeScript compiler, so the reported build cannot be reproduced or timed here.

One important finding is that `build` already uses `tsc -b`, and the root config is a correct solution-style file. The root command is therefore not the common mistake of running non-incremental `tsc`. Incrementality depends on the missing leaf configurations.

### Establish where the 40 seconds goes

After restoring the real projects, use the locally installed compiler and record medians over at least three runs:

```bash
./node_modules/.bin/tsc -b --dry --verbose

/usr/bin/time -p ./node_modules/.bin/tsc -b --force --verbose
/usr/bin/time -p ./node_modules/.bin/tsc -b --verbose
```

Then modify one source file and time `tsc -b --verbose` again. The results distinguish the main cases:

- Cold build about 40 seconds, warm build near-instant: build artifacts are being discarded between runs, commonly in CI.
- Warm build also about 40 seconds while `--verbose` reports projects being rebuilt: build invalidation or source inclusion is expanding the work.
- Only one leaf project dominates: profile its files, symbols, type instantiations, and emit cost with:

```bash
./node_modules/.bin/tsc \
  -p packages/app/tsconfig.json \
  --extendedDiagnostics

./node_modules/.bin/tsc \
  -p packages/app/tsconfig.json \
  --generateTrace trace/app
```

Repeat for `packages/tools`. `--extendedDiagnostics` separates parse, bind, check, and emit time; `--generateTrace` identifies expensive symbols and type relationships. TypeScript documents both under its [compiler options](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

### Recommended incremental setup

Keep the root [solution config](/workspace/build-performance/project/trigger-fixtures/build-performance/tsconfig.json:4). In each referenced project, use a tightly scoped configuration similar to:

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": "dist/app.tsbuildinfo"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

Add a reference from `app` to `tools` only where `app` actually consumes `tools`. Do not add `composite` to the root solution config, add broad source globs, or set `noEmit` on referenced projects. `composite` also enables incremental compilation, and project references require declaration output according to the [TypeScript project-reference documentation](https://www.typescriptlang.org/docs/handbook/project-references.html).

For CI, cache each project’s `outDir` and `.tsbuildinfo` together, keyed on the pinned TypeScript version, lockfile, and build configs. Restore an older cache across source revisions, save a new one after each build, and never run `--force` in the normal build path. `--force` is useful for measurement, not as an everyday command.

For local iteration, run `tsc -b --watch` from the root. If profiling later shows that two independent leaf projects dominate a cold build, run those project builds concurrently; built-in `tsc -b` orders dependencies but does not parallelize independent compilations. That optimization should follow measurement rather than being added preemptively.