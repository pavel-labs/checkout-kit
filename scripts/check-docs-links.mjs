import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const root = resolve('docs/.vitepress/dist')
const base = '/checkout-kit/'
const list = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? list(join(dir, entry.name))
      : entry.name.endsWith('.html')
        ? [join(dir, entry.name)]
        : [],
  )
const decode = (text) =>
  text.replace(
    /&(?:amp|quot|lt|gt|#39);/g,
    (entity) => ({ '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&#39;': "'" })[entity],
  )
const pages = new Map()
for (const path of list(root)) {
  const html = readFileSync(path, 'utf8')
  const ids = new Set([...html.matchAll(/\bid=(["'])(.*?)\1/gs)].map((match) => decode(match[2])))
  const links = [...html.matchAll(/<a\b[^>]*\bhref=(["'])(.*?)\1/gs)].map((match) =>
    decode(match[2]),
  )
  pages.set(path, { ids, links })
}
let checked = 0
const broken = new Set()
for (const [path, page] of pages) {
  const pageUrl =
    'https://docs.test' +
    base +
    path
      .slice(root.length + 1)
      .split('\\')
      .join('/')
  for (const href of page.links) {
    const url = new URL(href, pageUrl)
    if (url.origin !== 'https://docs.test') continue
    const pathname = decodeURIComponent(url.pathname)
    if (pathname.startsWith(base + 'demo/')) continue // Built separately by compose-pages.
    if (!pathname.startsWith(base)) continue
    let target = resolve(root, pathname.slice(base.length))
    if (pathname.endsWith('/')) target = join(target, 'index.html')
    if (!existsSync(target) && !extname(target)) target += '.html'
    checked++
    if (!existsSync(target)) broken.add(path.slice(root.length + 1) + ' -> ' + href)
    else if (
      url.hash &&
      pages.has(target) &&
      !pages.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))
    ) {
      broken.add(path.slice(root.length + 1) + ' -> ' + href + ' (anchor)')
    }
  }
}
console.log('Checked ' + pages.size + ' rendered pages and ' + checked + ' local links.')
if (broken.size) {
  console.error([...broken].sort().slice(0, 25).join('\n'))
  throw new Error(broken.size + ' broken documentation links')
}
