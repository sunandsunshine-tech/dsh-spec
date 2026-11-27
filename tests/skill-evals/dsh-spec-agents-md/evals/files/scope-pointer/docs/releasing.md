# Release guide

This guide owns the maintainer release procedure for Queue Kit.

Before preparing a release, run `pnpm test` and `pnpm build` from the
repository root. Update the changelog, create the signed tag, and publish only
after the release branch is green.

After publishing, verify the package metadata and announce the release to the
operations channel.
