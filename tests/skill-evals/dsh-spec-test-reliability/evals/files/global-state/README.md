# Global-state fixture

The suite mutates an optional environment entry, the process working directory, and a process-wide
clock before checking configuration.

Run `npm test`. The second test preserves the state observed before the first test and fails until
the first test restores every global through immediate and fallback cleanup.
