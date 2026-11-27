# Stable identity and subscription fixture

`src/store.mjs` is the production row store. `subscribe` emits the current collection immediately;
the returned callback removes that subscription. Each update emits another whole-collection
snapshot. A narrower row subscription must preserve the same immediate-delivery and teardown
contract. `node diagnose.mjs` records identity, event and order changes. `node --test
tests/store.test.mjs` checks the collection contract.
