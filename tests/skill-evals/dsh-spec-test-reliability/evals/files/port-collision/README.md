# Port collision fixture

The suite starts several test processes in one CI job. `findFreePort()` asks the operating
system for a free port, closes the probe, and later reopens the real listener on the returned
number.

Run `npm test`. A competitor listener acquires the probed port before the application listener, so
the pre-fix fixture fails deterministically with `EADDRINUSE`. The retained CI log shows the same
signature from two shards.
