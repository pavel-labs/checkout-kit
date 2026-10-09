import { copyFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Every standalone tarball includes the same license and attribution as the repo.
for (const directory of readdirSync('packages')) {
  for (const notice of ['LICENSE', 'NOTICE']) {
    copyFileSync(notice, join('packages', directory, 'dist', notice))
  }
}
