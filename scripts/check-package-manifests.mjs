// npm pack reads workspace manifests too. Wait until every build has finished writing
// exports, then validate packages one at a time against their actual published files.
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { publint } from 'publint'
import { formatMessage } from 'publint/utils'

const packagesDir = fileURLToPath(new URL('../packages/', import.meta.url))
const packages = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
const failed = []

for (const name of packages) {
  try {
    const { messages, pkg } = await publint({
      pkgDir: `${packagesDir}${name}`,
      pack: 'npm',
      level: 'warning',
      strict: true,
    })
    if (messages.length) {
      for (const message of messages) console.error(`${pkg.name}: ${formatMessage(message, pkg)}`)
      failed.push(name)
    }
  } catch (cause) {
    console.error(`${name}: ${cause instanceof Error ? cause.message : String(cause)}`)
    failed.push(name)
  }
}

if (failed.length) {
  console.error(`Package validation failed in: ${failed.join(', ')}`)
  process.exit(1)
}
console.log(`Published files and manifests are valid in all ${packages.length} packages.`)
