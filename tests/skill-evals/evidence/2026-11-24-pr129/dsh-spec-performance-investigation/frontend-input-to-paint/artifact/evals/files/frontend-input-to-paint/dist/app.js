import { createProducts, filterProducts } from './filter.mjs'

const products = createProducts()
const query = document.querySelector('#query')
const results = document.querySelector('#results')
const summary = document.querySelector('#summary')

query.addEventListener('input', (event) => {
  const start = event.timeStamp
  const matches = filterProducts(products, query.value)
  const filterFinish = performance.now()
  const fragment = document.createDocumentFragment()

  for (const match of matches) {
    const row = document.createElement('li')
    row.textContent = `${match.name} — ${match.score}`
    fragment.append(row)
  }

  results.replaceChildren(fragment)
  summary.textContent = `${matches.length} visible results`
  const domFinish = performance.now()

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__lastMeasurement = {
        start,
        filterFinish,
        domFinish,
        finish: performance.now(),
        count: matches.length,
      }
    })
  })
})
