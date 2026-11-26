# Write coordinator

The write coordinator serializes writes.

First I checked the queue implementation. The old draft used a global mutex, which we rejected in
review. This change now flushes events before disposal completes.
