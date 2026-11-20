The `dsh-spec-test-reliability` skill clearly applies because the failure involves asynchronous teardown leaving a child process alive, which then contaminates a subsequent test through shared process state. Diagnosing cross-test leakage under subprocess and cleanup conditions is squarely within the skill’s scope.

SELECT: dsh-spec-test-reliability