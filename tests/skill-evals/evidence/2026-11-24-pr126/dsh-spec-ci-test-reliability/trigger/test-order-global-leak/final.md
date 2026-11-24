The installed CI test reliability skill clearly applies because the failure is order-dependent and caused by leaked process-global state: environment variables and fake timers persisting between tests.

SELECT: dsh-spec-ci-test-reliability