# Agent notes

Queue service is a small HTTP service for job submission and status lookup.

The current service release is 5.2.1.

This branch is partway through the API rename migration.

Be precise and test your work.

Run `pnpm build` from the repository root before finishing a change.

Run `pnpm --filter @acme/old-api test` before changing API behavior.

Deployment steps: [deployment guide](docs/deploy-old.md).
