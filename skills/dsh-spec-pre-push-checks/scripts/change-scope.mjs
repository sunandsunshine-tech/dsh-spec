import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { TextDecoder, parseArgs } from "node:util";
// change-scope.ts
/**
* SPDX-License-Identifier: MIT
*
* Ported from dsh `scripts/change-scope.ts` at commit `ddefc45fbc7f8e46dd73185e68295696d1297887`;
* the pinned baseline `dsh-v0.2.1-rc.3` (`1f81c047fc48fa190a683e469daa699857e9afe8`) carries the
* same content. This copy comes via the repository's former manager port. The report rendering is verbatim; the CLI
* surface is adapted for this skill (a documented --help and a distinct usage-error exit 2).
*/
/** Report the explicit committed and worktree scope of a repository change. */
const USAGE = `usage: change-scope.mjs --base <ref> [--head <ref>] [--help]

Print one versioned JSON report of the outgoing change in the current Git worktree: the
committed paths relative to the resolved merge base, and the staged, unstaged and untracked
paths of the worktree. The report never fetches and never guesses a base, so supply the ref
the change is reviewed against; run it inside the project's Git worktree.

  --base <ref>                the ref the change is reviewed against (required)
  --head <ref>                the commit to inspect against that base (default: HEAD)
  --help, -h                  print this and exit 0

exit: 0 a report was printed · 1 a Git or ref resolution failure · 2 usage error

The report is JSON on stdout; diagnostics go to stderr.
`;
const FORMAT_VERSION = 1;
const MAX_GIT_OUTPUT = 67108864;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
function executeGit(cwd, args, context) {
	const result = executeGitBytes(cwd, args);
	return {
		status: result.status,
		stdout: decodeGitText(result.stdout, context, "stdout"),
		stderr: decodeGitText(result.stderr, context, "stderr"),
		error: result.error
	};
}
function executeGitBytes(cwd, args) {
	const result = spawnSync("git", [
		"-C",
		cwd,
		"-c",
		"core.fsmonitor=false",
		...args
	], {
		env: {
			...process.env,
			GIT_OPTIONAL_LOCKS: "0",
			LANG: "C",
			LC_ALL: "C"
		},
		maxBuffer: MAX_GIT_OUTPUT
	});
	return {
		status: result.status,
		stdout: result.stdout,
		stderr: result.stderr,
		error: result.error
	};
}
function decodeGitText(output, context, stream) {
	try {
		return UTF8_DECODER.decode(output);
	} catch {
		throw new Error(`${context}: Git ${stream} is not valid UTF-8`);
	}
}
function failureDetail(result) {
	return result.error?.message ?? (result.stderr.trim() || `Git exited with status ${String(result.status)}`);
}
function requireGit(cwd, args, context) {
	const result = executeGit(cwd, args, context);
	if (result.status !== 0) throw new Error(`${context}: ${failureDetail(result)}`);
	return result.stdout;
}
function requireGitBytes(cwd, args, context) {
	const result = executeGitBytes(cwd, args);
	if (result.status !== 0) {
		const detail = result.error?.message ?? (result.stderr.toString("utf8").trim() || `Git exited with status ${String(result.status)}`);
		throw new Error(`${context}: ${detail}`);
	}
	return result.stdout;
}
/** A request the command line cannot honour, reported on stderr before any Git work. */
var UsageError = class extends Error {};
/** Say what the command line got wrong, in one line, from the parser's complaint. */
function describeUsageError(error) {
	const message = error instanceof Error ? error.message : String(error);
	const unknown = /^Unknown option '(.+)'$/u.exec(message);
	if (unknown !== null) return `unknown option: ${unknown[1]}`;
	const positional = /^Unexpected argument '(.+)'\. This command does not take positional arguments$/u.exec(message);
	if (positional !== null) return `unexpected positional argument: ${positional[1]}`;
	const missing = /^Option '(.+?) <value>' argument missing$/u.exec(message);
	if (missing !== null) return `missing value for ${missing[1]}`;
	return `invalid arguments: ${message}`;
}
function parseOptions(args) {
	let values;
	try {
		values = parseArgs({
			args,
			allowPositionals: false,
			options: {
				base: { type: "string" },
				head: {
					type: "string",
					default: "HEAD"
				}
			},
			strict: true
		}).values;
	} catch (error) {
		throw new UsageError(describeUsageError(error));
	}
	if (values.base === void 0) throw new UsageError("missing required --base <ref>");
	return {
		base: values.base,
		head: values.head
	};
}
function resolveCommit(root, label, ref) {
	const context = `cannot resolve ${label} ref ${JSON.stringify(ref)}`;
	const result = executeGit(root, [
		"-c",
		"core.warnAmbiguousRefs=true",
		"rev-parse",
		"--verify",
		"--end-of-options",
		`${ref}^{commit}`
	], context);
	if (/\bambiguous\b/iu.test(result.stderr)) throw new Error(`${label} ref ${JSON.stringify(ref)} is ambiguous; use a fully qualified ref or commit ID`);
	if (result.status !== 0) throw new Error(`${label} ref ${JSON.stringify(ref)} does not resolve to a commit: ${failureDetail(result)}`);
	const commits = result.stdout.trim().split(/\r?\n/u).filter(Boolean);
	if (commits.length !== 1) throw new Error(`${label} ref ${JSON.stringify(ref)} did not resolve to exactly one commit`);
	return commits[0];
}
function resolveMergeBase(root, baseSha, headSha) {
	const result = executeGit(root, [
		"merge-base",
		"--all",
		baseSha,
		headSha
	], "cannot resolve the merge base");
	if (result.status !== 0) throw new Error(`base and head do not have a merge base: ${failureDetail(result)}`);
	const mergeBases = result.stdout.trim().split(/\r?\n/u).filter(Boolean);
	if (mergeBases.length !== 1) throw new Error(`base and head do not have a unique merge base; found ${mergeBases.length}`);
	return mergeBases[0];
}
function parsePathSet(output, context) {
	const paths = [];
	let start = 0;
	let record = 0;
	for (let end = 0; end < output.length; end += 1) {
		if (output[end] !== 0) continue;
		if (end > start) {
			record += 1;
			try {
				paths.push(UTF8_DECODER.decode(output.subarray(start, end)));
			} catch {
				throw new Error(`${context}: Git path ${record} is not valid UTF-8`);
			}
		}
		start = end + 1;
	}
	return [...new Set(paths)].sort();
}
function diffPaths(root, args, context) {
	return parsePathSet(requireGitBytes(root, [
		"diff",
		"--no-ext-diff",
		"--no-textconv",
		"--no-renames",
		"--ignore-submodules=none",
		"--name-only",
		"-z",
		...args,
		"--"
	], context), context);
}
function stripGitLineTerminator(output) {
	const withoutLineFeed = output.endsWith("\n") ? output.slice(0, -1) : output;
	return process.platform === "win32" && withoutLineFeed.endsWith("\r") ? withoutLineFeed.slice(0, -1) : withoutLineFeed;
}
function collectReport(options, cwd) {
	const root = stripGitLineTerminator(requireGit(cwd, ["rev-parse", "--show-toplevel"], "cannot locate a Git worktree"));
	const baseSha = resolveCommit(root, "base", options.base);
	const headSha = resolveCommit(root, "head", options.head);
	const mergeBaseSha = resolveMergeBase(root, baseSha, headSha);
	return {
		formatVersion: FORMAT_VERSION,
		repositoryRoot: root,
		input: {
			base: options.base,
			head: options.head
		},
		resolved: {
			baseSha,
			headSha,
			mergeBaseSha
		},
		paths: {
			committed: diffPaths(root, [mergeBaseSha, headSha], "cannot inspect committed paths"),
			staged: diffPaths(root, ["--cached"], "cannot inspect staged paths"),
			unstaged: diffPaths(root, [], "cannot inspect unstaged paths"),
			untracked: parsePathSet(requireGitBytes(root, [
				"ls-files",
				"--others",
				"--exclude-standard",
				"-z",
				"--"
			], "cannot inspect untracked paths"), "cannot inspect untracked paths")
		}
	};
}
/**
* Validate arguments and render one complete versioned report.
* @param args - Command-line arguments after the script path.
* @param cwd - Directory whose containing Git worktree is inspected.
* @returns JSON report with a trailing newline.
*/
function renderChangeScope(args, cwd) {
	const report = collectReport(parseOptions(args), cwd);
	return `${JSON.stringify(report, null, 2)}\n`;
}
/** Run the command line: help before any Git work, a report, or a documented failure exit. */
function main(argv, cwd) {
	if (argv.includes("--help") || argv.includes("-h")) {
		process.stdout.write(USAGE);
		return;
	}
	try {
		process.stdout.write(renderChangeScope(argv, cwd));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`change-scope: ${message}\n`);
		process.exitCode = error instanceof UsageError ? 2 : 1;
	}
}
const entryPath = process.argv[1];
if (entryPath !== void 0 && resolve(entryPath) === fileURLToPath(import.meta.url)) main(process.argv.slice(2), process.cwd());
export { renderChangeScope };
