# API package agent notes

Run `pnpm build` from the repository root before finishing a change.

Before changing API behavior, run `pnpm --filter @acme/api test` from the
repository root.

API deployment: read [the API deployment guide](../../docs/deploy.md) when
deploying this package, and carry out its pre- and post-deployment checks.
