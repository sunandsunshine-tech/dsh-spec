# Error contracts

Use this guide when defining or reviewing a failure path whose machine identity reaches another layer, a durable record, or a separate consumer.

## Start with the project's convention

First identify the project's existing machine-readable discriminant. It may be an error type, name, code, status, result variant, exit status, tagged union member, or a documented combination. Preserve its field names, literal values, and construction mechanism.

Do not add another discriminant, rename an existing value, or migrate existing consumers merely to match this guide. If the owning project has no established convention for a new failure path, use [Fallback conventions](#fallback-conventions).

## Separate the responsibilities

| Responsibility | Content |
|---|---|
| Machine identity | The project-declared stable discriminant, or the documented combination of fields, that identifies the failure class to code and analytics |
| Message | A readable report that names the operation and safe next step |
| Details | Structured values needed to recover, retry, explain, or diagnose the failure |
| Cause | The original lower-level or foreign failure where the language or framework supports cause chaining; otherwise equivalent structured detail or diagnostics |

Different runtimes realize these responsibilities with different fields. A type, code, status, or variant can carry part of the identity; a project may require more than one value for a complete condition. Consumers must not infer the failure class from display text. Redacting a message or crossing a boundary must not remove the machine identity.

## Choose the owning failure

1. Reuse the failure family owned by the package, module, service, or domain where the failure originates.
2. Prefer one family with a closed set of conditions over one type per condition.
3. Declare a subtype or variant when consumers handle it separately or it owns structured fields.
4. Extend or construct the project's base failure when one exists.
5. Do not create a family merely to encode a call site.

Choose the condition from the consumer's next action, not from the function that emitted it. Split conditions when consumers must act differently; merge conditions that every consumer handles alike.

## Fallback conventions

This section applies only when the owning project has no convention for a newly introduced failure identity.

- Use a stable type or name for the owning failure family.
- Use an `UPPER_SNAKE_CASE` code for the condition its consumer can act on.
- Assign literals rather than deriving identity from mutable status text, identifiers, paths, or foreign codes.
- Declare the allowed values as a closed set, union, enum, or constants beside the owning failure.

Common fallback condition names include `INVALID_ARGUMENT`, `NOT_FOUND`, `PERMISSION_DENIED`, `CANCELLED`, `TIMEOUT`, `UNAVAILABLE`, `CONFLICT`, and `<OPERATION>_FAILED`. These are examples, not a required vocabulary: use the project's domain language and split or merge them according to consumer action.

## Convert foreign failures at their owner

Convert at the layer that understands the dependency. Preserve the project's machine identity for the resulting failure, retain the original failure as a cause where supported or in structured details or diagnostics otherwise, and keep any actionable foreign status.

The lowest layer that understands the failure classifies it. Layers above preserve the identity and wrap only to add context. At a process, worker, RPC, or wire boundary, transport the portable machine identity and reconstruct an equivalent owning failure; an identical runtime class is not required.

| Foreign failure | Conversion rule |
|---|---|
| Filesystem, process, native, or SDK failure | Map to the owning project's condition, with the foreign code or status retained as detail |
| HTTP, RPC, or protocol status | Map to the owning project's condition, with the status retained as detail or in the message |
| Worker or process boundary | Transport the portable machine identity, preserve available cause or detail, and reconstruct an equivalent owning failure |

## Preserve compatibility

- Adding a family or condition value is compatible when existing consumers can safely ignore it.
- Renaming, splitting, merging, or reclassifying an existing identity is a compatibility change.
- Record old and new values in the project's migration or upgrade record.
- Do not reuse a retired discriminant for another meaning.
- A durable log, analytics event, UI projection, or retry policy that consumes the identity is evidence that it needs compatibility handling.

## Verify the contract

- [ ] Every expected failure uses the owning failure family and the project's existing identity mechanism.
- [ ] No redundant discriminant is added when the project already defines one.
- [ ] The exact machine identity is stable and consumers do not route on display text.
- [ ] Foreign failures are converted at their owner with the original cause or equivalent detail retained.
- [ ] Every transport or persistence boundary preserves the portable machine identity.
- [ ] The message is actionable and contains no sensitive internal detail.
- [ ] Tests assert the exact identity and the resulting state for each expected failure.
- [ ] A changed existing identity has its migration record.
