# Split test lanes

`npm run test:contract` checks the production row contract directly and runs in both CI Node lanes.
`npm run test:integration` owns the one delayed fixture execution and runs once in CI.

`npm test` runs both suites locally.
