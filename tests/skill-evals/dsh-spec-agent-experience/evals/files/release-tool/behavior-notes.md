# `schedule_release` behavior

- `environment` is required and is either `staging` or `production`.
- `replicas` defaults to `2` when omitted. Accepted values are integers from `1` through `10`.
- `start_at` and `timezone` are either both supplied or both omitted.
- `rollout_strategy` defaults to `all-at-once` and accepts `all-at-once` or `canary`.
- When `rollout_strategy` is `canary`, `canary_percentage` is required, defaults to `10`, and accepts integers from `1` through `100`.
- When `rollout_strategy` is not `canary`, `canary_percentage` must be omitted.
- `approval_ticket` is required only when `environment` is `production`.
- The operation schedules one release and returns its identifier. Callers do not need to know how validation is implemented.
