#!/usr/bin/env node
// Generated from package/dsh-spec-agent-notes/notes.ts by `pnpm run skill:build`; edit the source and rebuild. Bundled third-party code is covered by the skill-root THIRD_PARTY_NOTICES.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
// constants.ts
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
const ROOT_ALLOWLIST = /* @__PURE__ */ new Set(["AGENTS.md", "CLAUDE.md"]);
const ARCHIVE_ROOT_ALLOWLIST = /* @__PURE__ */ new Set([MANIFEST, "AGENTS.md"]);
const GITKEEP = ".gitkeep";
const FILENAME = /^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HASH = /^sha256:[0-9a-f]{64}$/;
const COMPANION = /^\.[A-Za-z0-9._-]*[A-Za-z0-9]$/;
function isLifecycle(value) {
	return LIFECYCLES.includes(value);
}
function isClassKind(value) {
	return CLASSES.includes(value);
}
// guards.ts
/**
* SPDX-License-Identifier: MIT
*
* Adapted from the DeepSeek Harness note-gate scripts at the pinned
* `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
* THIRD_PARTY_NOTICES names the upstream paths and the relation.
*/
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
function errorCode(error, fallback) {
	return error instanceof Error && "code" in error ? String(error.code) : fallback;
}
function safeReaddir(dir, errors, label) {
	try {
		return readdirSync(dir, { withFileTypes: true });
	} catch (error) {
		errors.push(label + ": unreadable directory (" + errorCode(error, "read error") + ")");
		return [];
	}
}
function safeReadFile(path, errors, label) {
	try {
		return readFileSync(path);
	} catch (error) {
		errors.push(label + ": unreadable file (" + errorCode(error, "read error") + ")");
		return;
	}
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
function detectProjectRoot() {
	const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
	if (result.status === 0 && result.stdout.trim() !== "") return realpathSync(result.stdout.trim());
}
function isBareRepository() {
	const result = spawnSync("git", ["rev-parse", "--is-bare-repository"], { encoding: "utf8" });
	return result.status === 0 && result.stdout.trim() === "true";
}
/**
* Resolve the project root once. Every containment check reads this layout, so the notes root,
* the archive root and every walked entry are judged against the same canonical boundary.
*/
function resolveProjectLayout(projectRoot) {
	const projectReal = safeRealpath(projectRoot) ?? resolve(projectRoot);
	const projectGitDirectory = gitDirectory(projectRoot);
	return {
		projectRoot,
		projectReal,
		gitDirectory: projectGitDirectory,
		isInsideProject: (path) => isInside(projectReal, path),
		isInsideGitDirectory: (path) => projectGitDirectory !== void 0 && isInside(projectGitDirectory, path)
	};
}
/**
* Canonicalize a target that may not exist yet by resolving its deepest existing ancestor and
* appending the missing names, then judge the result against the project layout.
*/
function resolveProjectPath(layout, target) {
	const missing = [];
	let existing = target;
	while (!existsSync(existing) && dirname(existing) !== existing) {
		missing.unshift(basename(existing));
		existing = dirname(existing);
	}
	const existingReal = safeRealpath(existing);
	if (existingReal === void 0) return {
		ok: false,
		problem: "unreadable",
		path: target
	};
	if (existsSync(existingReal) && !isDirectory(existingReal)) return {
		ok: false,
		problem: "not-a-directory",
		path: existingReal
	};
	const canonical = resolve(existingReal, ...missing);
	if (!layout.isInsideProject(canonical)) return {
		ok: false,
		problem: "outside-project",
		path: canonical
	};
	if (layout.isInsideGitDirectory(canonical)) return {
		ok: false,
		problem: "inside-git",
		path: canonical
	};
	return {
		ok: true,
		path: canonical
	};
}
function resolveNotesPaths(projectRoot, rootOption) {
	const root = resolve(projectRoot, rootOption ?? ".agents/dsh-spec-agent-notes");
	const archiveRoot = join(root, ARCHIVE);
	return {
		root,
		archiveRoot,
		manifestPath: join(archiveRoot, MANIFEST)
	};
}
// format.ts
/**
* SPDX-License-Identifier: MIT
*
* Adapted from the DeepSeek Harness note-gate scripts at the pinned
* `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
* THIRD_PARTY_NOTICES names the upstream paths and the relation.
*/
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
/** The declared suffix a filename ends with, preferring the longest and then the smallest. */
function companionSuffixOf(name, companions) {
	return [...companions].sort((a, b) => b.length - a.length || a.localeCompare(b)).find((suffix) => name.endsWith(suffix));
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
/** The lines outside fenced code blocks, where headings and metadata are read from. */
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
function readLines(path) {
	return readFileSync(path, "utf8").split("\n");
}
/** The header, required sections, proposal-era headings and alternatives rule for one note. */
function formatErrors(projectRoot, file, lifecycle, noteDate, formatAdopted) {
	const errors = [];
	const fail = (message) => {
		errors.push(`format: ${display(projectRoot, file)} — ${message}`);
	};
	let lines;
	try {
		lines = readLines(file);
	} catch (error) {
		fail("unreadable note (" + errorCode(error, "read error") + ")");
		return errors;
	}
	const prose = proseLines(lines);
	if (!/^# Agent Note: \S/.test(lines[0] ?? "")) fail("line 1 must be `# Agent Note: <title>`");
	if (lines[1] !== "") fail("line 2 must be blank");
	const status = STATUS[lifecycle];
	if (!status.test(lines[2] ?? "")) fail(`line 3 must match the ${lifecycle} status grammar (${String(status)})`);
	if (lines[3] !== "") fail("line 4 must be blank");
	if (prose.filter((line) => line.startsWith("Status:") && line !== lines[2]).length > 0 || prose.filter((line) => line === lines[2]).length > 1) fail("the line-3 `Status:` line must be the only one in the file");
	const h2s = prose.filter((line) => line.startsWith("## ")).map((line) => line.trimEnd());
	if (h2s[0] !== "## Problem") fail(`the first section must be \`## Problem\` (got ${JSON.stringify(h2s[0] ?? "<none>")})`);
	for (const required of REQUIRED[lifecycle]) if (!h2s.includes(required)) fail(`missing the required \`${required}\` section`);
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
// manifest.ts
/**
* SPDX-License-Identifier: MIT
*
* Adapted from the DeepSeek Harness note-gate scripts at the pinned
* `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
* THIRD_PARTY_NOTICES names the upstream paths and the relation.
*/
function emptyManifest() {
	return {
		version: 1,
		files: {}
	};
}
function contentHash(content) {
	return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
function parseManifest(content) {
	const value = JSON.parse(content);
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("expected a JSON object");
	if (Object.keys(value).sort().join(",") !== "files,version") throw new Error("expected exactly the fields `version` and `files`");
	const record = value;
	if (record.version !== 1) throw new Error("unsupported manifest version (expected 1)");
	if (typeof record.files !== "object" || record.files === null || Array.isArray(record.files)) throw new Error("`files` must be an object");
	const files = {};
	for (const [path, hash] of Object.entries(record.files)) {
		if (typeof hash !== "string" || !HASH.test(hash)) throw new Error(`invalid content hash for ${path}`);
		files[path] = hash;
	}
	return {
		version: 1,
		files
	};
}
/** Code-point path order, so the rendered manifest is deterministic across locales. */
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
	]).trim() === "") return emptyManifest();
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
		const content = artifacts.get(path);
		if (content === void 0) continue;
		files[path] = contentHash(content);
		added.push(path);
	}
	return {
		files,
		added,
		errors
	};
}
// archive.ts
/**
* SPDX-License-Identifier: MIT
*
* Adapted from the DeepSeek Harness note-gate scripts at the pinned
* `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
* THIRD_PARTY_NOTICES names the upstream paths and the relation.
*/
function sealPlanFor(baseCommit, manifest, added, artifacts, companions, members, preflight) {
	return {
		version: 1,
		baseCommit,
		manifestHash: contentHash(Buffer.from(renderManifest(manifest.files))),
		companions: [...new Set(companions)].sort(comparePaths),
		members: [...members].sort((left, right) => comparePaths(left.source, right.source) || comparePaths(left.companion, right.companion)),
		preflight: [...preflight],
		artifacts: added.map((path) => {
			const content = artifacts.get(path);
			if (content === void 0) throw new Error(`archive artifact disappeared while planning: ${path}`);
			return {
				path,
				hash: contentHash(content)
			};
		})
	};
}
function planDigest(plan) {
	return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}
