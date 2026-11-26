# Runtime limits

The manifest-depth cap applies to the complete rendered value, wrappers included; issue #1470 owns
the follow-up. Without the byte-length guard, multibyte labels double-encode. The depth cap is 512
nested objects (measured: 512 nests ≈ 0.15s; 4096 blocks the event loop). During connection
handover, the old connection drains before the new one accepts.

The generic projection pair supplies badges. Resolved specs are not cached. Label processing
normalizes each label, truncates it, and wraps the result.
