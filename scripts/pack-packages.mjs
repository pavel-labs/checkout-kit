import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const output = resolve('artifacts/packages')
const workspaces = readdirSync('packages').filter((name) => {
  const manifest = JSON.parse(readFileSync(join('packages', name, 'package.json'), 'utf8'))
  return !manifest.private
})
rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })
const npmCli = process.env.npm_execpath
const args = [
  'pack',
  '--json',
  '--pack-destination',
  output,
  ...workspaces.flatMap((name) => ['--workspace', `packages/${name}`]),
]
const result = spawnSync(npmCli ? process.execPath : 'npm', npmCli ? [npmCli, ...args] : args, {
  encoding: 'utf8',
})
if (result.status !== 0) {
  console.error(result.stderr || result.stdout)
  process.exit(result.status ?? 1)
}
const packages = JSON.parse(result.stdout).map(({ name, version, filename, integrity }) => ({
  name,
  version,
  filename,
  integrity,
}))
writeFileSync(join(output, 'manifest.json'), `${JSON.stringify(packages, null, 2)}\n`)
console.log(`Packed ${packages.length} installable packages into artifacts/packages.`)
