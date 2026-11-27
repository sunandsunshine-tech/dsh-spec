# Deploying the API

This guide owns the API deployment procedure.

Before deploying, run `pnpm --filter @acme/api build`, verify the generated
manifest, and confirm the target environment. After deployment, check the
health endpoint and record the deployed revision.
