# 3. Recomposition


#### 3.1 Recomposition

##### Skill structure

The skill structure has these layers. Omit an optional layer with no content and keep no empty heading.

| Layer | Content |
|---|---|
| Trigger condition | Metadata: when to load and what the skill acts on |
| Skill definition and boundary | What to complete, what not to do and what to deliver |
| Global definitions (optional) | The one meaning of terms, concepts and definitions, for unambiguity and one referent per definition |
| Global rules (optional) | Rules before, during and after every step. They do not describe concrete steps or replace a step's completion judgment |
| SOP steps | Steps with needed Docs and Script, a completion judgment, a check method and failure recovery. Resource placement follows global rules |
| Outcome assertions (optional) | Assertions on the final result after all steps. They do not run midway, restate global rules or step assertions, or judge outcomes no process can judge |

SOP steps may nest. Every level follows the same structure: its own task, needed Docs and Script, a completion judgment, a check method and failure recovery. Sub-steps use the next numbering level, and the parent's completion judgment covers its sub-steps. The form inside a layer is unrestricted. Format follows "Format and description" or the adopter's rules.

##### Generate the body, fully inline first

From the disposed three-element analysis, derive the trigger condition, skill definition and boundary, and all SOP steps and content. Each step gets a completion judgment, a check method and failure recovery. Put needed Docs and Script inside or next to the step. Do not extract global layers yet.

##### Extract global layers

Under unambiguity and SSOT, extract from the fully inlined SOP:

| Extracted content | Destination |
|---|---|
| Term and concept definitions | Global definitions, optional |
| Rules around each step | Global rules, optional |
| Outcomes judged only after all steps | Outcome assertions, optional |

After extraction, the original location keeps only a reference or use and does not repeat the definition. Docs and Script a step needs stay with the step.

##### Tidy

Tidy by skill structure. An optional layer exists only with content. Each step has needed Docs and Script in place, plus a completion judgment, a check method and failure recovery. Global definitions do not repeat the SOP, the SOP does not repeat global definitions, and Script does not explain the method again. Tidy under SSOT and unambiguity. Write description with task and additional trigger keywords, then term names and format.

**Complete**: the body is generated and fully inlined, global layers are extracted, and the skill structure is tidied.

**Check**: global layers come from the fully inlined SOP, each step's dependencies are in place, the skill structure is complete, and SSOT and unambiguity hold.

**Failure**: fill the body, global layers, dependencies or tidy. When unresolved, use a ruling and record it.

#### 3.2 Complete Script

Add Script only when deterministic work needs code. Without Script, skip this sub-step and record that.

With Script, write, adapt or port it for the adoption environment. Determine the runtime from the target audience's environment, write it into the script header and `compatibility`, and probe the adoption environment's development and test tooling. Missing runtime or tool is a hard red line: stop with the blocker, rulings tried and reversible options, wait for the driver, and complete Script after the environment is supplied.

When the development runtime differs from the script's runtime, record how to test it on the script's runtime. When it cannot be tested, mark it unverified.

Script declares dependencies, input, output and exit codes. It is non-interactive, documents its interface with `--help`, writes structured data to stdout and diagnostics to stderr. Test it on its runtime and record the output. Keep it idempotent where retries are possible and provide `--dry-run` for destructive work. Use a ruling for file, network or Git writes and record it. Put it under `script/`, introduce no install step, and record stack, dependencies and behavior when the runtime is missing.

**Complete**: without Script, skip explicitly. With Script, interface, test or unverified state, call sites and hard-red-line record are complete.

**Check**: runtime, dependencies, input and output, exit codes, test or unverified state and call sites hold, and Script does not replace the method judgment.

**Failure**: fill the environment, interface or test. When the environment is missing, stop at the hard red line and do not claim completion.

The parent step (recomposition) has its own completion judgment:

**Complete**: 3.1 and 3.2 are both complete.

**Check**: both sub-steps' completion and checks hold, and the two outputs form one forged skill.

**Failure**: follow the failed sub-step's failure. When unresolved, use a ruling and record it.
