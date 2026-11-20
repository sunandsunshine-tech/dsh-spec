No relevant installed skill applies.

Implement cursor pagination with an opaque cursor containing the sort key and tie-breaker, such as `(created_at, id)`. Decode it and update the query to use keyset filtering:

```sql
WHERE (created_at, id) < (:cursor_created_at, :cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT :limit_plus_one
```

Fetch `limit + 1` rows, return only `limit`, and issue `next_cursor` when an extra row exists. Add a composite `(created_at, id)` index for the query.