function renderPlan(plan) {
	return {
		id: planDigest(plan),
		...plan
	};
}
function runPreflight(projectRoot, command, args) {
	const result = spawnSync(command, args, {
		cwd: projectRoot,
		encoding: "utf8",
		timeout: 3e4,
		maxBuffer: 1048576
	});
	if (result.error !== void 0) return ["archive: preflight could not start " + JSON.stringify(command) + ": " + result.error.message];
	if (result.status !== 0) {
		const status = result.status === null ? "signal " + String(result.signal) : "exit " + result.status;
		const detail = (result.stderr || result.stdout || "").trim();
		return ["archive: preflight failed (" + status + ")" + (detail === "" ? "" : ": " + detail)];
	}
	return [];
}
function regularArchiveMemberPath(layout, archiveRoot, archiveReal, path) {
	if (archiveReal === void 0) return "archive root is unreadable";
	let current = archiveRoot;
	const segments = path.split("/");
	for (const [index, segment] of segments.entries()) {
		current = join(current, segment);
		let stat;
		try {
			stat = lstatSync(current);
		} catch {
			return "does not exist";
		}
		if (stat.isSymbolicLink()) return "is a symbolic link";
		const final = index === segments.length - 1;
		if (!final && !stat.isDirectory()) return "has a non-directory ancestor";
		if (final && !stat.isFile()) return "is not a regular file";
	}
	const real = safeRealpath(current);
	if (real === void 0) return "is unreadable";
	if (real !== archiveReal && !real.startsWith(archiveReal + sep)) return "resolves outside the archive root";
	if (!layout.isInsideProject(real)) return "resolves outside the project checkout";
	if (layout.isInsideGitDirectory(real)) return "resolves inside the project's Git directory";
}
function explicitArchiveMembers(layout, archiveRoot, archiveReal, members) {
	const errors = [];
	const byCompanion = /* @__PURE__ */ new Map();
	const sources = /* @__PURE__ */ new Set();
	const canonical = /* @__PURE__ */ new Map();
	for (const member of members) {
		const sourceParts = member.source.split("/");
		if (sourceParts.length !== 2 || !isClassKind(sourceParts[0]) || !FILENAME.test(sourceParts[1])) {
			errors.push(`members: ${member.source} — source must be a direct {class}/yyyy-mm-dd-topic.md note`);
			continue;
		}
		const companionParts = member.companion.split("/");
		if (companionParts.length < 2 || companionParts[0] !== sourceParts[0]) {
			errors.push(`members: ${member.source}=${member.companion} — companion must stay under the source class`);
			continue;
		}
		const previous = byCompanion.get(member.companion);
		if (previous !== void 0 && previous !== member.source) {
			errors.push(`members: ${member.companion} — companion is assigned to both ${previous} and ${member.source}`);
			continue;
		}
		byCompanion.set(member.companion, member.source);
		sources.add(member.source);
		canonical.set(member.source + "\0" + member.companion, {
			source: member.source,
			companion: member.companion
		});
		const sourceProblem = regularArchiveMemberPath(layout, archiveRoot, archiveReal, member.source);
		if (sourceProblem !== void 0) errors.push(`members: ${member.source} — source ${sourceProblem}`);
		const companionProblem = regularArchiveMemberPath(layout, archiveRoot, archiveReal, member.companion);
		if (companionProblem !== void 0) errors.push(`members: ${member.companion} — companion ${companionProblem}`);
	}
	for (const source of sources) if (byCompanion.has(source)) errors.push(`members: ${source} — a source note cannot also be a declared companion`);
	return {
		errors,
		canonical: [...canonical.values()].sort((left, right) => comparePaths(left.source, right.source) || comparePaths(left.companion, right.companion)),
		byCompanion
	};
}
function collectClassMembers(archiveRoot, kind, prefix, errors, artifacts) {
	const directory = prefix === "" ? join(archiveRoot, kind) : join(archiveRoot, kind, prefix);
	const label = "archived/" + kind + (prefix === "" ? "" : "/" + prefix);
	for (const entry of safeReaddir(directory, errors, "archive: " + label)) {
		const rel = kind + "/" + (prefix === "" ? "" : prefix + "/") + entry.name;
		if (prefix === "" && entry.name === ".gitkeep") continue;
		if (entry.isDirectory()) {
			collectClassMembers(archiveRoot, kind, prefix === "" ? entry.name : prefix + "/" + entry.name, errors, artifacts);
			continue;
		}
		if (!entry.isFile()) {
			errors.push("archive: " + rel + " — class folders contain only regular files and directories; symbolic links and special entries are forbidden");
			continue;
		}
		const content = safeReadFile(join(archiveRoot, rel), errors, "archive: " + rel);
		if (content !== void 0) artifacts.set(rel, content);
	}
}
/**
* The unit a frozen artifact belongs to: its class folder, its source-note stem and the
* `{kind}/{stem}` key. A path that is neither Markdown nor a declared companion has no unit.
*/
function artifactStateErrors(archiveRoot, before) {
	const errors = [];
	const after = /* @__PURE__ */ new Map();
	for (const kind of CLASSES) collectClassMembers(archiveRoot, kind, "", errors, after);
	const expectedPaths = [...before.keys()].sort(comparePaths);
	const actualPaths = [...after.keys()].sort(comparePaths);
	if (expectedPaths.join("\n") !== actualPaths.join("\n")) {
		errors.push("archive: preflight changed the archive artifact set; prepare the seal again");
		return errors;
	}
	for (const path of expectedPaths) if (contentHash(before.get(path) ?? Buffer.alloc(0)) !== contentHash(after.get(path) ?? Buffer.alloc(0))) errors.push("archive: preflight changed " + path + "; prepare the seal again");
	return errors;
}
function currentManifestHash(manifestPath) {
	if (!existsSync(manifestPath)) return contentHash(Buffer.from(renderManifest(emptyManifest().files)));
	try {
		return contentHash(Buffer.from(renderManifest(parseManifest(readFileSync(manifestPath, "utf8")).files)));
	} catch {
		return;
	}
}
function unitKeyFor(path, companions, byCompanion) {
	const explicitSource = byCompanion.get(path);
	if (explicitSource !== void 0) {
		const [kind, name] = explicitSource.split("/");
		return {
			kind,
			key: name.slice(0, -3),
			unitKey: `${kind}/${name.slice(0, -3)}`
		};
	}
	const parts = path.split("/");
	if (parts.length !== 2) return void 0;
	const [kind, name] = parts;
	const companionSuffix = companionSuffixOf(name, companions);
	let key;
	if (companionSuffix !== void 0) key = name.slice(0, -companionSuffix.length);
	else if (name.endsWith(".md")) key = name.slice(0, -3);
	else return void 0;
	return {
		kind,
		key,
		unitKey: `${kind}/${key}`
	};
}
function unitErrors(artifacts, companions, byCompanion, baselineFiles) {
	const errors = [];
	const units = /* @__PURE__ */ new Map();
	for (const path of artifacts.keys()) {
		const parsed = unitKeyFor(path, companions, byCompanion);
		if (parsed === void 0) {
			if (!Object.prototype.hasOwnProperty.call(baselineFiles, path)) errors.push("archive: " + path + " — not a Markdown note or a declared companion suffix (declared: " + (companions.join(", ") || "none") + ")");
			continue;
		}
		const { kind, key, unitKey } = parsed;
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
		const parsed = unitKeyFor(path, companions, byCompanion);
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
function archiveCommand(layout, paths, options) {
	const projectRoot = layout.projectRoot;
	const root = paths.root;
	const archiveRoot = paths.archiveRoot;
	const manifestPath = paths.manifestPath;
	const errors = [];
	const artifacts = /* @__PURE__ */ new Map();
	const rootReal = safeRealpath(root);
	if (rootReal === void 0) errors.push("archive: notes root not found: " + display(projectRoot, root) + "; run \"notes.mjs init\" first");
	else {
		if (!layout.isInsideProject(rootReal)) errors.push("archive: the notes root resolves outside the project root (" + rootReal + "); the notes tree must live in the project checkout");
		if (layout.isInsideGitDirectory(rootReal)) errors.push("archive: the notes root is inside the project Git directory (" + display(projectRoot, rootReal) + "); it must live in the project worktree");
	}
	const archiveReal = safeRealpath(archiveRoot);
	if (archiveReal !== void 0) {
		if (!layout.isInsideProject(archiveReal)) errors.push("archive: the archive root resolves outside the project root (" + archiveReal + "); the archive must live in the project checkout");
		if (layout.isInsideGitDirectory(archiveReal)) errors.push("archive: the archive root is inside the project Git directory (" + display(projectRoot, archiveReal) + "); it must live in the project worktree");
		const archiveGitDirectory = gitDirectory(archiveRoot);
		if (layout.gitDirectory === void 0 || archiveGitDirectory === void 0 || archiveGitDirectory !== layout.gitDirectory) errors.push("archive: the archive root (" + display(projectRoot, archiveRoot) + ") is not in the project Git checkout (" + (archiveGitDirectory ?? "not a Git worktree") + "); run from the project checkout");
	}
	const explicitMembers = explicitArchiveMembers(layout, archiveRoot, archiveReal, options.members);
	errors.push(...explicitMembers.errors);
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
			if (!isClassKind(entry.name)) {
				errors.push("archive: archived/" + entry.name + "/ — unknown class folder (allowed: " + CLASSES.join(", ") + ")");
				continue;
			}
			kinds.add(entry.name);
			collectClassMembers(archiveRoot, entry.name, "", errors, artifacts);
		}
		for (const kind of CLASSES) if (!kinds.has(kind)) errors.push("archive: archived/" + kind + "/ — required class directory is missing");
	}
	const manifestReal = safeRealpath(manifestPath);
	if (manifestReal !== void 0 && !layout.isInsideProject(manifestReal)) errors.push(`archive: the manifest resolves outside the project root (${manifestReal}); the archive baseline must stay in the project`);
	let manifest = emptyManifest();
	if (existsSync(manifestPath)) try {
		manifest = parseManifest(readFileSync(manifestPath, "utf8"));
	} catch (error) {
		errors.push(`manifest: ${error instanceof Error ? error.message : String(error)}`);
		manifest = emptyManifest();
	}
	else if (!options.write && !options.prepare) errors.push("manifest: archived/manifest.json is required; run `archive --prepare` to inspect a seal candidate");
	const manifestLocationReal = manifestReal ?? (archiveReal !== void 0 ? join(archiveReal, "manifest.json") : void 0);
	let manifestRepoPath;
	if (manifestLocationReal !== void 0) {
		const rel = relative(layout.projectReal, manifestLocationReal).split(sep).join("/");
		if (isAbsolute(rel) || rel.split("/")[0] === "..") errors.push("archive: the manifest resolves outside the project root (" + (manifestLocationReal ?? manifestPath) + "); archive verification needs a manifest inside the project");
		else manifestRepoPath = rel;
	}
	if (!options.write && !options.prepare && Object.keys(manifest.files).length > 0 && manifestRepoPath !== void 0) try {
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
	let plan;
	if (manifestRepoPath !== void 0) {
		const baseRef = options.baseRef ?? "HEAD";
		let baseline = emptyManifest();
		let baseCommit;
		try {
			baseCommit = git(projectRoot, ["rev-parse", `${baseRef}^{commit}`]).trim();
			baseline = readBaseline(projectRoot, baseRef, manifestRepoPath);
			for (const [path, expected] of Object.entries(baseline.files)) {
				const actual = manifest.files[path];
				if (actual === void 0) errors.push("manifest: " + path + " — sealed manifest entry is missing");
				else if (actual !== expected) errors.push("manifest: " + path + " — sealed manifest hash changed");
			}
		} catch (error) {
			errors.push("manifest: cannot read baseline " + JSON.stringify(baseRef) + ": " + (error instanceof Error ? error.message : String(error)) + "; archive verification needs a Git repository and that commit");
		}
		const sealing = options.write || options.prepare;
		if (sealing) errors.push(...unitErrors(artifacts, options.companions, explicitMembers.byCompanion, baseline.files));
		const extension = extendManifest(manifest, artifacts);
		errors.push(...extension.errors);
		added = extension.added;
		if (!sealing) for (const path of added) errors.push("archive: " + path + " — archived artifact is not sealed in manifest.json; inspect it with \"archive --prepare\"");
		if (sealing && baseCommit !== void 0 && errors.length === 0) {
			const planPreflight = options.preflightCommand === void 0 ? [] : [options.preflightCommand, ...options.preflightArgs];
			plan = sealPlanFor(baseCommit, manifest, added, artifacts, options.companions, explicitMembers.canonical, planPreflight);
		}
		if (options.write && added.length > 0 && options.expectPlan === void 0) errors.push("archive: new artifacts require --expect-plan; run \"archive --prepare\" and inspect its plan first");
		else if (options.write && options.expectPlan !== void 0 && plan !== void 0) {
			const actual = planDigest(plan);
			if (options.expectPlan !== actual) errors.push("archive: seal plan changed; expected " + options.expectPlan + " but the current state produces " + actual + "; run \"archive --prepare\" again");
		}
		if (options.write && plan !== void 0 && plan.preflight.length > 0 && errors.length === 0) {
			errors.push(...runPreflight(projectRoot, plan.preflight[0], plan.preflight.slice(1)));
			if (errors.length === 0) {
				errors.push(...artifactStateErrors(archiveRoot, artifacts));
				if (currentManifestHash(manifestPath) !== plan.manifestHash) errors.push("archive: preflight changed the manifest; prepare the seal again");
			}
		}
		if (options.write && errors.length === 0) {
			const rendered = renderManifest(extension.files);
			if (!existsSync(manifestPath) || readFileSync(manifestPath, "utf8") !== rendered) writeFileSync(manifestPath, rendered);
		}
	}
	const sealed = options.write && errors.length === 0 ? added.length : 0;
	return {
		command: "archive",
		errors,
		summary: {
			artifacts: artifacts.size,
			sealed,
			...plan === void 0 ? {} : { plan: renderPlan(plan) }
		}
	};
}
// cli/args.ts
/**
* SPDX-License-Identifier: MIT
*
* Adapted from the DeepSeek Harness note-gate scripts at the pinned
* `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
* THIRD_PARTY_NOTICES names the upstream paths and the relation.
*/
var UsageError = class extends Error {};
function usageError(message) {
	throw new UsageError(message);
}
const USAGE = `usage: notes.mjs <command> [options]

Initialize, check the active Agent Note tree, or check and seal the frozen archive of a project that uses this skill.

commands:
  init      create the notes tree skeleton once: lifecycle and class folders, archived class folders, .gitkeep placeholders
  check     check the active tree: lifecycle and class folders, filenames, header, skeleton, alternatives, companions
  archive   check the frozen archive: class directories, manifest, sealed content, append-only baseline
  archive --prepare
            verify a candidate seal and print a hash-bound plan without writing the manifest
  archive --write
            run the same checks plus unit metadata and the current member set, then seal new artifacts
            (requires --expect-plan from a matching --prepare run when artifacts are added)

options:
  --root <dir>         notes root, resolved against the project root (default: .agents/dsh-spec-agent-notes)
  --companion <suffix> a companion suffix kept beside each note (repeatable; e.g. .zh.md, .i18n.yaml)
  --member <source>=<companion>
                       path-scoped unit membership; repeatable. Paths are relative to the notes root
                       for check and to the archive root for archive.
  --format-adopted <date>
                       the date this contract was adopted; notes dated before it may carry the pre-format
                       alternatives comment instead of the section (check only)
  --base-ref <ref>     trusted pre-change commit for the archive baseline (default: HEAD; archive only)
  --prepare            print the archive seal plan without writing (archive only; excludes --write)
  --write              append new artifact hashes to the manifest (archive only; excludes --prepare)
  --expect-plan <id>   bind --write to the plan printed by --prepare (archive --write only)
  --preflight-command <path>
                       executable to run without a shell before sealing (archive seal only)
  --preflight-arg <arg>
                       one argument for --preflight-command; repeatable and may begin with "-"
  --json               print a JSON summary instead of lines
  --help, -h           print this help and exit 0

The project root is the Git checkout root of the working directory; Git is required.
The archive root is always <notes root>/archived. Verification requires the manifest to be tracked by Git when it lists artifacts.
The archive baseline is read from Git; sealing and verification fail closed when it cannot be read.

exit: 0 every check passed · 1 rule violations · 2 usage error`;
function parseArgs(argv) {
	const options = {
		command: void 0,
		root: void 0,
		baseRef: void 0,
		formatAdopted: void 0,
		companions: [],
		members: [],
		prepare: false,
		write: false,
		expectPlan: void 0,
		preflightCommand: void 0,
		preflightArgs: [],
		json: false,
		help: false
	};
	if (argv.includes("--help") || argv.includes("-h")) {
		options.help = true;
		return options;
	}
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
		if (arg === "--prepare") {
			options.prepare = true;
			continue;
		}
		if (arg === "--preflight-arg") {
			const value = argv[index + 1];
			if (value === void 0) usageError("--preflight-arg needs a value");
			options.preflightArgs.push(value);
			index += 1;
			continue;
		}
		if (arg.startsWith("--preflight-arg=")) {
			const value = arg.slice(16);
			if (value === "") usageError("--preflight-arg needs a value");
			options.preflightArgs.push(value);
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
		const memberValue = take("--member");
		if (memberValue !== void 0) {
			const separator = memberValue.indexOf("=");
			if (separator <= 0 || separator === memberValue.length - 1) usageError("--member expects <source>=<companion>");
			const normalizeMemberPath = (value, label) => {
				const normalized = value.split("\\").join("/").replace(/^\.\//, "");
				if (normalized === "" || normalized.startsWith("/") || normalized.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) usageError(`--member ${label} must be a contained repository-relative path, got ${JSON.stringify(value)}`);
				return normalized;
			};
			const source = normalizeMemberPath(memberValue.slice(0, separator), "source");
			const companion = normalizeMemberPath(memberValue.slice(separator + 1), "companion");
			if (source === companion) usageError("--member source and companion must be different paths");
			options.members.push({
				source,
				companion
			});
			continue;
		}
		const expectPlanValue = take("--expect-plan");
		if (expectPlanValue !== void 0) {
			if (!/^[0-9a-f]{64}$/.test(expectPlanValue)) usageError(`--expect-plan must be a 64-character lowercase SHA-256 digest, got ${JSON.stringify(expectPlanValue)}`);
			options.expectPlan = expectPlanValue;
			continue;
		}
		const preflightCommandValue = take("--preflight-command");
		if (preflightCommandValue !== void 0) {
			if (options.preflightCommand !== void 0) usageError("--preflight-command may be given once");
			options.preflightCommand = preflightCommandValue;
			continue;
		}
		if (arg.startsWith("-")) usageError(`unknown option: ${arg}`);
		positionals.push(arg);
	}
	if (options.help) return options;
	if (positionals.length !== 1) usageError(`expected one command, got ${positionals.length}`);
	const command = positionals[0];
	if (command !== "init" && command !== "check" && command !== "archive") usageError(`unknown command: ${command}`);
	options.command = command;
	if (options.command === "check" && (options.prepare || options.write || options.expectPlan !== void 0 || options.preflightCommand !== void 0 || options.preflightArgs.length > 0 || options.baseRef !== void 0)) usageError("check takes --root, --companion, --format-adopted and --json; seal options belong to archive");
	if (options.command === "archive" && options.formatAdopted !== void 0) usageError("--format-adopted belongs to check");
	if (options.command === "archive" && options.prepare && options.write) usageError("archive takes --prepare or --write, not both");
	if (options.expectPlan !== void 0 && !options.write) usageError("--expect-plan belongs to archive --write");
	if ((options.preflightCommand !== void 0 || options.preflightArgs.length > 0) && options.prepare === false && options.write === false) usageError("--preflight-command and --preflight-arg belong to archive --prepare or archive --write");
	if (options.preflightArgs.length > 0 && options.preflightCommand === void 0) usageError("--preflight-arg requires --preflight-command");
	if (options.command === "init" && (options.prepare || options.write || options.expectPlan !== void 0 || options.preflightCommand !== void 0 || options.preflightArgs.length > 0 || options.baseRef !== void 0 || options.formatAdopted !== void 0 || options.companions.length > 0 || options.members.length > 0)) usageError("init takes --root and --json only");
	return options;
}
// init.ts
/**
* SPDX-License-Identifier: MIT
*
* Adapted from the DeepSeek Harness note-gate scripts at the pinned
* `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
* THIRD_PARTY_NOTICES names the upstream paths and the relation.
*/
function initCommand(layout, requestedRoot) {
	const projectRoot = layout.projectRoot;
	const errors = [];
	const actions = [];
	const resolveDeepest = (target, label) => {
		const resolution = resolveProjectPath(layout, target);
		if (resolution.ok) return resolution.path;
		if (resolution.problem === "unreadable") errors.push(label + ": cannot resolve the path (" + target + "); it has an unreadable component");
		else if (resolution.problem === "not-a-directory") errors.push(label + ": a parent path is not a directory (" + display(projectRoot, resolution.path) + ")");
		else if (resolution.problem === "outside-project") errors.push(label + ": resolves outside the project root (" + resolution.path + "); it must live in the project checkout");
		else errors.push(label + ": resolves inside the project's Git directory (" + resolution.path + "); it must live in the project worktree");
	};
	try {
		if (!existsSync(requestedRoot) && lstatSync(requestedRoot).isSymbolicLink()) errors.push("init: the notes root is a dangling symlink (" + requestedRoot + ")");
		else if (existsSync(requestedRoot) && !isDirectory(requestedRoot)) errors.push("init: the notes root exists and is not a directory (" + requestedRoot + ")");
	} catch {}
	if (errors.length > 0) return {
		command: "init",
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
		if (layout.gitDirectory !== void 0 && archiveGit !== void 0 && archiveGit !== layout.gitDirectory) errors.push("init: the notes/archive root is inside a different Git checkout (" + display(projectRoot, existingArchive) + "); the archive baseline must belong to the project checkout");
		if (errors.length > 0) return {
			command: "init",
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
		command: "init",
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
			errors.push("init: cannot create " + display(projectRoot, canonical) + " (" + errorCode(error, "write error") + ")");
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
			errors.push("init: cannot create " + display(projectRoot, placeholder) + " (" + errorCode(error, "write error") + ")");
		}
	}
	return {
		command: "init",
		errors,
		actions,
		root: root ?? requestedRoot
	};
}
// structure.ts
/**
* SPDX-License-Identifier: MIT
*
* Adapted from the DeepSeek Harness note-gate scripts at the pinned
* `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
* THIRD_PARTY_NOTICES names the upstream paths and the relation.
*/
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
function relativePath(root, path) {
	return relative(root, path).split(sep).join("/");
}
function regularMemberPath(layout, root, rootReal, path) {
	let current = root;
	const segments = path.split("/");
	for (const [index, segment] of segments.entries()) {
		current = join(current, segment);
		let stat;
		try {
			stat = lstatSync(current);
		} catch {
			return "does not exist";
		}
		if (stat.isSymbolicLink()) return "is a symbolic link";
		const final = index === segments.length - 1;
		if (!final && !stat.isDirectory()) return "has a non-directory ancestor";
		if (final && !stat.isFile()) return "is not a regular file";
	}
	const real = safeRealpath(current);
	if (real === void 0) return "is unreadable";
	if (real !== rootReal && !real.startsWith(rootReal + sep)) return "resolves outside the notes root";
	if (!layout.isInsideProject(real)) return "resolves outside the project checkout";
	if (layout.isInsideGitDirectory(real)) return "resolves inside the project's Git directory";
}
function explicitMemberState(layout, root, rootReal, members) {
	const errors = [];
	const sources = /* @__PURE__ */ new Set();
	const companions = /* @__PURE__ */ new Set();
	const companionSource = /* @__PURE__ */ new Map();
	let existingCompanions = 0;
	for (const member of members) {
		const sourceParts = member.source.split("/");
		if (sourceParts.length !== 3 || !isLifecycle(sourceParts[0]) || !isClassKind(sourceParts[1]) || !FILENAME.test(sourceParts[2])) {
			errors.push(`members: ${member.source} — source must be a direct {lifecycle}/{class}/yyyy-mm-dd-topic.md note`);
			continue;
		}
		const companionParts = member.companion.split("/");
		if (companionParts.length < 3 || companionParts[0] !== sourceParts[0] || companionParts[1] !== sourceParts[1]) {
			errors.push(`members: ${member.source}=${member.companion} — companion must stay under the source lifecycle and class`);
			continue;
		}
		const previous = companionSource.get(member.companion);
		if (previous !== void 0 && previous !== member.source) {
			errors.push(`members: ${member.companion} — companion is assigned to both ${previous} and ${member.source}`);
			continue;
		}
		companionSource.set(member.companion, member.source);
		const firstCompanion = !companions.has(member.companion);
		sources.add(member.source);
		companions.add(member.companion);
		const sourceProblem = regularMemberPath(layout, root, rootReal, member.source);
		if (sourceProblem !== void 0) errors.push(`members: ${member.source} — source ${sourceProblem}`);
		const companionProblem = regularMemberPath(layout, root, rootReal, member.companion);
		if (companionProblem !== void 0) errors.push(`members: ${member.companion} — companion ${companionProblem}`);
		else if (firstCompanion) existingCompanions += 1;
	}
	for (const source of sources) if (companions.has(source)) errors.push(`members: ${source} — a source note cannot also be a declared companion`);
	return {
		errors,
		sources,
		companions,
		existingCompanions
	};
}
function walkActiveTree(layout, root, companions, members, formatAdopted) {
	const projectRoot = layout.projectRoot;
	const errors = [];
	let notes = 0;
	let companionFiles = 0;
	const rootReal = safeRealpath(root);
	if (rootReal !== void 0) {
		if (!layout.isInsideProject(rootReal)) {
			errors.push("check: the notes root resolves outside the project root (" + rootReal + "); the notes tree must live in the project checkout");
			return {
				command: "check",
				errors,
				notes,
				companionFiles
			};
		}
		if (layout.isInsideGitDirectory(rootReal)) {
			errors.push("check: the notes root is inside the project Git directory (" + display(projectRoot, rootReal) + "); it must live in the project worktree");
			return {
				command: "check",
				errors,
				notes,
				companionFiles
			};
		}
	}
	const entryViolation = (target) => {
		const real = safeRealpath(target);
		if (real === void 0) return void 0;
		if (!layout.isInsideProject(real)) return "resolves outside the project checkout";
		if (layout.isInsideGitDirectory(real)) return "resolves inside the project's Git directory";
	};
	if (!isDirectory(root)) {
		errors.push(`structure: notes root not found: ${display(projectRoot, root)}; run init or pass --root`);
		return {
			command: "check",
			errors,
			notes,
			companionFiles
		};
	}
	const explicitMembers = rootReal === void 0 ? {
		errors: [`structure: notes root is unreadable: ${display(projectRoot, root)}`],
		sources: /* @__PURE__ */ new Set(),
		companions: /* @__PURE__ */ new Set(),
		existingCompanions: 0
	} : explicitMemberState(layout, root, rootReal, members);
	errors.push(...explicitMembers.errors);
	companionFiles += explicitMembers.existingCompanions;
	for (const entry of safeReaddir(root, errors, `structure: ${display(projectRoot, root)}`)) {
		if (entry.name === "INDEX.md") {
			errors.push("structure: INDEX.md — centralized note indexes are forbidden; browse the lifecycle and class folders instead");
			continue;
		}
		if (entryKind(join(root, entry.name)) !== "dir" || entry.name === "archived") continue;
		const lifecycleName = entry.name;
		if (!isLifecycle(lifecycleName)) {
			errors.push(`structure: ${lifecycleName}/ — unknown lifecycle folder (allowed: ${LIFECYCLES.join(", ")}, plus ${ARCHIVE}/)`);
			continue;
		}
		const lifecycleRoot = join(root, lifecycleName);
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
			if (!isClassKind(classEntry.name)) {
				for (const file of markdownFiles(classRoot, (broken) => errors.push(`structure: ${display(projectRoot, broken)} — unreadable Markdown entry (dangling symlink or special file)`))) errors.push(`structure: ${display(projectRoot, file)} — unknown class folder "${classEntry.name}" (allowed: ${CLASSES.join(", ")})`);
				continue;
			}
			for (const noteEntry of safeReaddir(classRoot, errors, `structure: ${display(projectRoot, classRoot)}`)) {
				const noteRelative = lifecycleName + "/" + classEntry.name + "/" + noteEntry.name;
				const noteKind = entryKind(join(classRoot, noteEntry.name));
				if (noteKind === "file" && explicitMembers.companions.has(noteRelative)) continue;
				if (noteKind !== "file") {
					if (noteKind === "dir") for (const file of markdownFiles(join(classRoot, noteEntry.name), (broken) => errors.push(`structure: ${display(projectRoot, broken)} — unreadable Markdown entry (dangling symlink or special file)`))) {
						if (explicitMembers.companions.has(relativePath(root, file))) continue;
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
				errors.push(...formatErrors(projectRoot, join(classRoot, name), lifecycleName, noteDate, formatAdopted));
			}
		}
	}
	return {
		command: "check",
		errors,
		notes,
		companionFiles
	};
}
// notes.ts
/**
* SPDX-License-Identifier: MIT
*
* Adapted from the DeepSeek Harness note-gate scripts at the pinned
* `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
* THIRD_PARTY_NOTICES names the upstream paths and the relation.
*/
function runCommand(options, layout, paths) {
	if (options.command === "init") return initCommand(layout, paths.root);
	if (options.command === "check") return walkActiveTree(layout, paths.root, options.companions, options.members, options.formatAdopted);
	return archiveCommand(layout, paths, options);
}
function main() {
	let options;
	try {
		options = parseArgs(process.argv);
	} catch (error) {
		if (error instanceof UsageError) {
			console.error(`notes.mjs: ${error.message}`);
			console.error("run \"notes.mjs --help\" for usage");
			process.exitCode = 2;
			return;
		}
		throw error;
	}
	if (options.help) {
		console.log(USAGE);
		return;
	}
	const label = options.command === "archive" && options.write ? "archive --write" : options.command === "archive" && options.prepare ? "archive --prepare" : options.command;
	const projectRoot = detectProjectRoot();
	if (projectRoot === void 0) {
		const violations = [isBareRepository() ? "project: this is a bare Git repository with no worktree; run from a checkout and commit before using this skill" : "project: not a Git repository; install Git and initialize/commit the project before using this skill"];
		if (options.json) console.log(JSON.stringify({
			command: label,
			root: null,
			ok: false,
			violations
		}, null, 2));
		else {
			console.log("FAIL " + label + " — 1 violation(s)");
			for (const violation of violations) console.log("  - " + violation);
		}
		process.exitCode = 1;
		return;
	}
	const layout = resolveProjectLayout(projectRoot);
	const paths = resolveNotesPaths(projectRoot, options.root);
	const result = runCommand(options, layout, paths);
	const ok = result.errors.length === 0;
	const summary = {
		command: label,
		root: display(projectRoot, result.command === "init" ? result.root : paths.root),
		ok,
		violations: result.errors,
		...result.command === "init" ? { created: result.actions.length } : result.command === "check" ? {
			notes: result.notes,
			companions: result.companionFiles
		} : {
			artifacts: result.summary.artifacts,
			sealed: result.summary.sealed,
			...result.summary.plan === void 0 ? {} : { plan: result.summary.plan }
		}
	};
	if (options.json) console.log(JSON.stringify(summary, null, 2));
	else if (ok) {
		if (result.command === "init") console.log(result.actions.length === 0 ? "ok   init — already initialized at " + summary.root : "ok   init — " + result.actions.length + " item(s) created at " + summary.root);
		else if (result.command === "check") console.log("ok   check — " + result.notes + " note(s) and " + result.companionFiles + " companion(s) checked");
		else if (options.prepare && result.summary.plan !== void 0) {
			const plan = result.summary.plan;
			console.log("ok   archive --prepare — plan " + plan.id + "; " + plan.artifacts.length + " new artifact(s); preflight: " + (plan.preflight.length === 0 ? "none" : plan.preflight.join(" ")));
			for (const artifact of plan.artifacts) console.log("     " + artifact.path + " " + artifact.hash);
			for (const member of plan.members) console.log("     member " + member.source + " -> " + member.companion);
		} else if (options.write) console.log("ok   archive --write — sealed " + result.summary.sealed + " new artifact(s); " + result.summary.artifacts + " frozen artifact(s) checked");
		else console.log("ok   archive — " + result.summary.artifacts + " frozen artifact(s) checked");
	} else {
		console.log("FAIL " + label + " — " + result.errors.length + " violation(s)");
		for (const error of result.errors) console.log("  - " + error);
	}
	process.exitCode = ok ? 0 : 1;
}
main();
export {};
