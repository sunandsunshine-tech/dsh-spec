# Browser GIF evidence fixture

The project changes the user-visible Save button state in a web settings page.

Declared commands:

```sh
pnpm run build
pnpm run start
```

The project declares browser control as available, Git as the version-control system, and `.artifacts/browser-gif/` as an ignored evidence directory.

The recorded run must use one isolated browser context and a fresh application workspace. The external settings service is represented by the project's normal test transport, and the report must identify that substitution.
