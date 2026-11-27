# Inventory report service

`node server.mjs` starts the production HTTP entry. `GET /report` reads the fixed inventory through
`createInventory` and returns the report JSON used by the service.

The project owns three distinct performance decisions:

- `node bench.mjs` runs the production HTTP path and prints every warm-up and measured sample.
- `node gate.mjs` applies the checked-in `PROJECT_MEDIAN_GATE_MS` value to the benchmark median.
- `node profile.mjs` instruments the production report consumer and prints work counts.

The gate belongs to this project; it is not a universal target. The functional test is
`node --test tests/report.test.mjs`.
