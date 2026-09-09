// Serves the composed site/ the way GitHub Pages serves it, so the artifact can be walked
// before it is deployed. The three behaviours that matter here:
//
//   - everything lives under a base path, not at the root of the origin
//   - a directory serves its index.html
//   - anything else falls back to ONE 404.html, at the site root, with status 404
//
// That last one is the whole reason this script exists: it is what the demo's deep links land
// on, so a redirect that works in a normal dev server proves nothing.

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = join(root, 'site')

const BASE = '/checkout-kit/'
const PORT = Number(process.env.PORT ?? 4180)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

if (!existsSync(site)) {
  console.error('No site/ to serve. Run `npm run site:build` first.')
  process.exit(1)
}

const send = (res, status, file) => {
  res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = decodeURIComponent(url.pathname)

  if (path === '/') {
    res.writeHead(302, { location: BASE })
    res.end()
    return
  }

  if (!path.startsWith(BASE)) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end(`Nothing is served outside ${BASE}\n`)
    return
  }

  // normalize() keeps a ../ in the URL from escaping site/.
  const candidate = join(site, normalize(path.slice(BASE.length)))

  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html')
    if (existsSync(index)) {
      send(res, 200, index)
      return
    }
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    send(res, 200, candidate)
    return
  }

  // The single root 404, exactly as Pages does it - a 404.html in a subdirectory is ignored.
  send(res, 404, join(site, '404.html'))
}).listen(PORT, () => {
  console.log(`site/ on http://localhost:${PORT}${BASE}`)
  console.log(`demo   http://localhost:${PORT}${BASE}demo/`)
})
