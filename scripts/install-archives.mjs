// This file is copied into the release bundle. It has no workspace dependencies.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scope = '@checkout-kit/'
const versionPattern = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

export function readArchiveManifest(directory) {
  const entries = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'))
  if (!Array.isArray(entries) || !entries.length) throw new Error('Empty package manifest.')
  const packages = new Map()
  for (const entry of entries) {
    if (
      !isRecord(entry) ||
      typeof entry.name !== 'string' ||
      !/^@checkout-kit\/[a-z][a-z0-9-]*$/.test(entry.name) ||
      typeof entry.version !== 'string' ||
      !versionPattern.test(entry.version) ||
      entry.filename !== `${entry.name.slice(1).replace('/', '-')}-${entry.version}.tgz` ||
      typeof entry.integrity !== 'string' ||
      !entry.integrity.startsWith('sha512-') ||
      packages.has(entry.name)
    ) {
      throw new Error('Invalid or duplicate package in manifest.json.')
    }
    for (const field of ['dependencies', 'peerDependencies', 'peerDependenciesMeta']) {
      if (entry[field] !== undefined && !isRecord(entry[field])) {
        throw new Error(`Invalid ${field} in ${entry.name}.`)
      }
    }
    for (const field of ['dependencies', 'peerDependencies']) {
      if (Object.values(entry[field] ?? {}).some((range) => typeof range !== 'string')) {
        throw new Error(`Invalid dependency range in ${entry.name}.`)
      }
    }
    packages.set(entry.name, entry)
  }
  return packages
}

export function selectArchives(packages, names) {
  const selected = new Map()
  const visit = (name) => {
    const fullName = name.startsWith(scope) ? name : scope + name
    if (selected.has(fullName)) return
    const entry = packages.get(fullName)
    if (!entry) throw new Error(`Unknown package: ${name}. Run with --list to see packages.`)
    selected.set(fullName, entry)
    const dependencies = {
      ...entry.dependencies,
      ...Object.fromEntries(
        Object.entries(entry.peerDependencies ?? {}).filter(
          ([peer]) => !entry.peerDependenciesMeta?.[peer]?.optional,
        ),
      ),
    }
    for (const dependency of Object.keys(dependencies)) {
      if (dependency.startsWith(scope)) visit(dependency)
    }
  }
  for (const name of names) visit(name)
  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function verifyArchives(directory, packages) {
  for (const entry of packages) {
    const archive = readFileSync(join(directory, entry.filename))
    const integrity = `sha512-${createHash('sha512').update(archive).digest('base64')}`
    if (integrity !== entry.integrity) {
      throw new Error(`Integrity check failed: ${entry.filename}. Download the release again.`)
    }
  }
}

function main() {
  const args = process.argv.slice(2)
  if (!args.length || args.includes('--help')) {
    console.log(`Run from your application's directory with Node.js 24:
  node /path/to/checkout-kit/install.mjs runtime-browser provider-paypal react ui
  node /path/to/checkout-kit/install.mjs --list
  node /path/to/checkout-kit/install.mjs --all --dry-run

Required checkout-kit dependencies and peers are installed together. npm resolves
external peers (such as React 19) normally. --dry-run verifies archives without
installing. --all selects all packages, including the testing tools.`)
    return
  }
  const directory = dirname(fileURLToPath(import.meta.url))
  const packages = readArchiveManifest(directory)
  if (args.length === 1 && args[0] === '--list') {
    for (const entry of packages.values()) console.log(`${entry.name} ${entry.version}`)
    return
  }
  const names = args.filter((arg) => !['--all', '--dry-run'].includes(arg))
  if (names.some((name) => name.startsWith('-')) || (args.includes('--all') && names.length)) {
    throw new Error('Use package names or --all, with optional --dry-run. See --help.')
  }
  const selected = selectArchives(packages, args.includes('--all') ? [...packages.keys()] : names)
  if (!selected.length) throw new Error('Choose at least one package. See --help.')
  // Verify everything selected before npm can modify the consumer project.
  verifyArchives(directory, selected)
  const installArgs = ['install', ...selected.map((entry) => join(directory, entry.filename))]
  console.log(
    `Verified ${selected.length} archives: ${selected.map((entry) => entry.name).join(', ')}`,
  )
  if (args.includes('--dry-run')) {
    console.log(installArgs.map((arg) => JSON.stringify(arg)).join(' '))
    return
  }
  // A Node installation on Windows ships npm here; invoking its JS entry avoids
  // reparsing user paths through cmd.exe. npm also provides this path in its scripts.
  const npmCli =
    process.env.npm_execpath ??
    (process.platform === 'win32'
      ? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
      : null)
  if (npmCli && !existsSync(npmCli))
    throw new Error('npm CLI was not found. Install Node.js with npm.')
  const result = spawnSync(
    npmCli ? process.execPath : 'npm',
    npmCli ? [npmCli, ...installArgs] : installArgs,
    { stdio: 'inherit' },
  )
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
