# Agent notes

Queue Kit is a TypeScript job queue for small services. It provides durable
enqueue, retry, and worker lifecycle APIs.

The latest published release is 2.4.0.

Be careful and write clean, maintainable code.

Run `pnpm build` and `pnpm test` from the repository root before finishing a
change.

For release work, read [the release guide](docs/releasing.md).

When editing `packages/worker`, run `pnpm --filter @acme/worker test`.
