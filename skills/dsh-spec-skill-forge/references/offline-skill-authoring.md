# Offline fallback: Agent Skills authoring obligations

Read this only when the online Agent Skills guides are unreachable. It is a distilled fallback, not a second authority: the online pages win whenever they can be read. Distilled on 2026-10-26 from the online Agent Skills guides.

The specification's `must` rules are mandatory; the other pages make recommendations. A rule keeps the force of its source.

## 1. Specification — format rules

- A skill is a directory with `SKILL.md` at minimum; `scripts/`, `references/`, `assets/` are optional and any other file or directory is allowed.
- `SKILL.md` is YAML frontmatter followed by Markdown. Required fields: `name` (1–64 characters, lowercase letters, digits and hyphens only, no leading or trailing hyphen, no consecutive hyphens, matches the directory) and `description` (1–1024 characters, non-empty, says what the skill does and when to use it).
- Optional fields: `license` (license name or bundled license file); `compatibility` (1–500 characters, only when the skill has specific environment requirements); `metadata` (map from string keys to string values); `allowed-tools` (space-separated string, experimental).
- The Markdown body has no format restrictions; recommended sections are step-by-step instructions, input/output examples and common edge cases. Move detailed content into referenced files.
- Reference other files with relative paths from the skill root, one level deep. Do not build deep reference chains.
- Progressive disclosure: metadata (~100 tokens) is always loaded; the `SKILL.md` body is loaded when the skill activates (`<5000 tokens` recommended, `<500 lines`); resources load on demand.
- The specification names `skills-ref validate` for checking frontmatter and naming.

## 2. Best practices — content obligations

- Start from real expertise: extract or synthesize from hands-on tasks, internal docs, API specifications, review comments, version history and real failure cases. Do not generate a skill from general model knowledge alone.
- Refine with real execution: run the skill on real tasks, read execution traces rather than only final outputs, and feed results back. Wasted steps usually mean vague instructions, instructions that do not apply, or too many options without a default.
- Spend context wisely: add what the agent does not know (project conventions, domain procedures, non-obvious edge cases, specific tools and APIs); omit what it already knows. For each passage ask: would the agent get this wrong without it? Cut when the answer is no.
- Design a coherent unit: not so narrow that several skills must load for one task, not so broad that activation becomes imprecise.
- Aim for moderate detail: concise, stepwise guidance with a working example beats exhaustive documentation. Leave most edge cases to the agent's judgment unless the task is fragile.
- Structure large skills with progressive disclosure: keep the core instructions in `SKILL.md`; move detail to `references/` and tell the agent exactly when to read each file ("read references/api-errors.md if the API returns a non-200 status code", not "see references/ for details").
- Calibrate control to fragility: give freedom and explain why where multiple approaches are valid; be prescriptive for fragile operations, consistency requirements and fixed sequences.
- Provide defaults, not menus: pick a default and mention alternatives briefly.
- Favor procedures over declarations: teach how to approach a class of problems; specific details such as output templates and constraints are still valuable.
- Patterns: gotchas sections for environment-specific corrections; output-format templates; checklists for multi-step workflows; validation loops (work, validate, fix, repeat); plan-validate-execute for batch or destructive operations; bundle reusable scripts when the agent keeps reinventing the same logic.

## 3. Descriptions — triggering obligations

- The description carries the entire triggering burden: it says what the skill does and when to use it.
- Write imperative, intent-focused, slightly pushy descriptions: "Use this skill when…", list contexts including cases where the user does not name the domain directly, and stay concise (hard limit 1024 characters).
- Trigger evaluation: about 20 realistic queries, 8–10 should-trigger and 8–10 should-not-trigger. Vary phrasing, explicitness, detail and complexity; include file paths, personal context and casual language. The most valuable negative cases are near-misses that share keywords but need something else.
- Run each query with the skill installed and observe whether the skill was invoked; run each query 3 times and compute a trigger rate (0.5 is a reasonable threshold, above for should-trigger, below for should-not-trigger).
- Split ~60% train and ~40% validation. Only train failures guide changes; select the best iteration by validation pass rate to avoid overfitting. After selecting, check 5–10 fresh queries as a final sanity test.
- Revise by generalizing, not by adding keywords from failed queries; if stuck, change the description's structure. Keep the character count under 1024 while iterating.

## 4. Scripts — interface and agentic design

- Prefer an existing one-off command for simple tool invocations (pin versions, state prerequisites); bundle a tested script in `scripts/` when a command grows complex or the same logic is reinvented.
- List available scripts in `SKILL.md` and run them with paths relative to the skill root.
- Make bundled scripts self-contained or document dependencies clearly; prefer inline dependency declarations so no separate install step is needed.
- Agentic requirements: no interactive prompts (a hard requirement — agents run non-interactive shells); document usage with `--help`; write actionable error messages (what went wrong, what was expected, what to try); send structured data to stdout and diagnostics to stderr; make repeated runs safe (idempotency); reject ambiguous input with a clear error and use closed sets where possible; support `--dry-run` for destructive or stateful operations; use distinct, documented exit codes; choose safe defaults; keep output size predictable (summaries, limits, or an explicit `--output`).
## 5. Evaluating output quality — test and iterate

- A test case is a realistic prompt, a human-readable expected output, and optional input files; store test cases in `evals/evals.json` under the skill directory. Start with 2–3 cases, vary phrasing and detail, and include at least one boundary or malformed-input case.
- Run each case twice: once with the skill and once without it (or against a snapshot of the previous version when improving an existing skill), in a clean context. Save outputs per iteration and per case.
- Record timing and token use per run so the benchmark can show what the skill costs against what it buys.
- Write assertions only after seeing the first outputs. Assertions must be objectively verifiable and specific ("the output file is valid JSON", "the chart shows exactly 3 months"), not vague ("the output is good") or brittle (exact wording that a correct alternative would fail). Assertions must be objectively verifiable; review subjective qualities with a human.
- Grade each assertion PASS or FAIL with concrete evidence quoting or referencing the output; use a verification script for mechanically checkable assertions.
- Aggregate into a benchmark: pass rate, time and tokens per configuration, their standard deviations when multiple runs exist, and the delta.
- Analyze patterns: drop assertions that always pass in both configurations, investigate ones that always fail, study the ones that pass with the skill but fail without, tighten ambiguous instructions when runs are inconsistent, and read transcripts for time or token outliers.
- Have a human review the outputs alongside the grades and record actionable feedback per case.
- Iterate: feed failed assertions, human feedback and execution traces to the model that proposes improvements; review and apply; rerun all cases in a new iteration; grade, aggregate and review again. Stop when satisfied, feedback is consistently empty, or results stop improving.
- When improving, generalize from feedback rather than patching individual examples; keep the skill lean; explain the why behind instructions; bundle repeated helper logic into `scripts/`.
