The issue is test contamination caused by incomplete subprocess cleanup during teardown, which falls squarely within the skill’s focus on fixtures, shared state, subprocesses, and test reliability.

SELECT: dsh-spec-ci-test-reliability