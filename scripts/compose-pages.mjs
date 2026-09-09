// Assembles the single artifact GitHub Pages serves:
//
//   site/        the documentation site   (VitePress, static HTML per page)
//   site/demo/   the demo                 (an SPA)
//
// Run it after `docs:build` and `build:mock`. It exists as a script rather than a handful of
// workflow steps so the artifact can be built and walked locally before anyone trusts it.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const site = join(root, 'site')

const DOCS = join(root, 'docs/.vitepress/dist')
const DEMO = join(root, 'apps/demo/dist')

/** Must agree with `base` in docs/.vitepress/config.ts and apps/demo/vite.config.ts. */
const BASE = '/checkout-kit/'
const DEMO_BASE = `${BASE}demo/`

for (const [what, path, how] of [
  ['The documentation site', DOCS, 'npm run docs:build'],
  ['The demo', DEMO, 'npm run build:mock'],
]) {
  if (!existsSync(path)) {
    console.error(`${what} has not been built. Run \`${how}\` first.`)
    process.exit(1)
  }
}

rmSync(site, { recursive: true, force: true })
mkdirSync(site, { recursive: true })

cpSync(DOCS, site, { recursive: true })
cpSync(DEMO, join(site, 'demo'), { recursive: true })

// GitHub Pages serves exactly one 404.html, from the root of the site, and ignores any in a
// subdirectory. VitePress wrote that file, and it is the right page for a mistyped docs URL -
// but it is also what a deep link into the demo lands on, and the demo is an SPA whose routes
// have no files behind them.
//
// So the docs' own 404 keeps its design and gains a redirect in front of it: anything under
// /demo/ is encoded into a query on the demo's index.html, which puts the route back (see
// apps/demo/index.html). Everything else falls through and renders as before.
const notFound = join(site, '404.html')
const html = readFileSync(notFound, 'utf8')

// The redirect below is only half of the mechanism; the demo has to put the route back. If that
// snippet is ever dropped from apps/demo/index.html, every deep link would land on the demo's
// home page instead - silently, and only in production.
if (!readFileSync(join(site, 'demo/index.html'), 'utf8').includes("location.search[1] !== '/'")) {
  console.error(
    'The demo does not carry the route-restore snippet, so the 404 redirect would strand deep links.',
  )
  console.error('See the <script> in apps/demo/index.html.')
  process.exit(1)
}

// The number of path segments before the SPA's own routes begin: 'checkout-kit' and 'demo'.
const depth = DEMO_BASE.split('/').filter(Boolean).length

const shim = `<script>
  ;(function (location) {
    var demoBase = ${JSON.stringify(DEMO_BASE)}

    // A mistyped documentation URL is not ours to handle - the page below says so already.
    if (location.pathname.indexOf(demoBase) !== 0) return

    var segments = location.pathname.split('/')
    var route = segments.slice(${depth + 1}).join('/')

    location.replace(
      location.protocol +
        '//' +
        location.host +
        segments.slice(0, ${depth + 1}).join('/') +
        '/?/' +
        route.replace(/&/g, '~and~') +
        (location.search ? '&' + location.search.slice(1).replace(/&/g, '~and~') : '') +
        location.hash,
    )
  })(window.location)
</script>
`

if (!html.includes('<head>')) {
  console.error('The generated 404.html has no <head> to put the demo redirect in.')
  process.exit(1)
}

writeFileSync(notFound, html.replace('<head>', `<head>\n${shim}`), 'utf8')

for (const required of ['index.html', '404.html', 'ru/index.html', 'demo/index.html']) {
  if (!existsSync(join(site, required))) {
    console.error(`Composed site is missing ${required}.`)
    process.exit(1)
  }
}

console.log(`Composed site/ - docs at ${BASE}, demo at ${DEMO_BASE}`)
