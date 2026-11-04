#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
// notes.ts
const USAGE = `usage: notes.mjs <command> [options]

Initialize, check the active Agent Note tree, or check and seal the frozen archive of a project that uses this skill.

commands:
  init      create the notes tree skeleton once: lifecycle and class folders, archived class folders, .gitkeep placeholders
  check     check the active tree: lifecycle and class folders, filenames, header, skeleton, alternatives, companions
  archive   check the frozen archive: class directories, manifest, sealed content, append-only baseline
  archive --write
            run the same checks plus unit metadata and companion completeness, then seal new artifacts

options:
  --root <dir>         notes root, resolved against the project root (default: .agents/dsh-spec-agent-notes)
  --companion <suffix> a companion suffix kept beside each note (repeatable; e.g. .zh.md, .i18n.yaml)
  --format-adopted <date>
                       the date this contract was adopted; notes dated before it may carry the pre-format
                       alternatives comment instead of the section (check only)
  --base-ref <ref>     trusted pre-change commit for the archive baseline (default: HEAD; archive only)
  --write              append new artifact hashes to the manifest (archive only)
  --json               print a JSON summary instead of lines
  --help, -h           print this help and exit 0

The project root is the Git checkout root of the working directory; Git is required.
The archive root is always <notes root>/archived. Verification requires the manifest to be tracked by Git when it lists artifacts.
The archive baseline is read from Git; sealing and verification fail closed when it cannot be read.

exit: 0 every check passed · 1 rule violations · 2 usage error`;
const LIFECYCLES = [
	"proposed",
	"implemented",
	"rejected"
];
const CLASSES = [
	"feature",
	"bug-fix",
	"simplification",
	"architecture",
	"process",
	"testing"
];
const ARCHIVE = "archived";
const MANIFEST = "manifest.json";
const DEFAULT_ROOT = ".agents/dsh-spec-agent-notes";
const ROOT_ALLOWLIST = /* @__PURE__ */ new Set(["AGENTS.md", "CLAUDE.md"]);
const ARCHIVE_ROOT_ALLOWLIST = /* @__PURE__ */ new Set([MANIFEST, "AGENTS.md"]);
const GITKEEP = ".gitkeep";
const STATUS = {
	proposed: /^Status: proposed$/,
	implemented: /^Status: implemented$/,
	rejected: /^Status: rejected — .+$/
};
const REQUIRED = {
	proposed: [
		"## Proposal",
		"## Acceptance criteria",
		"## Risks"
	],
	implemented: ["## Decision", "## Consequences"],
	rejected: ["## Proposal"]
};
const BANNED_IMPLEMENTED = /^## (?:Proposal\b|Plan\b|Migration plan\b|Acceptance criteria\b)/i;
const GRANDFATHER = "<!-- agent-note-format: alternatives-not-recorded (pre-format Agent Note) -->";
const FILENAME = /^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HASH = /^sha256:[0-9a-f]{64}$/;
const COMPANION = /^\.[A-Za-z0-9._-]*[A-Za-z0-9]$/;
function companionSuffixOf(name, companions) {
	return [...companions].sort((a, b) => b.length - a.length || a.localeCompare(b)).find((suffix) => name.endsWith(suffix));
}
var UsageError = class extends Error {};
function usageError(message) {
	throw new UsageError(message);
}
function parseArgs(argv) {
	const options = {
		command: void 0,
		root: void 0,
		baseRef: void 0,
		formatAdopted: void 0,
		companions: [],
		write: false,
		json: false,
		help: false
	};
	const positionals = [];
	for (let index = 2; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") {
			options.help = true;
			continue;
		}
		if (arg === "--json") {
			options.json = true;
			continue;
		}
		if (arg === "--write") {
			options.write = true;
			continue;
		}
		const take = (name) => {
			if (arg === name) {
				const value = argv[index + 1];
				if (value === void 0 || value.startsWith("-")) usageError(`${name} needs a value`);
				index += 1;
				return value;
			}
			if (arg.startsWith(`${name}=`)) {
				const value = arg.slice(name.length + 1);
				if (value === "") usageError(`${name} needs a value`);
				return value;
			}
		};
		const rootValue = take("--root");
		if (rootValue !== void 0) {
			options.root = rootValue;
			continue;
		}
		const baseValue = take("--base-ref");
		if (baseValue !== void 0) {
			options.baseRef = baseValue;
			continue;
		}
		const adoptedValue = take("--format-adopted");
		if (adoptedValue !== void 0) {
			if (!DATE.test(adoptedValue) || !validDate(adoptedValue)) usageError(`--format-adopted must be a valid yyyy-mm-dd date, got ${JSON.stringify(adoptedValue)}`);
			options.formatAdopted = adoptedValue;
			continue;
		}
		const companionValue = take("--companion");
		if (companionValue !== void 0) {
			if (!COMPANION.test(companionValue) || companionValue === ".md") usageError(`--companion must be a suffix such as .zh.md, got ${JSON.stringify(companionValue)}`);
			options.companions.push(companionValue);
			continue;
		}
		if (arg.startsWith("-")) usageError(`unknown option: ${arg}`);
		positionals.push(arg);
	}
	if (options.help) return options;
	if (positionals.length !== 1) usageError(`expected one command, got ${positionals.length}`);
	options.command = positionals[0];
	if (options.command !== "init" && options.command !== "check" && options.command !== "archive") usageError(`unknown command: ${options.command}`);
	if (options.command === "check" && (options.write || options.baseRef !== void 0)) usageError("check takes --root, --companion, --format-adopted and --json; --write and --base-ref belong to archive");
	if (options.command === "archive" && options.formatAdopted !== void 0) usageError("--format-adopted belongs to check");
	if (options.command === "init" && (options.write || options.baseRef !== void 0 || options.formatAdopted !== void 0 || options.companions.length > 0)) usageError("init takes --root and --json only");
	return options;
}
function detectProjectRoot() {
	const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
	if (result.status === 0 && result.stdout.trim() !== "") return realpathSync(result.stdout.trim());
}
function initCommand(projectRoot, options) {
	const requestedRoot = resolve(projectRoot, options.root ?? DEFAULT_ROOT);
	const projectReal = safeRealpath(projectRoot) ?? resolve(projectRoot);
	const projectGitDirectory = gitDirectory(projectRoot);
	const errors = [];
	const actions = [];
	const resolveDeepest = (target, label) => {
		const missing = [];
		let existing = target;
		while (!existsSync(existing) && dirname(existing) !== existing) {
			missing.unshift(basename(existing));
			existing = dirname(existing);
		}
		const existingReal = safeRealpath(existing);
		if (existingReal === void 0) {
			errors.push(label + ": cannot resolve the path (" + target + "); it has an unreadable component");
			return;
		}
		if (existsSync(existingReal) && !isDirectory(existingReal)) {
			errors.push(label + ": a parent path is not a directory (" + display(projectRoot, existingReal) + ")");
			return;
		}
		const canonical = resolve(existingReal, ...missing);
		if (!isInside(projectReal, canonical)) {
			errors.push(label + ": resolves outside the project root (" + canonical + "); it must live in the project checkout");
			return;
		}
		if (projectGitDirectory !== void 0 && isInside(projectGitDirectory, canonical)) {
			errors.push(label + ": resolves inside the project's Git directory (" + canonical + "); it must live in the project worktree");
			return;
		}
		return canonical;
	};
	try {
		if (!existsSync(requestedRoot) && lstatSync(requestedRoot).isSymbolicLink()) errors.push("init: the notes root is a dangling symlink (" + requestedRoot + ")");
		else if (existsSync(requestedRoot) && !isDirectory(requestedRoot)) errors.push("init: the notes root exists and is not a directory (" + requestedRoot + ")");
	} catch {}
	if (errors.length > 0) return {
		errors,
		actions,
		root: requestedRoot
	};
	const failed = /* @__PURE__ */ new Set();
	const root = resolveDeepest(requestedRoot, "init: the notes root");
	const targets = [];
	const validated = [];
	if (root !== void 0) {
		let existingArchive = join(root, ARCHIVE);
		while (!existsSync(existingArchive) && dirname(existingArchive) !== existingArchive) existingArchive = dirname(existingArchive);
		const archiveGit = gitDirectory(existingArchive);
		if (projectGitDirectory !== void 0 && archiveGit !== void 0 && archiveGit !== projectGitDirectory) errors.push("init: the notes/archive root is inside a different Git checkout (" + display(projectRoot, existingArchive) + "); the archive baseline must belong to the project checkout");
		if (errors.length > 0) return {
			errors,
			actions,
			root: requestedRoot
		};
		validated.push(root);
		for (const lifecycle of LIFECYCLES) {
			validated.push(join(root, lifecycle));
			for (const kind of CLASSES) targets.push(join(root, lifecycle, kind));
		}
		validated.push(join(root, ARCHIVE));
		for (const kind of CLASSES) targets.push(join(root, ARCHIVE, kind));
		validated.push(...targets);
		for (const target of validated) {
			if ([...failed].some((parent) => isInside(parent, target) && parent !== target)) continue;
			try {
				if (!existsSync(target) && lstatSync(target).isSymbolicLink()) {
					errors.push("init: " + display(projectRoot, target) + " is a dangling symlink");
					continue;
				}
			} catch {}
			const canonical = resolveDeepest(target, "init: " + display(projectRoot, target));
			if (canonical === void 0) {
				failed.add(target);
				continue;
			}
			if (existsSync(canonical) && !isDirectory(canonical)) errors.push("init: " + display(projectRoot, canonical) + " exists and is not a directory");
		}
	}
	if (errors.length > 0) return {
		errors,
		actions,
		root: root ?? requestedRoot
	};
	for (const target of targets) {
		const canonical = safeRealpath(target) ?? target;
		if (!isDirectory(canonical)) try {
			mkdirSync(canonical, { recursive: true });
			actions.push("create " + display(projectRoot, canonical) + "/");
		} catch (error) {
			errors.push("init: cannot create " + display(projectRoot, canonical) + " (" + (error instanceof Error && "code" in error ? error.code : "write error") + ")");
			continue;
		}
		let entries;
		try {
			entries = readdirSync(canonical);
		} catch {
			errors.push("init: " + display(projectRoot, canonical) + " is unreadable");
			continue;
		}
		if (entries.length > 0) continue;
		const placeholder = join(canonical, GITKEEP);
		try {
			writeFileSync(placeholder, "");
			actions.push("create " + display(projectRoot, placeholder));
		} catch (error) {
			errors.push("init: cannot create " + display(projectRoot, placeholder) + " (" + (error instanceof Error && "code" in error ? error.code : "write error") + ")");
		}
	}
	return {
		errors,
		actions,
		root: root ?? requestedRoot
	};
}
function display(projectRoot, path) {
	return relative(projectRoot, path).split(sep).join("/");
}
function safeRealpath(path) {
	try {
		return realpathSync(path);
	} catch {
		return;
	}
}
function isInside(parent, child) {
	return child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
}
function isDirectory(path) {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}
function safeReaddir(dir, errors, label) {
	try {
		return readdirSync(dir, { withFileTypes: true });
	} catch (error) {
		errors.push(label + ": unreadable directory (" + (error instanceof Error && "code" in error ? error.code : "read error") + ")");
		return [];
	}
}
function safeReadFile(path, errors, label) {
	try {
		return readFileSync(path);
	} catch (error) {
		errors.push(label + ": unreadable file (" + (error instanceof Error && "code" in error ? error.code : "read error") + ")");
		return;
	}
}
function entryKind(path) {
	try {
		const stat = statSync(path);
		return stat.isDirectory() ? "dir" : stat.isFile() ? "file" : "other";
	} catch {
		return "other";
	}
}
function markdownFiles(dir, onUnreadable = () => {}, seen = /* @__PURE__ */ new Set()) {
	const real = safeRealpath(dir);
	if (real !== void 0) {
		if (seen.has(real)) return [];
		seen.add(real);
	}
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		onUnreadable(dir);
		return [];
	}
	const found = [];
	for (const entry of entries) {
		const path = join(dir, entry.name);
		const kind = entryKind(path);
		if (kind === "file") {
			if (entry.name.endsWith(".md")) found.push(path);
			continue;
		}
		if (kind === "dir") {
			found.push(...markdownFiles(path, onUnreadable, seen));
			continue;
		}
		if (entry.name.endsWith(".md")) onUnreadable(path);
	}
	return found;
}
function readLines(path) {
	return readFileSync(path, "utf8").split("\n");
}
function proseLines(lines) {
	const prose = [];
	let inFence = false;
	for (const line of lines) {
		if (line.startsWith("```")) {
			inFence = !inFence;
			continue;
		}
		if (!inFence) prose.push(line);
	}
	return prose;
}
function validDate(value) {
	const match = DATE.exec(value);
	if (match === null) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function formatErrors(projectRoot, file, lifecycle, noteDate, formatAdopted) {
	const errors = [];
	const fail = (message) => errors.push(`format: ${display(projectRoot, file)} — ${message}`);
	let lines;
	try {
		lines = readLines(file);
	} catch (error) {
		fail("unreadable note (" + (error instanceof Error && "code" in error ? error.code : "read error") + ")");
		return errors;
	}
	const prose = proseLines(lines);
	if (!/^# Agent Note: \S/.test(lines[0] ?? "")) fail("line 1 must be `# Agent Note: <title>`");
	if (lines[1] !== "") fail("line 2 must be blank");
	const status = STATUS[lifecycle];
	if (status !== void 0 && !status.test(lines[2] ?? "")) fail(`line 3 must match the ${lifecycle} status grammar (${String(status)})`);
	if (lines[3] !== "") fail("line 4 must be blank");
	if (prose.filter((line) => line.startsWith("Status:") && line !== lines[2]).length > 0 || prose.filter((line) => line === lines[2]).length > 1) fail("the line-3 `Status:` line must be the only one in the file");
	const h2s = prose.filter((line) => line.startsWith("## ")).map((line) => line.trimEnd());
	if (h2s[0] !== "## Problem") fail(`the first section must be \`## Problem\` (got ${JSON.stringify(h2s[0] ?? "<none>")})`);
	for (const required of REQUIRED[lifecycle] ?? []) if (!h2s.includes(required)) fail(`missing the required \`${required}\` section`);
	if (lifecycle === "implemented") for (const h2 of h2s.filter((heading) => BANNED_IMPLEMENTED.test(heading))) fail(`\`${h2}\` is a proposal-era heading; an implemented note states what is`);
	const hasSection = h2s.includes("## Alternatives considered");
	const hasGrandfather = prose.includes(GRANDFATHER);
	if (hasSection && hasGrandfather) fail("carries both `## Alternatives considered` and the pre-format comment — drop the comment");
	if (!hasSection && !hasGrandfather) fail("missing `## Alternatives considered` (each genuine alternative and why it lost)");
	if (hasGrandfather) {
		if (formatAdopted === void 0) fail("the pre-format alternatives comment requires --format-adopted <yyyy-mm-dd>");
		else if (noteDate >= formatAdopted) fail(`the pre-format alternatives comment is only valid for notes dated before ${formatAdopted}`);
	}
	return errors;
}
function walkActiveTree(projectRoot, root, companions, formatAdopted) {
	const errors = [];
	let notes = 0;
	let companionFiles = 0;
	const rootReal = safeRealpath(root);
	if (rootReal !== void 0) {
		if (!isInside(safeRealpath(projectRoot) ?? resolve(projectRoot), rootReal)) {
			errors.push("check: the notes root resolves outside the project root (" + rootReal + "); the notes tree must live in the project checkout");
			return {
				errors,
				notes,
				companionFiles
			};
		}
		const checkProjectGit = gitDirectory(projectRoot);
		if (checkProjectGit !== void 0 && isInside(checkProjectGit, rootReal)) {
			errors.push("check: the notes root is inside the project Git directory (" + display(projectRoot, rootReal) + "); it must live in the project worktree");
			return {
				errors,
				notes,
				companionFiles
			};
		}
	}
	const projectReal = safeRealpath(projectRoot) ?? resolve(projectRoot);
	const walkProjectGit = gitDirectory(projectRoot);
	const entryViolation = (target) => {
		const real = safeRealpath(target);
		if (real === void 0) return void 0;
		if (!isInside(projectReal, real)) return "resolves outside the project checkout";
		if (walkProjectGit !== void 0 && isInside(walkProjectGit, real)) return "resolves inside the project's Git directory";
	};
	if (!isDirectory(root)) {
		errors.push(`structure: notes root not found: ${display(projectRoot, root)}; run init or pass --root`);
		return {
			errors,
			notes,
			companionFiles
		};
	}
	for (const entry of safeReaddir(root, errors, `structure: ${display(projectRoot, root)}`)) {
		if (entry.name === "INDEX.md") {
			errors.push("structure: INDEX.md — centralized note indexes are forbidden; browse the lifecycle and class folders instead");
			continue;
		}
		if (entryKind(join(root, entry.name)) !== "dir" || entry.name === ARCHIVE) continue;
		if (!LIFECYCLES.includes(entry.name)) {
			errors.push(`structure: ${entry.name}/ — unknown lifecycle folder (allowed: ${LIFECYCLES.join(", ")}, plus ${ARCHIVE}/)`);
			continue;
		}
		const lifecycleRoot = join(root, entry.name);
		const lifecycleProblem = entryViolation(lifecycleRoot);
		if (lifecycleProblem !== void 0) {
			errors.push(`structure: ${display(projectRoot, lifecycleRoot)} — ${lifecycleProblem}`);
			continue;
		}
		for (const classEntry of safeReaddir(lifecycleRoot, errors, `structure: ${display(projectRoot, lifecycleRoot)}`)) {
			const classKind = entryKind(join(lifecycleRoot, classEntry.name));
			if (classKind === "file") {
				const rootCompanion = companionSuffixOf(classEntry.name, companions);
				if (rootCompanion !== void 0) {
					const stem = classEntry.name.slice(0, -rootCompanion.length);
					companionFiles += 1;
					if (entryKind(join(lifecycleRoot, `${stem}.md`)) !== "file") errors.push(`companions: ${display(projectRoot, join(lifecycleRoot, classEntry.name))} — no source note ${stem}.md`);
					continue;
				}
				if (!classEntry.name.endsWith(".md") || ROOT_ALLOWLIST.has(classEntry.name)) continue;
				errors.push(`structure: ${display(projectRoot, join(lifecycleRoot, classEntry.name))} — expected {lifecycle}/{class}/file.md (got depth 2)`);
				continue;
			}
			if (classKind !== "dir") {
				if (classEntry.name.endsWith(".md") || companions.some((suffix) => classEntry.name.endsWith(suffix))) errors.push(`structure: ${display(projectRoot, join(lifecycleRoot, classEntry.name))} — unreadable entry (dangling symlink or special file)`);
				continue;
			}
			const classRoot = join(lifecycleRoot, classEntry.name);
			const classProblem = entryViolation(classRoot);
			if (classProblem !== void 0) {
				errors.push(`structure: ${display(projectRoot, classRoot)} — ${classProblem}`);
				continue;
			}
			if (!CLASSES.includes(classEntry.name)) {
				for (const file of markdownFiles(classRoot, (broken) => errors.push(`structure: ${display(projectRoot, broken)} — unreadable Markdown entry (dangling symlink or special file)`))) errors.push(`structure: ${display(projectRoot, file)} — unknown class folder "${classEntry.name}" (allowed: ${CLASSES.join(", ")})`);
				continue;
			}
			for (const noteEntry of safeReaddir(classRoot, errors, `structure: ${display(projectRoot, classRoot)}`)) {
				const noteKind = entryKind(join(classRoot, noteEntry.name));
				if (noteKind !== "file") {
					if (noteKind === "dir") for (const file of markdownFiles(join(classRoot, noteEntry.name), (broken) => errors.push(`structure: ${display(projectRoot, broken)} — unreadable Markdown entry (dangling symlink or special file)`))) {
						if (companions.some((suffix) => file.endsWith(suffix))) continue;
						errors.push(`structure: ${display(projectRoot, file)} — expected {lifecycle}/{class}/file.md (nested deeper)`);
					}
					else if (noteEntry.name.endsWith(".md") || companions.some((suffix) => noteEntry.name.endsWith(suffix))) errors.push(`structure: ${display(projectRoot, join(classRoot, noteEntry.name))} — unreadable entry (dangling symlink or special file)`);
					continue;
				}
				const noteProblem = entryViolation(join(classRoot, noteEntry.name));
				if (noteProblem !== void 0) {
					errors.push(`structure: ${display(projectRoot, join(classRoot, noteEntry.name))} — ${noteProblem}`);
					continue;
				}
				const name = noteEntry.name;
				const companionSuffix = companionSuffixOf(name, companions);
				if (companionSuffix !== void 0) {
					companionFiles += 1;
					const stem = name.slice(0, -companionSuffix.length);
					if (entryKind(join(classRoot, `${stem}.md`)) !== "file") errors.push(`companions: ${display(projectRoot, join(classRoot, name))} — no source note ${stem}.md`);
					continue;
				}
				if (!name.endsWith(".md")) continue;
				notes += 1;
				const match = FILENAME.exec(name);
				if (match === null) {
					errors.push(`structure: ${display(projectRoot, join(classRoot, name))} — filename must be yyyy-mm-dd-topic.md`);
					continue;
				}
				const noteDate = `${match[1]}-${match[2]}-${match[3]}`;
				errors.push(...formatErrors(projectRoot, join(classRoot, name), entry.name, noteDate, formatAdopted));
			}
		}
	}
	return {
		errors,
		notes,
		companionFiles
	};
}
function contentHash(content) {
	return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
function parseManifest(content) {
	const value = JSON.parse(content);
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("expected a JSON object");
	if (Object.keys(value).sort().join(",") !== "files,version") throw new Error("expected exactly the fields `version` and `files`");
	if (value.version !== 1) throw new Error("unsupported manifest version (expected 1)");
	if (typeof value.files !== "object" || value.files === null || Array.isArray(value.files)) throw new Error("`files` must be an object");
	const files = {};
	for (const [path, hash] of Object.entries(value.files)) {
		if (typeof hash !== "string" || !HASH.test(hash)) throw new Error(`invalid content hash for ${path}`);
		files[path] = hash;
	}
	return {
		version: 1,
		files
	};
}
function comparePaths(left, right) {
	return left < right ? -1 : left > right ? 1 : 0;
}
function renderManifest(files) {
	const sorted = Object.fromEntries(Object.entries(files).sort(([left], [right]) => comparePaths(left, right)));
	return `${JSON.stringify({
		version: 1,
		files: sorted
	}, null, 2)}\n`;
}
function git(projectRoot, args) {
	const result = spawnSync("git", args, {
		cwd: projectRoot,
		encoding: "utf8"
	});
	if (result.error !== void 0) throw result.error;
	if (result.status !== 0) throw new Error(result.stderr.trim() || `git exited with status ${result.status}`);
	return result.stdout;
}
function gitDirectory(cwd) {
	try {
		return realpathSync(resolve(cwd, git(cwd, ["rev-parse", "--absolute-git-dir"]).trim()));
	} catch {
		return;
	}
}
function readBaseline(projectRoot, ref, manifestRepoPath) {
	git(projectRoot, [
		"cat-file",
		"-e",
		`${ref}^{commit}`
	]);
	if (git(projectRoot, [
		"ls-tree",
		"--name-only",
		ref,
		"--",
		manifestRepoPath
	]).trim() === "") return {
		version: 1,
		files: {}
	};
	return parseManifest(git(projectRoot, ["show", `${ref}:${manifestRepoPath}`]));
}
function extendManifest(manifest, artifacts) {
	const errors = [];
	const files = { ...manifest.files };
	for (const [path, expected] of Object.entries(manifest.files)) {
		const content = artifacts.get(path);
		if (content === void 0) errors.push(`archive: ${path} — sealed artifact is missing`);
		else if (contentHash(content) !== expected) errors.push(`archive: ${path} — sealed content hash changed`);
	}
	const added = [];
	for (const path of [...artifacts.keys()].sort(comparePaths)) {
		if (files[path] !== void 0) continue;
		files[path] = contentHash(artifacts.get(path));
		added.push(path);
	}
	return {
		files,
		added,
		errors
	};
}
function unitKeyFor(path, companions) {
	const [kind, name] = path.split("/");
	const companionSuffix = companionSuffixOf(name, companions);
	if (companionSuffix !== void 0) {
		const key = name.slice(0, -companionSuffix.length);
		return {
			kind,
			key,
			unitKey: `${kind}/${key}`
		};
	}
	if (name.endsWith(".md")) {
		const key = name.slice(0, -3);
		return {
			kind,
			key,
			unitKey: `${kind}/${key}`
		};
	}
}
function unitErrors(artifacts, companions, baselineFiles, sealNewUnits) {
	const errors = [];
	const units = /* @__PURE__ */ new Map();
	for (const path of artifacts.keys()) {
		const [kind, name] = path.split("/");
		const companionSuffix = companionSuffixOf(name, companions);
		let key;
		if (companionSuffix !== void 0) key = name.slice(0, -companionSuffix.length);
		else if (name.endsWith(".md")) key = name.slice(0, -3);
		else {
			if (!Object.prototype.hasOwnProperty.call(baselineFiles, path)) errors.push("archive: " + path + " — not a Markdown note or a declared companion suffix (declared: " + (companions.join(", ") || "none") + ")");
			continue;
		}
		const unitKey = kind + "/" + key;
		if (companions.some((suffix) => (key + ".md").endsWith(suffix))) {
			errors.push("archive: " + unitKey + " — the unit source " + key + ".md is itself a declared companion; companions are flat");
			continue;
		}
		const unit = units.get(unitKey) ?? {
			paths: [],
			kind,
			key
		};
		unit.paths.push(path);
		units.set(unitKey, unit);
	}
	const baselineUnits = /* @__PURE__ */ new Set();
	for (const path of Object.keys(baselineFiles)) {
		const parsed = unitKeyFor(path, companions);
		if (parsed !== void 0) baselineUnits.add(parsed.unitKey);
	}
	for (const [unitKey, unit] of [...units].sort(([left], [right]) => comparePaths(left, right))) {
		const sourcePath = unit.kind + "/" + unit.key + ".md";
		if (baselineUnits.has(unitKey)) {
			for (const path of unit.paths) if (!Object.prototype.hasOwnProperty.call(baselineFiles, path)) errors.push("archive: " + unitKey + " — sealed unit cannot gain artifact " + path);
			continue;
		}
		const match = FILENAME.exec(unit.key + ".md");
		if (match === null) errors.push("archive: " + unitKey + " — unit name must be yyyy-mm-dd-topic");
		if (!artifacts.has(sourcePath)) errors.push("archive: " + unitKey + " — incomplete unit; missing source note " + sourcePath);
		if (sealNewUnits) for (const suffix of companions) {
			const companionPath = unit.kind + "/" + unit.key + suffix;
			if (!artifacts.has(companionPath)) errors.push("archive: " + unitKey + " — incomplete unit; missing " + companionPath);
		}
		const archiveDates = [];
		for (const path of unit.paths) {
			if (!path.endsWith(".md")) continue;
			const prose = proseLines(artifacts.get(path).toString("utf8").split("\n"));
			const statusLines = prose.filter((line) => line.startsWith("Status:"));
			if (statusLines.length !== 1) errors.push("archive: " + path + " — requires exactly one Status: line (got " + statusLines.length + ")");
			const statusIndex = prose.findIndex((line) => line.startsWith("Status:"));
			if ((statusLines[0] ?? "") !== "Status: implemented") errors.push("archive: " + path + " — requires Status: implemented");
			const archived = statusIndex >= 0 ? /^Archived: (\d{4}-\d{2}-\d{2})$/.exec(prose[statusIndex + 1] ?? "")?.[1] : void 0;
			if (archived === void 0 || !validDate(archived)) {
				errors.push("archive: " + path + " — requires Archived: YYYY-MM-DD with a valid date immediately below the status");
				continue;
			}
			archiveDates.push(archived);
			if (match !== null && archived < match[1] + "-" + match[2] + "-" + match[3]) errors.push("archive: " + path + " — archive date " + archived + " predates the note date");
		}
		const distinctDates = [...new Set(archiveDates)];
		if (distinctDates.length > 1) errors.push("archive: " + unitKey + " — Markdown sides carry different archive dates (" + distinctDates.join(", ") + ")");
	}
	return errors;
}
function archiveCommand(projectRoot, options) {
	const root = resolve(projectRoot, options.root ?? DEFAULT_ROOT);
	const archiveRoot = join(root, ARCHIVE);
	const errors = [];
	const artifacts = /* @__PURE__ */ new Map();
	const projectReal = safeRealpath(projectRoot) ?? resolve(projectRoot);
	const projectGitDirectory = gitDirectory(projectRoot);
	const insideProjectGit = (target) => target !== void 0 && projectGitDirectory !== void 0 && isInside(projectGitDirectory, target);
	const rootReal = safeRealpath(root);
	if (rootReal === void 0) errors.push("archive: notes root not found: " + display(projectRoot, root) + "; run \"notes.mjs init\" first");
	else {
		if (!isInside(projectReal, rootReal)) errors.push("archive: the notes root resolves outside the project root (" + rootReal + "); the notes tree must live in the project checkout");
		if (insideProjectGit(rootReal)) errors.push("archive: the notes root is inside the project Git directory (" + display(projectRoot, rootReal) + "); it must live in the project worktree");
	}
	const archiveReal = safeRealpath(archiveRoot);
	if (archiveReal !== void 0) {
		if (!isInside(projectReal, archiveReal)) errors.push("archive: the archive root resolves outside the project root (" + archiveReal + "); the archive must live in the project checkout");
		if (insideProjectGit(archiveReal)) errors.push("archive: the archive root is inside the project Git directory (" + display(projectRoot, archiveReal) + "); it must live in the project worktree");
		const archiveGitDirectory = gitDirectory(archiveRoot);
		if (projectGitDirectory === void 0 || archiveGitDirectory === void 0 || archiveGitDirectory !== projectGitDirectory) errors.push("archive: the archive root (" + display(projectRoot, archiveRoot) + ") is not in the project Git checkout (" + (archiveGitDirectory ?? "not a Git worktree") + "); run from the project checkout");
	}
	if (!isDirectory(archiveRoot)) errors.push("archive: archive root not found: " + display(projectRoot, archiveRoot) + "; run \"notes.mjs init\" first");
	else {
		const kinds = /* @__PURE__ */ new Set();
		for (const entry of safeReaddir(archiveRoot, errors, "archive: archived")) {
			if (entry.isFile()) {
				if (!ARCHIVE_ROOT_ALLOWLIST.has(entry.name)) errors.push("archive: archived/" + entry.name + " — unexpected root file");
				continue;
			}
			if (!entry.isDirectory()) {
				errors.push("archive: archived/" + entry.name + " — only regular files and class folders are allowed");
				continue;
			}
			if (!CLASSES.includes(entry.name)) {
				errors.push("archive: archived/" + entry.name + "/ — unknown class folder (allowed: " + CLASSES.join(", ") + ")");
				continue;
			}
			kinds.add(entry.name);
			for (const fileEntry of safeReaddir(join(archiveRoot, entry.name), errors, "archive: archived/" + entry.name)) {
				if (fileEntry.name === GITKEEP) continue;
				const rel = entry.name + "/" + fileEntry.name;
				if (!fileEntry.isFile()) {
					errors.push("archive: " + rel + " — class folders contain regular files only");
					continue;
				}
				const content = safeReadFile(join(archiveRoot, entry.name, fileEntry.name), errors, "archive: " + rel);
				if (content !== void 0) artifacts.set(rel, content);
			}
		}
		for (const kind of CLASSES) if (!kinds.has(kind)) errors.push("archive: archived/" + kind + "/ — required class directory is missing");
	}
	const manifestPath = join(archiveRoot, MANIFEST);
	const manifestReal = safeRealpath(manifestPath);
	if (manifestReal !== void 0 && !isInside(projectReal, manifestReal)) errors.push(`archive: the manifest resolves outside the project root (${manifestReal}); the archive baseline must stay in the project`);
	let manifest = {
		version: 1,
		files: {}
	};
	if (existsSync(manifestPath)) try {
		manifest = parseManifest(readFileSync(manifestPath, "utf8"));
	} catch (error) {
		errors.push(`manifest: ${error instanceof Error ? error.message : String(error)}`);
		manifest = {
			version: 1,
			files: {}
		};
	}
	else if (!options.write) errors.push("manifest: archived/manifest.json is required; seal new units with `archive --write`");
	const manifestLocationReal = manifestReal ?? (archiveReal !== void 0 ? join(archiveReal, MANIFEST) : void 0);
	let manifestRepoPath;
	if (manifestLocationReal !== void 0) {
		const rel = relative(projectReal, manifestLocationReal).split(sep).join("/");
		if (isAbsolute(rel) || rel.split("/")[0] === "..") errors.push("archive: the manifest resolves outside the project root (" + (manifestLocationReal ?? manifestPath) + "); archive verification needs a manifest inside the project");
		else manifestRepoPath = rel;
	}
	if (!options.write && Object.keys(manifest.files).length > 0 && manifestRepoPath !== void 0) try {
		git(projectRoot, [
			"ls-files",
			"--error-unmatch",
			"--",
			manifestRepoPath
		]);
	} catch {
		errors.push("manifest: " + manifestRepoPath + " is not tracked by Git; stage or commit the archive before verifying, or run \"archive --write\" to seal");
	}
	let added = [];
	if (manifestRepoPath !== void 0) {
		const baseRef = options.baseRef ?? "HEAD";
		let baseline = {
			version: 1,
			files: {}
		};
		try {
			baseline = readBaseline(projectRoot, baseRef, manifestRepoPath);
			for (const [path, expected] of Object.entries(baseline.files)) {
				const actual = manifest.files[path];
				if (actual === void 0) errors.push("manifest: " + path + " — sealed manifest entry is missing");
				else if (actual !== expected) errors.push("manifest: " + path + " — sealed manifest hash changed");
			}
		} catch (error) {
			errors.push("manifest: cannot read baseline " + JSON.stringify(baseRef) + ": " + (error instanceof Error ? error.message : String(error)) + "; archive verification needs a Git repository and that commit");
		}
		if (options.write) errors.push(...unitErrors(artifacts, options.companions, baseline.files, options.write));
		const extension = extendManifest(manifest, artifacts);
		errors.push(...extension.errors);
		added = extension.added;
		if (!options.write) for (const path of added) errors.push("archive: " + path + " — archived artifact is not sealed in manifest.json; seal it with \"archive --write\"");
		if (options.write && errors.length === 0) {
			const rendered = renderManifest(extension.files);
			if (!existsSync(manifestPath) || readFileSync(manifestPath, "utf8") !== rendered) writeFileSync(manifestPath, rendered);
		}
	}
	const sealed = options.write && errors.length === 0 ? added.length : 0;
	return {
		errors,
		summary: {
			artifacts: artifacts.size,
			sealed
		}
	};
}
function main() {
	let options;
	try {
		options = parseArgs(process.argv);
	} catch (error) {
		if (error instanceof UsageError) {
			console.error(`notes.mjs: ${error.message}`);
			console.error("run \"notes.mjs --help\" for usage");
			process.exit(2);
		}
		throw error;
	}
	if (options.help) {
		console.log(USAGE);
		return;
	}
	const label = options.command === "archive" && options.write ? "archive --write" : options.command;
	const projectRoot = detectProjectRoot();
	if (projectRoot === void 0) {
		const bare = spawnSync("git", ["rev-parse", "--is-bare-repository"], { encoding: "utf8" });
		const violations = [bare.status === 0 && bare.stdout.trim() === "true" ? "project: this is a bare Git repository with no worktree; run from a checkout and commit before using this skill" : "project: not a Git repository; install Git and initialize/commit the project before using this skill"];
		if (options.json) console.log(JSON.stringify({
			command: label,
			root: null,
			ok: false,
			violations
		}));
		else {
			console.log("FAIL " + label + " — 1 violation(s)");
			for (const violation of violations) console.log("  - " + violation);
		}
		process.exit(1);
	}
	const root = resolve(projectRoot, options.root ?? DEFAULT_ROOT);
	let result;
	if (options.command === "init") result = initCommand(projectRoot, options);
	else if (options.command === "check") result = walkActiveTree(projectRoot, root, options.companions, options.formatAdopted);
	else result = archiveCommand(projectRoot, options);
	const ok = result.errors.length === 0;
	const summary = {
		command: label,
		root: display(projectRoot, options.command === "init" ? result.root ?? root : root),
		ok,
		violations: result.errors,
		...options.command === "init" ? { created: result.actions.length } : options.command === "check" ? {
			notes: result.notes,
			companions: result.companionFiles
		} : {
			artifacts: result.summary.artifacts,
			sealed: result.summary.sealed
		}
	};
	if (options.json) console.log(JSON.stringify(summary));
	else if (ok) {
		if (options.command === "init") console.log(result.actions.length === 0 ? "ok   init — already initialized at " + summary.root : "ok   init — " + result.actions.length + " item(s) created at " + summary.root);
		else if (options.command === "check") console.log("ok   check — " + result.notes + " note(s) and " + result.companionFiles + " companion(s) checked");
		else if (options.write) console.log("ok   archive --write — sealed " + result.summary.sealed + " new artifact(s); " + result.summary.artifacts + " frozen artifact(s) checked");
		else console.log("ok   archive — " + result.summary.artifacts + " frozen artifact(s) checked");
	} else {
		console.log("FAIL " + label + " — " + result.errors.length + " violation(s)");
		for (const error of result.errors) console.log("  - " + error);
	}
	process.exit(ok ? 0 : 1);
}
main();
export {};
