import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { readArchiveManifest, verifyArchives } from './install-archives.mjs'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version
if (!/^\d+\.\d+\.\d+$/.test(version) || version === '0.0.0') {
  throw new Error('Set the root package version to the intended archive release version.')
}
if (readdirSync('.changeset').some((file) => file.endsWith('.md'))) {
  throw new Error('Apply pending changesets before preparing a release.')
}
const archives = resolve('artifacts/packages')
const packages = readArchiveManifest(archives)
const expected = readdirSync('packages')
  .map((directory) => JSON.parse(readFileSync(join('packages', directory, 'package.json'), 'utf8')))
  .filter((manifest) => !manifest.private)
if (packages.size !== expected.length)
  throw new Error('Release does not contain every public package.')
for (const manifest of expected) {
  const entry = packages.get(manifest.name)
  if (!entry || entry.version === '0.0.0' || entry.version !== manifest.version) {
    throw new Error(`Wrong release version for ${manifest.name}.`)
  }
  for (const field of ['dependencies', 'peerDependencies', 'peerDependenciesMeta']) {
    const sorted = (value) =>
      JSON.stringify(Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b)))
    if (sorted(entry[field]) !== sorted(manifest[field])) {
      throw new Error(`Archive ${field} does not match ${manifest.name}.`)
    }
  }
}
verifyArchives(archives, [...packages.values()])
const installer = readFileSync('scripts/install-archives.mjs')
if (!installer.equals(readFileSync(join(archives, 'install.mjs')))) {
  throw new Error('The archive installer differs from the checked source.')
}

const bundleName = `checkout-kit-${version}`
const output = resolve('artifacts/release')
const stage = mkdtempSync(join(tmpdir(), 'checkout-kit-release-'))
const bundle = join(stage, bundleName)
rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })
mkdirSync(bundle)
const files = [...packages.values()].map((entry) => entry.filename)
files.push('manifest.json', 'install.mjs')
for (const file of files) copyFileSync(join(archives, file), join(bundle, file))
for (const file of ['LICENSE', 'NOTICE']) {
  copyFileSync(file, join(bundle, file))
  files.push(file)
}
const docs = 'https://pavel-labs.github.io/checkout-kit'
const repository = 'https://github.com/pavel-labs/checkout-kit'
const packageVersions = [...packages.values()]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(({ name, version }) => `| \`${name}\` | \`${version}\` |`)
  .join('\n')
const notes = `# Checkout kit ${version}

An early release of the headless checkout engine, browser/native hosts, optional
React UI and provider adapters. All ${packages.size} packages have declarations,
changelogs and Apache-2.0 notices. The same package archives pass isolated
installation, strict consumer types, SSR and checkout checks in CI.

## Checkout UI

The optional UI kit includes neutral light/dark themes, responsive payment screens,
editable fields, payment choices, accessible icon actions and consistent interaction
states. Preview the [component gallery](${docs}/demo/gallery) and follow the
[UI guide](${docs}/ui.html). The gallery never creates a payment.

## Package versions

The bundle version identifies this collection. Packages are independently versioned;
the installer uses their manifest rather than assuming matching version numbers.

| Package | Version |
| --- | --- |
${packageVersions}

## Install without a registry token

Download \`${bundleName}.tar.gz\` from this release and extract it. Run the
installer from your application's directory, pointing at the extracted bundle:

\`\`\`sh
node /path/to/${bundleName}/install.mjs runtime-browser provider-paypal react ui
\`\`\`

Use \`provider-stripe\` or \`provider-adyen\` for those adapters. Required checkout-kit
peers (including core) are included automatically; npm resolves external peers
normally. \`--list\` lists packages, \`--dry-run\` verifies without installing,
and \`--all\` includes the testing tools. Individual \`.tgz\` files can also be
installed together with their peers using \`npm install\`.

The installer checks SHA-512 integrity before changing your project. SHA256SUMS
covers every release file and the bundle. Archives do not require a clone,
workspace source conditions or private registry access.

## Integration

- [English guides](${docs}/getting-started.html) / [Русская документация](${docs}/ru/getting-started.html)
- [All packages and responsibilities](${docs}/packages.html)
- [Run the merchant server and provider SDK examples](${repository}/tree/v${version}/examples)
- [Package changelogs](${repository}/tree/v${version}/packages)

Stripe, Adyen and PayPal integrate through your merchant API. Six generic adapters
are reference protocols, not bank certifications. Tests use fixtures and local
protocol simulators; account sandbox verification remains separate. The example
merchant server uses in-memory state. Your application owns authentication,
durable state, verified notifications and fulfillment.

GitHub release archives are public. Registry publication remains separately
configured for the \`@checkout-kit\` scope; this release does not claim npm publication.
`
writeFileSync(join(bundle, 'README.md'), notes)
files.push('README.md')
try {
  for (const file of files) copyFileSync(join(bundle, file), join(output, file))
  const filename = `${bundleName}.tar.gz`
  const result = spawnSync('tar', ['-czf', join(output, filename), '-C', stage, bundleName], {
    stdio: 'inherit',
  })
  if (result.status !== 0)
    throw new Error('Could not create the release bundle. Install tar and retry.')
  files.push(filename)
  const checksums = files
    .sort()
    .map(
      (file) =>
        `${createHash('sha256')
          .update(readFileSync(join(output, file)))
          .digest('hex')}  ${file}`,
    )
    .join('\n')
  writeFileSync(join(output, 'SHA256SUMS'), `${checksums}\n`)
  console.log(
    `Prepared v${version}: ${packages.size} verified archives, installer and bundle in artifacts/release.`,
  )
} finally {
  rmSync(stage, { recursive: true, force: true })
}
