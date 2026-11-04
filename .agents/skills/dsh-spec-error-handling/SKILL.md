---
name: dsh-spec-error-handling
description: "Apply error-handling principles when designing, implementing, or reviewing failures, recovery, retries, background tasks, and user-visible error reports in software projects. Not a general code-review, test-strategy, or debugging guide. 用于软件工程中的错误处理：设计、实现或审查失败、恢复、重试、后台任务与用户可见错误报告；不用于一般代码评审、测试策略或调试。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# Error handling

Define failures, their owners, and what remains safe after failure.

## Typed, structured failures

Expected failures need declared types, stable discriminants, and handling-relevant details. Reuse the error conventions of the package, module, or service that owns the failure, preserve causes, and separate machine identity from display text. Never route handling by parsing messages. Unexpected defects, such as an unreachable branch or a failed invariant, may remain a plain error; containment must never turn them into success.

## Handle, recover, or stop

For each failure, define handling and reporting owners, containment, and guarantees in the owning API's documentation or the project's equivalent record of the API's contract: valid invariants, absent/partial/committed/unknown effects, and cleanup responsibility. Background work retains these obligations.

Handling a failure limits how far it propagates, not the mutations already made. Only the affected state's owner can establish safe continuation. Otherwise stop dependent work, discard invalid state or instances, or escalate. Logging alone is not recovery. Retries require safe repetition, cancellation, and an explicit owner; finite operations need budgets, while continuing supervision needs lifecycle ownership and observable degradation.

## Localized, actionable, visible reports

Every final report needs a readable summary, affected operation, and safe next action. Localize through the locale mechanism of the surface that shows the text, where one exists; other diagnostics use their existing output language. Keep sensitive internal details out of user-facing text.

Untrusted state or unknown outcomes must be visible through the surface the affected user or system actually uses — a UI, command output, default-enabled accessible logs, or the error the caller receives: report the impact, uncertainty, system disposition, and safe next step. Persistent invalid state needs persistent visibility. Never claim success, rollback, or safe retry without guarantees. Reporting failures need an independent fallback.

Verify the resulting state and visible outcomes, not merely that the failure was intercepted.

## Foundations

Meyer's *Object-Oriented Software Construction* (1997): contracts and invariants; Sutter's *Exceptional C++* (1999): exception safety guarantees; Armstrong's [thesis](https://www.erlang.org/download/armstrong_thesis_2003.pdf) (2003): isolation and supervision.
