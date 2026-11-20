import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = import.meta.dirname
const output = join(root, 'dist')
rmSync(output, { recursive: true, force: true })
mkdirSync(join(output, 'src'), { recursive: true })
cpSync(join(root, 'index.html'), join(output, 'index.html'))
cpSync(join(root, 'src', 'app.js'), join(output, 'src', 'app.js'))
console.log(output)
