import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyNpmArchives } from './publish-npm.mjs'

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'checkout-npm-'))
  const archive = {
    name: '@checkout-kit/core',
    version: '0.1.0',
    filename: 'core.tgz',
    integrity: `sha512-${createHash('sha512').update('tested-bytes').digest('base64')}`,
  }
  const manifest = {
    name: archive.name,
    version: archive.version,
    publishConfig: { registry: 'https://registry.npmjs.org', access: 'public' },
  }
  mkdirSync(join(root, 'packages/core'), { recursive: true })
  mkdirSync(join(root, 'artifacts/packages'), { recursive: true })
  writeFileSync(join(root, 'packages/core/package.json'), JSON.stringify(manifest))
  writeFileSync(join(root, 'artifacts/packages/manifest.json'), JSON.stringify([archive]))
  writeFileSync(join(root, 'artifacts/packages/core.tgz'), 'tested-bytes')
  return { root, manifest, archive }
}

test('the public npm release checks bytes, destination and committed versions', () => {
  const { root, manifest } = fixture()
  try {
    assert.equal(verifyNpmArchives(root).length, 1)
    writeFileSync(join(root, 'artifacts/packages/core.tgz'), 'tampered')
    assert.throws(() => verifyNpmArchives(root), /Integrity/)
    writeFileSync(join(root, 'artifacts/packages/core.tgz'), 'tested-bytes')
    manifest.publishConfig.access = 'restricted'
    writeFileSync(join(root, 'packages/core/package.json'), JSON.stringify(manifest))
    assert.throws(() => verifyNpmArchives(root), /public npm/)
    manifest.publishConfig.access = 'public'
    manifest.version = '0.2.0'
    writeFileSync(join(root, 'packages/core/package.json'), JSON.stringify(manifest))
    assert.throws(() => verifyNpmArchives(root), /versions/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
