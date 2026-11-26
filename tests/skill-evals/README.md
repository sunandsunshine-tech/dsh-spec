# Agent Skill eval sources

The scenarios under this directory are development assets. Agent Skills expects a skill being
evaluated to contain `evals/evals.json`, but `skills/` is this repository's distribution artifact and
`.agents/skills/` is its installed mirror. Keeping the corpus there would ship test inputs to every
adopter.

Use `node tests/skill-evals/run-model-eval.mjs --skill <skill> --scenario <id> --output <dir>` for
a recorded model run. `--deadline-ms <milliseconds>` bounds model execution, workspace/response
collection and every host-side checkpoint before promotion; the default is 30 minutes. `--arm
target-present` installs the complete target skill and every sibling a scenario lists under
`install`. `--arm target-absent` installs only declared siblings and is accepted only when the
evidence policy declares a comparative claim. A target-absent arm also requires `--counterpart
<evidence-run>`; the runner validates and compares that candidate before promotion. A target-present
candidate may be promoted first as a provisional candidate, but it is not a complete comparison
until a compatible target-absent baseline is validated against it. The runner copies only the
declared fixture files and mounts an otherwise empty response directory into an isolated Linux
namespace. The writable project, Codex home, response, home and temporary directories are separate
`tmpfs` mounts with explicit `--size` limits. A private wrapper copies the read-only workspace and
Codex-home seeds into those mounts before starting Codex. The source repository, answer manifest,
expected output and other evidence are absent from that namespace. The outer mount policy enforces
read-only or editable project behavior; Codex runs without a second sandbox because the mount is
already the boundary. The host needs `bubblewrap` (`bwrap`) with `--size` support; `flock` supplies
crash-released output locking.

A comparative scenario declares `comparison` with exactly `baseline: "target-absent"`,
`candidate: "target-present"` and a non-empty `conditions` string array.

The runner isolates the project and answer tree, not the network. Model calls need provider
connectivity, so a host-side loopback proxy holds any inline provider bearer token and injects it
outside the model namespace. The temporary Codex home contains only a local proxy endpoint and a
random per-run authorization value. The proxy accepts only POST JSON requests for the provider's
Responses or Chat Completions endpoint, preserves the upstream base path and query, and rejects
every other path, method, media type, and authorization value. A configured model catalog is
validated against the supported schema, rewritten from the parsed representation, read without
following links, and copied to a fixed non-reserved filename; unknown fields fail closed. Provider
URLs containing userinfo or credential-like query parameters are refused. Every URL candidate in
catalog text is checked for a valid HTTP(S) form, userinfo, and credential-like query parameters;
malformed and unsupported forms fail closed. Run only repository-controlled scenarios and trusted
fixtures; network egress remains available. Traces that name the provider home or response mount
fail closed.
The compatibility claim is therefore source/answer-tree isolation with non-exposed provider
credentials and reviewer-certified assertions, not a general network sandbox.

The namespace intentionally exposes the host mise toolchain read-only under the neutral
`/home/eval/.local/share/mise/installs` path so Node.js, pnpm and ffmpeg can run. A broad parent
search can therefore list tooling files; those files are not evaluation inputs. Traces must not
access answer or evidence files. The runner fails a command that names `evals/evals.json`,
`tests/skill-evals` or `expected_output`, and reviewers reject any other access to answer-bearing
material.

The runner also appends an instruction naming the installed target
`.agents/skills/<skill>/SKILL.md` and requiring the model to work only inside the project. A
scenario may set `allow_subagents: true` to permit isolated subagents; otherwise the wrapper
forbids them.

