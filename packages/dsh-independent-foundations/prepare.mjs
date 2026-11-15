import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
const patch = new URL('./search-presets.patch.yml', import.meta.url)
const search = pathToFileURL(fileURLToPath(new URL('./native/tool-fs-search/lib/index.js', import.meta.url))).href
const input = await readFile(patch, 'utf8')
let n = 0
const output = input.replace(/(^\s*name:\s*)(?:'@deepseek-ai\/dsh-tool-fs-search'|file:\/\/\/\S+\/native\/tool-fs-search\/lib\/index\.js)\s*$/gm, (_all, prefix) => { n++; return prefix + search })
if (n !== 3) throw new Error('Expected three supported search presets, found ' + n)
await writeFile(patch, output, 'utf8')
console.log('Prepared three search presets for this location.')
