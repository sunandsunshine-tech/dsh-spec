---
name: dsh-spec-error-handling
description: "Apply error-handling principles when designing, implementing, or reviewing failures in applications, libraries, command-line tools, and services: exceptions, result variants, status or exit codes, recovery, retries, background tasks, silent handlers, and user-visible error reports. Not for general code review, test design, performance tuning, or debugging unrelated to failure handling. 用于应用、库、命令行工具和服务中的错误处理：异常、结果变体、状态码或退出码、恢复、重试、后台任务、静默捕获与用户可见错误报告；不用于一般代码评审、测试设计、性能调优，或与失败处理无关的调试。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# Error handling

Define failures, their owners, and what remains safe after failure.

## Defaults

A default is the value or strategy this skill declares at its use site. It applies when the current request and existing project instructions leave that choice open. A user turn or explicit parameter supplies a one-off value. Existing project instructions supply a persistent override and are read without being modified or copied. Missing project instructions are valid, so do not ask the user to choose a default or create or modify an instruction file merely to select one.

## Typed, structured failures

Expected failures need declared types or result variants, stable discriminants, and handling-relevant details. Reuse the error conventions of the package, module, or service that owns the failure, preserve causes where the runtime supports them, and separate machine identity from display text. Never route handling by parsing messages. Unexpected defects, such as an unreachable branch or a failed invariant, may remain a plain error; containment must never turn them into success.

Classify by the operation's declared outcome, not merely by whether the result looks unusual. A non-zero exit, no matches or another non-ideal success value remains a success when that outcome is not a failure of the operation. A success-shaped failure value is allowed only when the output schema explicitly documents that condition. Do not turn a valid domain outcome into an error solely to simplify control flow.

An error family that carries machine-readable identity declares that identity through the project's existing mechanism: a type, name, code, status, variant, exit status, or documented combination. Prefer one family per owning package or domain over one type per failure. A separate subtype is justified when consumers catch it by type or it carries its own structured fields. The identity follows the project's conventions; when no convention exists, choose one stable machine-readable discriminant for each condition and preserve its literal values. A local family with a truly closed condition set may use a closed code type. A family that providers or extensions can add codes to keeps an open code type, documents its shared codes, and requires consumers to tolerate unknown codes. A discriminant names the failure class its consumers act on, not the call site. Add a new value instead of reusing one whose meaning differs. The [error contract guide](references/error-contracts.md) owns identity responsibilities, family selection, fallback requirements, conversion and compatibility.

Convert foreign failures where the dependency is owned. Operating-system, SDK, protocol, native, worker, and cross-realm failures become the owning domain's failure with the original retained as its cause where supported, or in structured details or diagnostics otherwise. A foreign numeric or vendor code belongs in structured details or the message, not as a replacement for the owning project's discriminant. Preserve structure across layers: do not re-wrap a structured failure as a plain error, store only its message for a later rethrow, or drop its identity while redacting text. A process, worker, or wire boundary transports the portable machine identity and reconstructs an equivalent owning failure; it need not reproduce an identical runtime class.

## Handle, recover, or stop

For each failure, define handling and reporting owners, containment, and guarantees in the owning API's documentation or the project's equivalent record of the API's contract: valid invariants, absent/partial/committed/unknown effects, and cleanup responsibility. Background work retains these obligations.

Handling a failure limits how far it propagates, not the mutations already made. Only the affected state's owner can establish safe continuation. Otherwise stop dependent work, discard invalid state or instances, or escalate. Logging alone is not recovery. Retries require safe repetition, cancellation, and an explicit owner; finite operations need budgets, while continuing supervision needs lifecycle ownership and observable degradation.

An execution wrapper that classifies cancellation, timeout, denial or another expected failure must preserve the owning project's stable machine identity and downstream result. A wrapper must not reduce that failure to display text or a success-shaped result that consumers cannot distinguish.

## Silent failure handlers

A silent handler or empty catch clause discards every failure in its scope. Use one only when every discarded failure leaves the owner's state valid and no caller could act on it. Narrow the handler to one syntactic statement, not one line; several operations need separate handlers, while a compound statement still needs review for the number of operations it contains. Bind the expected failure through the language's normal mechanism with a meaningful name; for example, JavaScript uses `_cleanupFailed` rather than `catch {}` or `catch (_)`, while languages with an explicit exception parameter name that parameter. State why discarding it is safe in the handler or on the line that closes it. A comment such as "ignore" or "expected" without the failure identity and state consequence is not a reason.

When only some failures are safe to discard, select the expected failure by the project's discriminant, then rethrow or otherwise surface the rest. Wrap each independently tolerated operation separately; do not let one expected missing-directory failure hide a later commit or notification failure. Logging, reporting, rethrowing, and returning a fallback are handled failures rather than silent ones; they still need the ownership, state, and reporting rules above. Use a project check for the mechanical form where one exists (when available, use the dsh-spec-pre-push-checks skill). Review decides whether the named failure and stated reason are true.

## Compatibility and verification

An error identity that is persisted, sent across a boundary, or used by retry policy, UI, replay, or analytics is a compatibility promise. Renaming, splitting, merging, or reclassifying one changes observable behavior and needs the project's compatibility or migration record. Do not reuse a retired discriminant for a different meaning.

Tests for an expected failure assert the project's exact machine identity and the resulting state, not only the message. Boundary tests prove that the identity survives the boundary and is reconstructed by the receiving owner. A changed failure path keeps functional, cancellation, cleanup, and user-visible reporting evidence proportionate to its effects.

## Localized, actionable, visible reports

Every final report needs a readable summary, affected operation, and safe next action. Localize through the locale mechanism of the surface that shows the text, where one exists; other diagnostics use their existing output language. Keep sensitive internal details out of user-facing text.

Untrusted state or unknown outcomes must be visible through the surface the affected user or system actually uses — a UI, command output, default-enabled accessible logs, or the error the caller receives: report the impact, uncertainty, system disposition, and safe next step. Persistent invalid state needs persistent visibility. Never claim success, rollback, or safe retry without guarantees. Reporting failures need an independent fallback.

Verify the resulting state and visible outcomes, not merely that the failure was intercepted.

## Foundations

Meyer's *Object-Oriented Software Construction* (1997): contracts and invariants; Sutter's *Exceptional C++* (1999): exception safety guarantees; Armstrong's [thesis](https://www.erlang.org/download/armstrong_thesis_2003.pdf) (2003): isolation and supervision.
