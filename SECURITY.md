# Security Policy

## Supported versions

Security fixes land on the latest release of the current line, **v0.2.x and later**. The supported set is the newest release and the line it belongs to rather than a fixed calendar window, so the [releases page](https://github.com/sunandsunshine-tech/dsh-spec/releases) answers which version that is. An older release receives a fix when the same defect is still present on the latest one, and that fix ships in a new release rather than as a backport to the old tag.

This repository is a skill package extracted from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). The engine and the skill set live here; the harness they were extracted from is developed in the upstream repository, and nothing in this repository patches it.

## What is a security issue here

Two boundaries are in scope.

- **The checks can be made to certify a tree they did not examine.** A gate that reports success while reading nothing, skips a file its scope covers, or writes a file it did not create and should not overwrite, produced a passing record for a project that never earned one.
- **Repository content can hang or exhaust a check.** A check parses Markdown, JSON and an Agent Note tree taken from the project under inspection. A path, a glob, a link shape or a nesting depth in that input can make a check spin, recurse without bound, or consume memory without bound.

Anything else is an ordinary defect: an incorrect result, a crash, a wrong diagnostic, a gate that refuses a legitimate tree, or a broken link in a document. A gate that a contributor or an agent can simply choose not to run, or a check flag that an author can omit, is that author's decision rather than a bypass — it belongs with ordinary issues rather than in a security report.

The package reaches no runtime of its own. An adopter runs it while developing; its checks read files and report. A defect typically affects an adopter's gate results rather than a deployed service.

## How to report

Two channels reach the maintainers. Both are private at the time of the report.

- **GitHub private vulnerability reporting.** The **Security** tab of [the repository](https://github.com/sunandsunshine-tech/dsh-spec/security/advisories/new) carries the private report form. A report opened there is readable only by the reporter and the maintainers.
- **Email.** `sunandsunshinetech@163.com` accepts the same report when a GitHub account is not available.

A useful report names the affected revision or release, the command and the input that trigger the behavior, the observed result, and what the reporter expected instead. A copy of the failing input — a file, a tree, a glob — shortens the path to a fix more than a description of it does.

## What to expect

There is **no service-level agreement** and **no bug bounty** for this repository. Reports are read on a best-effort basis, the same as every other issue, and a bounty is not paid for any report. A report that a maintainer can reproduce is fixed on the current line and named in the release notes for the release that carries the fix; a report that names a defect in DeepSeek Harness itself goes to the upstream repository.

## Defects in DeepSeek Harness

A defect in the harness — its runtime, its packages, its applications — belongs upstream, where that code lives and is fixed. Two routes reach the DeepSeek Harness maintainers:

- [github.com/deepseek-ai/deepseek-harness/issues](https://github.com/deepseek-ai/deepseek-harness/issues) for an ordinary defect.
- The **Security** tab of [the upstream repository](https://github.com/deepseek-ai/deepseek-harness/security) for a harness security report.

This repository's own defects go to [its issue tracker](https://github.com/sunandsunshine-tech/dsh-spec/issues). Content quoted from an outside page, issue or transcript enters a report as evidence with its source named.
