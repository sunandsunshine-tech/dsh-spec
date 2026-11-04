---
name: dsh-spec-agent-experience
description: "Use when writing or changing a prompt — a system prompt, a tool definition (name, description, parameter schema, or its system-prompt section), a skill's instructions, context-loading instructions, or the steps of a multi-step workflow — to make the prompt's information discoverable and use context efficiently. 用于编写或修改提示词——system prompt、工具定义（名称、描述、参数 schema 或 system-prompt 段落）、技能指令、上下文加载指令或多步工作流的步骤——使提示词的信息可发现并高效使用上下文。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# Writing prompts

**Shape context, not control.** A prompt supplies the purpose, facts, constraints, examples and evidence that make a good decision likely, and leaves the route to the model; control is reserved for authorization, irreversible actions, safety and required validation.

**Make context judgeable.** State the facts, constraints, examples and completion evidence the model needs; say what must remain true, what must not happen and how a result is judged. Prefer specifics over adjectives that two readers would decide differently.

- **Start with minimal context:** a prompt states its purpose, the available actions and the constraints first, and defers detailed instructions until the task needs them.
- **Make discovery explicit:** every resource the prompt defers needs a clear description and a reliable way to retrieve it.
- **Keep critical constraints visible:** a prompt puts permissions, destructive effects and required validation before the action they govern.
- **Prefer bounded outputs:** a prompt asks for concise results with identifiers or paths for retrieving details, and does not request entire logs or documents.
- **Use locality:** include a bounded amount of likely needed adjacent context with an operation's result. For example, deliver a thread reply with a few preceding messages. Mark omissions and truncation explicitly, and provide a way to retrieve more.
- **Evaluate total work:** saving context is useful only if it does not cause more searches, repeated reads, or mistakes.

## Tool definitions

- **Delete obvious constraints.** Omit rules the model learns from the call result, such as a missing file failing to read or a failed send not being delivered.
- **Describe behavior, not implementation.** State what the tool does and returns; omit internal mechanisms, output markers the model sees in results, and enforcement details.
- **Put parameter rules on the parameter.** Defaults, ranges, pairing, and when-to-set rules belong in that parameter's description or schema; a description that varies with configuration usually means the varying part belongs to a parameter.
- **Say each fact once.** Do not repeat the tool definition in its system-prompt section, a parameter description in the tool description, or one tool's rules in another tool.
- **Measure the change.** Compare first-turn prompt tokens before and after a tool-definition change.
