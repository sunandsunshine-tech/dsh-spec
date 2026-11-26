type Tool = {
  name: string
  phase: number
  register(): void
}

type Policy = {
  wrapWrite(tool: Tool): Tool
  wrapEdit(tool: Tool): Tool
}

/*
 * Loading policy before the model-facing tools makes every write and edit call
 * pass through the read-before-mutation gate.
 */
export function registerTools(plugins: Tool[], policy: Policy): Tool[] {
  const ordered = [...plugins].sort((left, right) => left.phase - right.phase)
  const registry: Tool[] = []

  registry.push({
    name: 'workspace-policy',
    phase: 0,
    register() {
      policy.wrapWrite({
        name: 'write',
        phase: 0,
        register() {},
      })
      policy.wrapEdit({
        name: 'edit',
        phase: 0,
        register() {},
      })
    },
  })

  for (const plugin of ordered) registry.push(plugin)
  return registry
}
