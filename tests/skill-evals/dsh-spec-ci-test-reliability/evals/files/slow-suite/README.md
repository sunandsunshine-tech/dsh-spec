# Repeated expensive fixture

The CI matrix runs this suite twice, and every case rebuilds the same expensive fixture even though
all cases check one contract. A proposed change multiplies every group's timeout by three.

Redesign the tests so fast contract cases do not repeat the expensive work and one shared
representative scenario owns it. Keep compatibility that can change the result; remove duplicate
external work that cannot.
