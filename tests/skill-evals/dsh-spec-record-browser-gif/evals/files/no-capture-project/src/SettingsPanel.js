export function SettingsPanel({ onSave }) {
  const [pending, setPending] = useState(false)
  return (
    <button
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await onSave()
        setPending(false)
      }}
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  )
}
