export function dialogMarkup({ open }) {
  return open ? '<dialog open data-initial-focus="close-button"><button>Close</button></dialog>' : '<dialog></dialog>'
}
