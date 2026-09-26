---
description: Use when designing agent tools, skills, context loading, or multi-step workflows to make information discoverable and use context efficiently.
metadata:
    date: "2026-09-11"
    github-path: skills/dsh-agent-experience
<<<<<<< HEAD
    github-ref: refs/heads/chore/notes-archive-parity
=======
    github-ref: refs/heads/chore/report-rc2
>>>>>>> 255d2fd (fix(engine): 配对记录的规范形态不再取决于哪份副本在跑)
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: d62d235e546bb15d329302e9cd4e2f045515c9c8
name: dsh-agent-experience
---
- **Start with minimal context:** expose purpose, available actions, and constraints first; load detailed instructions when needed.
- **Make discovery explicit:** every deferred resource needs a clear description and a reliable way to retrieve it.
- **Keep critical constraints visible:** permissions, destructive effects, and required validation should appear before the relevant action.
- **Prefer bounded outputs:** return concise results with identifiers or paths for retrieving details; avoid dumping entire logs or documents.
- **Use locality:** include a bounded amount of likely needed adjacent context with an operation’s result. For example, deliver a thread reply with a few preceding messages. Mark omissions and truncation explicitly, and provide a way to retrieve more.
- **Evaluate total work:** saving context is useful only if it does not cause more searches, repeated reads, or mistakes.
