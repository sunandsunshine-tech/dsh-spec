# Cold-start and process-memory fixture

`node probe.mjs` launches a fresh Node.js child for each cold-start sample. Each child imports the
same worker, runs fixed synthetic batches, forces a collection, and reports the result plus memory
state. Each retained batch owns a fixed 32 KiB unpooled external buffer; releasing the retained map
provides a same-workload negative control for the measured `arrayBuffers` memory. The heap delta is
reported only as an observation, not required to remain positive after a synchronous major
collection.
`node --test tests/session.test.mjs` checks the production batch result and the release control.

The process keeps one normalized batch result per identifier. The temporary parsing array does not
survive the batch. Sampling in the current process can be warm, but it is not a cold-start sample.
