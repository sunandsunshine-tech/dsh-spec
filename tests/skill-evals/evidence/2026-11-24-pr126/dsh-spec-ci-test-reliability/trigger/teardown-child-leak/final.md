The scenario clearly matches the CI test-reliability skill because it involves subprocesses that outlive asynchronous teardown and mutate shared state across tests, a documented source of unstable fixtures.

SELECT: dsh-spec-ci-test-reliability