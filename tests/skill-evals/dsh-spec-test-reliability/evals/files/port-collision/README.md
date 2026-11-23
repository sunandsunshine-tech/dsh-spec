# Port collision fixture

The suite starts several test processes in one CI job. The server fixture currently asks the operating system for a free port, closes that probe, and later opens the real listener on the returned number.
