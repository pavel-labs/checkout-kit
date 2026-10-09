import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const registry = 'https://registry.npmjs.org'

/** Verify the exact archives that consumer tests installed, before invoking npm. */
export const verifyNpmArchives = (root) => {
  const directory = join(root, 'artifacts/packages')
  const archives = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'))
  const packages = new Map(
    readdirSync(join(root, 'packages')).flatMap((name) => {
      const manifest = JSON.parse(
        readFileSync(join(root, 'packages', name, 'package.json'), 'utf8'),
      )
      return manifest.private ? [] : [[manifest.name, manifest]]
    }),
  )
  if (!Array.isArray(archives) || archives.length !== packages.size)
    throw new Error('The npm release must contain every public workspace exactly once.')
  const verified = new Map()
  for (const archive of archives) {
    const manifest = packages.get(archive.name)
    if (!manifest || verified.has(archive.name) || manifest.version !== archive.version)
      throw new Error('Archive versions must match the release source without duplicates.')
    if (
      manifest.publishConfig?.registry !== registry ||
      manifest.publishConfig?.access !== 'public'
    )
      throw new Error(`${archive.name} is not configured for public npm publication.`)
    if (
      typeof archive.filename !== 'string' ||
      archive.filename !== basename(archive.filename) ||
      !archive.filename.endsWith('.tgz')
    )
      throw new Error('Invalid npm archive filename.')
    const path = join(directory, archive.filename)
    const integrity = `sha512-${createHash('sha512').update(readFileSync(path)).digest('base64')}`
    if (integrity !== archive.integrity) throw new Error(`Integrity failed for ${archive.name}.`)
    for (const field of ['dependencies', 'peerDependencies', 'peerDependenciesMeta']) {
      if (JSON.stringify(archive[field] ?? {}) !== JSON.stringify(manifest[field] ?? {}))
        throw new Error(`${archive.name} dependency metadata is stale.`)
    }
    verified.set(archive.name, { ...archive, path })
  }
  const ordered = []
  const visiting = new Set()
  const visited = new Set()
  const visit = (name) => {
    if (visited.has(name)) return
    if (visiting.has(name)) throw new Error('Circular runtime dependency in the npm release.')
    visiting.add(name)
    const archive = verified.get(name)
    for (const dependency of Object.keys({ ...archive.dependencies, ...archive.peerDependencies }))
      if (verified.has(dependency)) visit(dependency)
    visiting.delete(name)
    visited.add(name)
    ordered.push(archive)
  }
  for (const name of verified.keys()) visit(name)
  return ordered
}

const run = () => {
  const args = process.argv.slice(2)
  let publish = false
  let tag = 'next'
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--publish') publish = true
    else if (args[index] === '--tag' && ['next', 'latest'].includes(args[index + 1]))
      tag = args[++index]
    else throw new Error('Usage: publish-npm.mjs [--publish] [--tag next|latest]')
  }
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
  const archives = verifyNpmArchives(root)
  if (publish) {
    if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main')
      throw new Error('Use the manual Release workflow on main to publish with provenance.')
    if (
      readdirSync(join(root, '.changeset')).some(
        (name) => name.endsWith('.md') && name !== 'README.md',
      )
    )
      throw new Error('Apply pending changesets and commit versions before publishing.')
  }
  const npm = (parameters) => {
    const cli = process.env.npm_execpath
    return spawnSync(cli ? process.execPath : 'npm', cli ? [cli, ...parameters] : parameters, {
      encoding: 'utf8',
      cwd: root,
    })
  }
  const existing = new Set()
  if (publish) {
    for (const archive of archives) {
      const view = npm([
        'view',
        `${archive.name}@${archive.version}`,
        'dist.integrity',
        '--json',
        '--registry',
        registry,
      ])
      if (view.status === 0) {
        if (JSON.parse(view.stdout) !== archive.integrity)
          throw new Error(
            `${archive.name}@${archive.version} already exists with different contents. Bump its version.`,
          )
        existing.add(archive.name)
      } else if (!/\bE404\b/.test(view.stdout + view.stderr)) {
        throw new Error(`Could not check ${archive.name} on npm. No packages were published.`)
      }
    }
  }
  for (const archive of archives) {
    if (existing.has(archive.name)) {
      console.log(`Already published: ${archive.name}@${archive.version}`)
      continue
    }
    const result = npm([
      'publish',
      archive.path,
      '--registry',
      registry,
      '--access',
      'public',
      '--tag',
      tag,
      ...(publish ? ['--provenance'] : ['--dry-run']),
    ])
    if (result.status !== 0)
      throw new Error(result.stderr || result.stdout || 'npm publish failed.')
    console.log(
      `${publish ? 'Published' : 'Verified dry-run'}: ${archive.name}@${archive.version} (${tag})`,
    )
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run()
