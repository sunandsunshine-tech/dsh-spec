const trigger = document.querySelector('#account-menu-button')
const menu = document.querySelector('#account-menu')

function positionMenu() {
  const viewportHeight = window.innerHeight
  const triggerBounds = trigger.getBoundingClientRect()
  const menuBounds = menu.getBoundingClientRect()
  const gap = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-group'))
  const spaceBelow = viewportHeight - triggerBounds.bottom - gap
  const spaceAbove = triggerBounds.top - gap
  const current = menu.dataset.placement || 'bottom'
  let placement = current

  if (current === 'bottom' && spaceBelow < menuBounds.height) placement = 'top'
  else if (current === 'top' && spaceAbove < menuBounds.height) placement = 'bottom'

  menu.dataset.placement = placement
  menu.style.left = `${triggerBounds.left}px`
  menu.style.top =
    placement === 'bottom' ? `${triggerBounds.bottom + gap}px` : `${triggerBounds.top - menuBounds.height - gap}px`

  requestAnimationFrame(positionMenu)
}

trigger.addEventListener('click', () => {
  const open = menu.hidden
  menu.hidden = !open
  trigger.setAttribute('aria-expanded', String(open))
  if (open) {
    menu.dataset.placement = 'bottom'
    menu.querySelector('[role="menuitem"]')?.focus()
    positionMenu()
  }
})

document.addEventListener('pointerdown', (event) => {
  if (menu.hidden || menu.contains(event.target) || trigger.contains(event.target)) return
  menu.hidden = true
  trigger.setAttribute('aria-expanded', 'false')
})
