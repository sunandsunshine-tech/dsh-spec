# Agent Skill eval sources

The scenarios under this directory are development assets. Agent Skills expects a skill being
evaluated to contain `evals/evals.json`, but `skills/` is this repository's distribution artifact and
`.agents/skills/` is its installed mirror. Keeping the corpus there would ship test inputs to every
adopter.

Use `node tests/skill-evals/run-model-eval.mjs --skill <skill> --scenario <id> --output <dir>` for
a recorded model run. The runner installs the complete target skill and every sibling a scenario
lists under `install`, copies only the declared fixture files, and mounts an otherwise empty
response directory into an isolated Linux namespace. The source repository, answer manifest,
expected output and other evidence are absent from that namespace. The outer mount policy enforces
read-only or editable-project behavior; Codex runs without a second sandbox because the mount is
already the boundary.

The runner isolates the project and answer tree, not the network or provider credentials. Model
calls need provider connectivity, and the temporary Codex home contains the provider configuration
inside the same namespace. Run only repository-controlled scenarios and trusted fixtures. Traces
that name the provider home or response mount fail closed. The compatibility claim is therefore
source/answer-tree isolation with reviewer-certified assertions, not a credential or network
sandbox.

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

The runner writes a normalized trace and the final response, exact input and behavior-bearing
installed-skill hashes, the canonical scenario hash, changed paths, patch and changed-file
snapshots. It clears inherited host environment variables before the model process and inspects
the fixture through a trusted Git copy made before the model starts; model-controlled hooks,
configuration redirects and replacement indexes cannot change that inspection. A scenario may
list ignored build or evidence paths under `outputs`; the runner retains those files too, so a
successful run cannot satisfy the report while losing its actual artifact. It leaves `status.txt`
pending until a reviewer grades the retained output. Assertion files are reviewer-certified
evidence, bound to a retained final response and artifact set; they are not independent automatic
grading. `final.md` must equal the last agent message in the trace. The trace is reviewer context,
not an adversarial execution attestation: the model process can write to its own runtime output.
Artifacts, filesystem state and retained hashes are the authoritative checks. Host home, temporary,
Windows-user and build toolchain roots are normalized to neutral placeholders in text evidence.
Normalization changes recorded path spellings, not execution, grader decisions or artifact hashes.

The runner records the scenario, declared inputs, installed behavior-bearing skill files, final
message and artifacts. It does not identify the model provider or capture every moving toolchain
version, so retained evidence is not a byte-for-byte reproduction contract. The runner derives
browser and media availability from the host. A scenario may explicitly require a capability, which
fails before the model starts when unavailable, or explicitly disable it, which masks known system
browser and media executables. The compatibility claim does not cover network or credential
isolation.

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

An output path must be `evidence/<date>/<skill>/<run>`. Individual files in the input manifest carry
their executable mode bits, so changing whether a fixture command can run invalidates the retained
evidence. When replacing an existing run, the runner stages the replacement beside it and promotes
it only after the complete run succeeds; a failed run leaves the previous leaf intact.

An absent-capability scenario declares `"capabilities": {"browser": false, "media": false}`. The
runner then omits both the browser mount and the ffmpeg directory and PATH entry, masks known
system locations, and fails before the model starts if an explicitly required capability is
unavailable.

`tests/skill-scenarios.test.ts` performs the same staging for its corpus checks. A repository-shape
test rejects an `evals/` directory under `skills/`, so the development corpus cannot silently return
to the distribution tree.

## Coverage

Add an eval for central natural-language behavior that realistic prompts can falsify when a
deterministic command or test cannot decide it. Capability-dependent behavior covers both the
capability-present and capability-absent profiles. Mechanical contracts remain unit or integration
checks and do not need a parallel model eval.

Model evals run when the owning behavior, defaults, stop conditions, capability branches, fixed
output, or triggering description change. They do not run routinely in CI. A change without a model
run must say which deterministic evidence decides the behavior or why an eval is not warranted.

Each behavior run records the behavior-bearing installed skill files as provenance, the declared
fixture set, and the scenario definition that was current when it ran. A later scenario change
invalidates that run as current evidence. A later edit to a behavior-bearing skill file does not
make every earlier scenario current again. Notice-only provenance changes remain explicit historical
drift rather than forcing an unrelated behavioral rerun.

Trigger evidence binds `skills/<name>/SKILL.md#name-description`. The body may change without
invalidating trigger selection; a name or description change requires the trigger corpus to be
rerun.
