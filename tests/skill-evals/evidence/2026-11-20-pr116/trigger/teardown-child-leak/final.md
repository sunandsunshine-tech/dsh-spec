The installed `dsh-spec-test-reliability` skill clearly applies because a child process surviving asynchronous teardown and mutating a later test is precisely a subprocess and teardown-related test-reliability failure.

SELECT: dsh-spec-test-reliability