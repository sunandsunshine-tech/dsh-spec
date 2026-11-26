Reworked [current.schema.json](/workspace/evals/files/release-tool/current.schema.json) in place.

- Tool and public parameter names remain unchanged.
- Defaults, ranges, enums, and constraints now use enforceable JSON Schema keywords.
- Cross-field dependencies enforce timezone pairing, valid canary configuration, and production approval.
- The tool description now states only its operation and returned identifier.

Validated as Draft 7 JSON Schema and exercised against 7 valid and 14 invalid payloads. Only the requested file changed.