# Agent Note: Track the installed skill copy in git

Status: implemented

English | [中文](2026-09-18-track-the-installed-skill-copy.zh.md)

## Problem

`skills/` is the deliverable, but the skill an agent actually loads is a copy installed under `.agents/skills/`. While that copy was ignored by git, this repository stated rules that nothing in the working tree guaranteed: a collaborator who had never installed the package ran with no skill, and one who had installed an earlier revision followed rules this repository no longer states. Neither state appears in a diff, so neither is caught in review, and neither is visible to the agent following the wrong rules.

## Decision

The package is installed at **project scope** into `.agents/skills/`, and that copy is tracked in git:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts install --root .
```

Three rules follow, and `AGENTS.md` carries them:

- **Never hand-edit the copy.** It is overwritten by the next install. Change `skills/`, then refresh the copy in the same change.
- **Refresh through the manager, never by copying files.** One command installs every skill the manifest names at the revision the manifest pins, and [`manager-lifecycle.md`](../../../../../skills/dsh-spec-manager/references/manager-lifecycle.md) writes it out. The install resolves the remote ref, so it follows a push, and the manager's `status` compares the copy against the manifest and against the revision the installer injected into each installed `SKILL.md`, rather than against a tree hash a reader has to know.
- **The copy is a deployment artifact, not a second source.** Where the two disagree, `skills/` wins and the copy is the defect.

### The copy is not byte-identical to the source

`gh skill install` injects a `metadata:` block into the installed `SKILL.md` frontmatter — `github-repo`, `github-ref`, `github-path`, and `github-tree-sha` — and sorts the frontmatter keys around it. It also drops the blank line the source carries after the closing `---`. That block is what makes `gh skill update` work, so it is expected in every diff of the copy and must survive review unchanged.

### A refresh follows a push

The install resolves the remote ref, so a source edit reaches the copy only after it is pushed. A change that alters the package therefore lands in two commits: the source, then the refreshed copy. [Four mechanisms instead of twelve](2026-09-18-four-mechanisms-instead-of-twelve.md) keeps this decision and narrows it: eight skills are installed by name from the manifest at one pinned revision, and the manager owns install, update and removal.

## Alternatives considered

**Keep the copy ignored and let each collaborator install it.** This is `gh skill`'s default outcome for a project-scope install, and it costs the repository nothing in size or review noise. It lost because this repository's own correctness depends on the copy: `AGENTS.md` points at `.agents/skills/SKILL.md` as the file an agent loads, so two collaborators who installed at different times follow different rules with no diff to show it. The failure is silent, which is the class of failure this repository exists to prevent.

**Install at user scope into `~/.agents/skills/`.** One install would serve every project on the machine, so no repository would carry 62 duplicated files. It lost because the package is versioned with this repository: a user-scope copy cannot be pinned to the revision a checkout needs, so installing an unrelated project's skills would silently change the rules this repository follows.

**Symlink `.agents/skills/skills` to `skills/`.** A symlink cannot drift, needs no refresh step, and would halve the file count. It lost because the copy would then have two owners: whatever `gh skill` writes on a refresh, and the link. Git also stores the link target rather than the content, so a reader browsing the repository sees a path instead of the package.

## Consequences

The 62 files of the copy are reviewed twice — once as the source, once as the deployment. That is the price of the guarantee, and it is why the copy may never be edited in place: a fix made there is both uncounted and lost on the next refresh.

Every source change now carries a refresh and, because refresh follows a push, a second commit. A change that edits the package and forgets the refresh leaves this repository green while the loaded skill is stale. No gate here detects that yet, which is the named coverage gap this decision leaves open — the strongest argument for a drift gate comparing the two trees.

Adoption is unchanged for a project that consumes the package: it installs at project scope, tracks the copy, and never edits it. Nothing in this decision depends on this repository being the package's home.