The runner writes `evidence.json`, a normalized trace and the final response, exact input and
behavior-bearing installed-skill hashes and modes, the canonical scenario hash, NUL-safe changed
paths, patch and changed-file snapshots. `evidence.json` names the claim type, arm, currentness
selectors, deadline and canary sets. Behavior currentness follows the scenario, scenario and rendered
prompts, inputs and model-bearing execution configuration. Trigger currentness follows the
name/description surface and trigger corpus. Comparative currentness additionally follows the
declared comparison conditions. The complete target and sibling skill trees are retained as
revision provenance, not a behavior selector: an edit invalidates only scenario subjects whose
behavior changes, following the 2026-11-23 model-evidence record. A target-absent baseline records
no target-skill provenance but still binds its sibling provenance, and remains an arm of its
comparison rather than a separate behavior claim. Candidate and baseline must agree on the scenario
prompt, inputs, execution and model configuration, deadline, comparison conditions, sibling
provenance and privacy scope; their rendered prompts differ only through the target installation and
target-use treatment. `comparison.pair_status` is `candidate-only` for a provisional candidate and
`paired` for an arm validated with a counterpart. A candidate remains `candidate-only` until its
baseline exists; a paired baseline's `evidence.json` hash must equal the actual candidate file.
If a target-present record also carries a counterpart hash, that optional reverse edge must equal
the actual baseline file, without requiring a cyclic pair. Before accepting a counterpart, the
runner reconstructs currentness and
provenance from the retained scenario, input, capability, execution and skill files, reconstructs
each arm's prompt from its exact target instruction and guard, and rechecks a full retained-tree
snapshot before promotion. Typed evidence without the separately retained execution profile cannot
be revalidated as current and remains historical. The promoted counterpart hash comes from the same
validated snapshot as the parsed metadata.

The model-bearing execution identity hashes the normalized model/provider/reasoning configuration,
the model-catalog content when present, and the resolved Codex runtime. Inline credentials and the
per-run proxy token are excluded; the raw provider URL and token are not retained.

The private wrapper reports model exit through a one-connection control socket, kills remaining
sandbox processes, and keeps the namespace alive while the host copies the bounded workspace and
response trees through `/proc/<pid>/root`. No host result directory is mounted into the model
namespace. The installed skill tree and trusted Git directory are read-only overlays, Codex browser
and computer-use features are disabled, and subagents are disabled unless the scenario authorizes
them. The runner clears inherited host environment variables before the model process and inspects
the fixture through a trusted Git copy made before the model starts; model-controlled hooks,
configuration redirects and replacement indexes cannot change that inspection. A scenario may list
ignored build or evidence paths under `outputs`; the runner retains those files too, so a successful
run cannot satisfy the report while losing its actual artifact. It leaves `status.txt` pending until
a reviewer grades the retained output. Assertion files are reviewer-certified evidence, bound to a
retained final response and artifact set; they are not independent automatic grading. `final.md`
must equal the last agent message in the trace. The trace is reviewer context, not an adversarial
execution attestation: the model process can write to its own runtime output. Artifacts, filesystem
state and retained hashes are the authoritative checks. Skill-file hashing rejects links and other
non-regular entries instead of following them into the host. Host home, temporary, Windows-user and
build toolchain roots are normalized to neutral placeholders in text evidence. Normalization
changes recorded path spellings, not execution, grader decisions or artifact hashes.

Retained `trace.jsonl` and `evidence.json` are opened with no-follow and nonblocking semantics before
any read. Their descriptors must identify regular files within byte bounds; symlinks, FIFOs, devices,
directories and oversized files fail before parsing.

A successful model exit also requires exactly one `turn.completed` event as the final trace event.
The runner rejects a missing, duplicate, failed or non-final terminal event before promotion. A run
that exceeds `--deadline-ms` is terminated while the sandbox is active and fails at the next
host-side checkpoint otherwise. An expiry before promotion discards its staged leaf; once the
recoverable replacement begins, the replacement completes or remains available for next-run
recovery.

Model output limits are part of the runner contract: the final response is at most 2 MiB; each
retained artifact is at most 16 MiB, with at most 256 files and 64 MiB in total. The workspace and
`/tmp` mounts are each at most 512 MiB, the Codex home is at most 64 MiB, the response mount is at
most 8 MiB, and `/home` is at most 128 MiB. The runner rejects logical file sizes before reading or
copying, streams hashes in fixed-size chunks, and does not process final responses or artifacts
after a non-zero model exit. `tmpfs --size` limits allocated blocks; the logical-size checks also
reject sparse files that allocate no blocks.

The runner records the scenario, declared inputs, installed behavior-bearing skill files, final
message and artifacts. It does not identify the model provider or capture every moving toolchain
version, so retained evidence is not a byte-for-byte reproduction contract. The runner derives
browser and media availability from executables that the sandbox actually exposes. A scenario may
explicitly require a capability, which fails before the model starts when unavailable, or explicitly
disable it, which masks known system browser and media executables. `capabilities.json` records the
resolved auth, browser, media, sandbox and subagent profile. `execution.json` records that profile
together with the normalized model configuration and runtime hashes bound by `evidence.json`. The
compatibility claim does not cover general network isolation, and a masked browser set is not proof
that no unknown executable exists elsewhere on the image.

