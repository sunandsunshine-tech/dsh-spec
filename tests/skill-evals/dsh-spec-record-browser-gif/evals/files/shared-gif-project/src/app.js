const save = document.querySelector('#save')
const status = document.querySelector('#status')

save.addEventListener('click', async () => {
  save.disabled = true
  save.textContent = 'Saving…'
  status.textContent = 'Saving changes'
  try {
    await fetch('/save', { method: 'POST' })
  } finally {
    save.disabled = false
    save.textContent = 'Save changes'
    status.textContent = 'Changes saved'
  }
})
