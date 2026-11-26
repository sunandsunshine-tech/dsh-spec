# Session projection review rules

- SESSION-1: A persisted projection has one authoritative owner. Persist facts only; keep readers, handles, promises, and runtime resources outside persisted state.
- SESSION-2: Projection state stays fixed-size or sublinear. Linear retention requires an explicit current purpose plus memory, replay, and per-event bounds.
- SESSION-3: A synchronous historical read must not require retaining the event history or loading the full log during a cache miss.
- SESSION-4: A change to projection fields or recovery semantics increments the projection state version and provides a migration proving restored-checkpoint replay matches full replay.
