# Global-state fixture

The test mutates an optional environment entry, the process working directory, and fake timers. It has no cleanup when setup fails before the final assertions.
