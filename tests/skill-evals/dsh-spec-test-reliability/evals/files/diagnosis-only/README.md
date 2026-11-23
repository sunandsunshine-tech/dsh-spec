# Intermittent CI fixture

The repository runs independent test shards on a shared self-hosted pool. The failures affect
unrelated branches and the pool exposes no host statistics. The project is runnable, but this task is
diagnosis-only and must not modify or rerun it.
