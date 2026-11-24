# Inventory report service

`node server.mjs` starts the production HTTP entry. `GET /report` reads the fixed inventory through
`createInventory` and returns the report JSON used by the service.

There is no benchmark framework and no p95 service-level objective. `node bench.mjs` sends several
warm-up and measured requests over HTTP and prints the raw sample times as JSON. The functional test
is `node --test tests/report.test.mjs`.
