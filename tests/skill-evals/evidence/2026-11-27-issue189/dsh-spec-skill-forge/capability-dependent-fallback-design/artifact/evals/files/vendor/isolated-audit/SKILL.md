---
name: isolated-audit
description: "Use when auditing a repository for unsafe data flows."
license: "MIT"
---

# Isolated audit

Audit the repository for unsafe data flows and produce the final report in one pass from an execution context independent of the implementation. When the host supports isolated execution, use it (preferably a subagent). When isolated execution is unavailable, complete through another independent mechanism if one is available. If neither exists, do not produce the report; hand off explicitly, naming the completed work, remaining work, missing capability, and a resumable next step.
