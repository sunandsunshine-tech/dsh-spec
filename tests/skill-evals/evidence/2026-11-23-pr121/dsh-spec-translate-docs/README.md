# Translate Docs completion-path evidence

> **Historical status:** these runs bind the pre-#142 translation skill and are not current evidence
> for its activation or briefing semantics. Current trigger and briefing evidence is recorded under
> `tests/skill-evals/evidence/2026-11-25-pr142/dsh-spec-translate-docs/`.

PR121 skill file SHA-256: `5ec35a6f798b9916460c6dc6ad424765bee4fbde1dedc5966108b1653eadf8bd`.
Run date: 2026-11-23.
Model: host-configured Codex model; Codex CLI 0.171.0-alpha.13.

Result: 16/16 recorded scenario assertions passed at run time.

## Method

Each retained run used `node tests/skill-evals/run-model-eval.mjs` with `--sandbox workspace-write
--replace`. The runner built a fresh temporary Git project containing only the scenario's declared
files and the complete `dsh-spec-translate-docs` skill at `.agents/skills/`. It mounted the project
and an empty response directory into an isolated Linux namespace, then ran `codex exec
--ephemeral` with no parent conversation and `--json` output. It bound the mise installs tree
read-only, placed Node, npm, pnpm and ffmpeg on `PATH`, and explicitly directed the model to read
the installed target skill. The source repository, answer manifest, expected output and other
evidence were absent from that namespace. The appended prompt prohibited subagents, so the
no-isolation scenarios measured the declared fallback and handoff.

The `local-update`, `target-removal` and whole-document prompts identify their fixture roots while
keeping the installed skill under the runner's `/workspace/.agents/skills/`. The whole-document
prompt forbids creating, editing or drafting a translation when the required production and review
separation is unavailable. The four runs cover the changed completion paths rather than every
scenario in the corpus:

| Run | Behavior | Result | Time |
|---|---|---:|---:|
| `local-update` | A local prose update reaches `write --target` and `check`. | 4/4 | 67.65 s |
| `whole-document-handoff` | Unavailable working separation stops before same-context translation or drafting. | 4/4 | 10.33 s |
| `explicit-multiple-targets-handoff` | Two explicit targets resolve, then the missing working separation produces a handoff with no new pair. | 4/4 | 47.68 s |
| `target-removal` | Active Japanese targets are removed with the bundled pair tooling while the archived fixture stays unchanged. | 4/4 | 37.26 s |

All retained `status.txt` files report `status: pass`, exit code 0 and 4/4 assertions. Their
`assertions.txt` files match the recorded assertion text and order. Each run retains the complete
skill tree it read, and all four manifests match the frozen PR121 skills tree. Every retained
scenario-definition and declared-input hash matches its recorded input. Each normalized trace has
one start and one completed turn, ends in `turn.completed`, contains a successful read of the
installed target skill, and does not access answer-bearing evidence. Each `final.md` equals the
final trace message.

The retained scenario definitions record these hashes:

- `local-update`: `0b9460183e0c16088b180096ecbf296eef324cb86d2513d909fe81f689c0914c`
- `whole-document-handoff`: `5fbd0cabca84d88c7a281de62ccaf239b6abd3a476c408406278937a9e19aa49`
- `explicit-multiple-targets-handoff`: `522132583a3530aeca191eff86629877a047884f8e0e024443ec0de3574b9d95`
- `target-removal`: `b280cb39e3dad777579a5096ed6f5f442fba49d7ca52aef80bda13ddaddfe779`

## Run results

`local-update` changed only the source sentence, its Chinese counterpart and the aggregate pairing
record. It used the terminology table under `evals/files/vendor/.agents`, not the mounted runner
root. The bundled `write docs/guide.md --target zh` succeeded, and the bundled
`check docs/guide.md` exited 0 with `translate-pair: 1 pair(s) consistent.` The final response
reports the validation command and result without claiming an unavailable isolation mechanism.

`whole-document-handoff` and `explicit-multiple-targets-handoff` created no files. Their
changed-path lists, patches and artifact manifests are empty. The whole-document response names
the source, Chinese target, completed inspection, missing separation, pending translation and a
resumable next step. The multiple-target response explicitly resolves `zh=中文` and `ja=日本語`,
reports the missing separation, and names the pending counterparts and aggregate record.

`target-removal` deleted both active Japanese counterparts and removed their switcher links. The
bundled `write --all --select 'docs/active/**'` refreshed `first.i18n.yaml` and removed
`second.i18n.yaml`, whose last target had been retired. The bundled
`check --select 'docs/active/**'` then exited 0 with `translate-pair: 1 pair(s) consistent.` No
zero-target record remains, and all files under `docs/archived/` retain their initial hashes.

The remaining deterministic corpus scenarios are checked by `tests/skill-scenarios.test.ts` and
`tests/translation-docs.test.ts`; this directory preserves targeted model evidence for the
completion paths recorded in these runs.
