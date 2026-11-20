# Worker boundary

The parent process starts a worker and receives a serialized failure:

```json
{
  "message": "report target is locked"
}
```

The parent reconstructs a plain `Error` from that message. Retry policy therefore cannot distinguish `REPORT_LOCKED` from an unexpected worker defect, and the worker's original cause is lost.