The official Agent Skills layout can also be checked without a model run by placing the target skill
at `<temporary>/<skill>` and its development corpus at `<temporary>/<skill>/evals/`. A scenario's
`install` list, not the spelling of a fixture path, declares sibling capabilities. The skill
directory's name must match its `SKILL.md` name.

Archive scenarios that exercise sealing also need a Git checkout and the six committed archive
class directories. The scenario files provide the baseline; the runner initializes and commits it
before invoking the model.

A review or outgoing-diff scenario may declare `change_patch` and `change_root`. The runner applies
that patch in reverse to commit the base state, then reapplies it to commit the candidate, so the
model reviews a real `HEAD^..HEAD` diff. The patch file remains a declared input.

An output path must be `evidence/<date>/<skill>/<run>` and its skill component must match
`--skill`. Every input-manifest entry carries its executable mode bits, so changing whether a
fixture command can run invalidates the retained evidence. When replacing an existing run, the
runner takes an output lock, stages the replacement beside it, removes the model-writable run root
before promotion, and keeps the previous leaf until promotion; a failed run leaves the previous
leaf intact. Promotion uses a recoverable backup rename; a process death between the backup and
replacement renames is repaired by the next runner invocation, so a concurrent reader can briefly
observe the leaf absent at that crash boundary. `changed-paths.json` is the machine path record; the
text file remains a readable summary.

An absent-capability scenario declares `"capabilities": {"browser": false, "media": false}`. The
runner then omits both the browser mount and the ffmpeg directory and PATH entry, masks known
system locations, and fails before the model starts if an explicitly required capability is
unavailable.

`tests/skill-scenarios.test.ts` performs the same staging for its corpus checks. A repository-shape
test rejects an `evals/` directory under `skills/`, so the development corpus cannot silently return
to the distribution tree.

Before promotion, the runner scans raw stdout and stderr, every staged file regardless of extension,
and the retained output path for every configured privacy canary. The scan reads binary files in
bounded chunks, catches matches across chunk boundaries, rejects links and special files, and reports
only the canary set plus a relative surface when that surface does not itself contain the match. The
checked-in evidence tree receives the same whole-tree scan in routine tests. A canary is a leak
tripwire; semantic review still decides whether transformed, compressed, rendered or encoded content
exposes private data. `evidence.json` hashes the ordered canary scope, including the current-home
canary, without retaining canary values. Validation reconstructs that hash from the supplied
canaries, requires the exact subject-selected set names and current-home value, and scans only the
validated scope. The current home comes from the running process; committed tooling keeps only the
generic WSL user and Conda home prefixes in the local-environment set. Path preflight diagnostics
state the required relative shape without echoing an absolute output or counterpart path.

## Coverage

Add an eval for central natural-language behavior that realistic prompts can falsify when a
deterministic command or test cannot decide it. Capability-dependent behavior covers both the
capability-present and capability-absent profiles. Mechanical contracts remain unit or integration
checks and do not need a parallel model eval.

Model evals run when the owning behavior, defaults, stop conditions, capability branches, fixed
output, or triggering description change. They do not run routinely in CI. A change without a model
run must say which deterministic evidence decides the behavior or why an eval is not warranted.

The integration deadline case can expire during staging or sandbox startup before Codex begins. It
proves whole-run expiry and refusal to promote, not that an already-executing model was terminated.
The lower-level interruptible-child control proves deadline termination after its child starts;
neither control records a statistical reliability rate.

Each behavior run records the behavior-bearing installed skill files as provenance, the declared
fixture set, and the scenario definition that was current when it ran. A later scenario change
invalidates that run as current evidence. A later edit to a behavior-bearing skill file does not
make every earlier scenario current again. Notice-only provenance changes remain explicit historical
drift rather than forcing an unrelated behavioral rerun.

Trigger evidence binds `skills/<name>/SKILL.md#name-description`. The body may change without
invalidating trigger selection; a name or description change requires the trigger corpus to be
rerun.

Runs created before `evidence.json` existed remain subject to the existing scenario, input and
recorded-skill checks. They are neither downgraded nor upgraded merely because typed metadata is
absent. Currentness is computed from the declared selectors; it is not stored as a mutable
`current: true` flag.
