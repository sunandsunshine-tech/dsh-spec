# Checkout path

`node diagnose.mjs` starts the real order endpoint, calls it through the client, and prints the
client total together with the server's external-quote and local-transform phases. The external
quote delay defaults to 80 ms and can be controlled for diagnosis with
`EXTERNAL_DELAY_MS=0 node diagnose.mjs`.

`node --test tests/path.test.mjs` checks the checkout output. The production code is intentionally
left unchanged for this diagnosis fixture.
