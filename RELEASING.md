# Releasing

All 16 public `@checkout-kit/*` packages are published on [npm](https://www.npmjs.com/org/checkout-kit). Applications should use the [npm installation guide](./docs/getting-started.md#install-from-npm); the [catalog](./docs/packages.md) links every package and lists its independent version. The private root package `checkout-kit` is not published.

Checkout kit also distributes GitHub release archives. Their bundle version is independent of npm package versions. The legacy bundle `0.2.0` includes UI `0.2.0` and the other 15 packages at `0.1.0`; current npm versions include the later security and telemetry changes.

## Install a tagged release

Download `checkout-kit-0.2.0.tar.gz` from
[GitHub Releases](https://github.com/pavel-labs/checkout-kit/releases/tag/v0.2.0) and extract it.
From your application's directory:

```bash
node /path/to/checkout-kit-0.2.0/install.mjs runtime-browser provider-paypal react ui
```

The installer includes required checkout-kit dependencies and peers, then asks npm to install
those archives together. npm resolves external peers such as React 19 normally. Choose another
provider or omit React/UI as needed. `--list` lists the packages, `--dry-run` verifies a selection
without installing, and `--all` includes the testing tools. A missing or damaged selected archive
fails before npm can modify the consumer project.

The release contains all public `.tgz` files, `manifest.json` with SHA-512 integrity and dependency
metadata, `install.mjs`, license/attribution, `SHA256SUMS`, and a complete bundle. Individual
archives can also be passed to `npm install` together with their checkout-kit peers. The installer
uses Node.js 24 and has no dependencies outside Node and npm.

## Build development archives

```bash
npm ci
npm run pack:packages
npm run verify:consumer
```

`artifacts/packages` contains every public package and the standalone installer. CI uploads the
same files as `checkout-kit-packages`, retained for 14 days. Tagged release assets remain available
after that period. Development archives use committed package versions, so prefer a tagged release
for a stable source reference.

Verification installs all 16 archives outside the workspace, checks strict NodeNext types, Node
checkout, SSR and exports, then installs minimal headless and React selections. It also checks that
invalid selections and damaged downloads fail before installation. Each package includes its
changelog and the repository's Apache-2.0 license/attribution.

## Prepare versions

Package changes need a changeset:

```bash
npm run changeset
npm run version
```

Versioning applies changesets, writes package changelogs and updates the workspace lockfile.
Internal peers use compatible ranges instead of `*`. Major versions change the plugin contract,
minor versions add capabilities and patches fix behavior; treat minor changes cautiously before
1.0. The conformance suite verifies that providers still honor the contract.

The private root package's `version` names the **complete archive bundle**, not a published package.
Set its next version in the release PR and update the lockfile, for example:

```bash
npm pkg set version=0.2.1
npm install --package-lock-only
```

Individual package versions come from Changesets and may differ in later bundles. Apply all pending
changesets before publishing an archive release. Private examples/apps are excluded from package
versioning. Commit manifests, lockfile and changelogs together, then verify:

```bash
npm run verify:consumer
npm run release:archives
```

The second command verifies package versions, dependency metadata, archive integrity and installer
source before writing all assets into `artifacts/release`.

## Publish public archives

**Publish release archives** runs after a successful **CI push on this repository's `main`**.
It checks out that exact commit and downloads the `checkout-kit-packages` artifact from that exact
CI run. PR/fork artifacts are excluded. It verifies the archives and builds the complete bundle
without rebuilding the tested package files.

The workflow creates a draft `v<root-version>` release at the verified commit, uploads every asset,
then publishes it. Versions below 1.0 are marked as GitHub prereleases. An existing published version
is skipped and its assets are never overwritten. A failed upload leaves a draft; rerunning the
workflow resumes that draft only when it targets the same commit. Resolve a conflicting draft
manually. The workflow uses repository-scoped `GITHUB_TOKEN` with contents-write and actions-read
permissions; no extra token or registry-scope access is needed.

For a subsequent release, merge a PR with applied package changesets and a new root bundle version.
A new successful main CI run publishes that version. Rerun failed Actions runs to retry; registry
publication is unrelated to this workflow.

## Public npm publication

All public package manifests, `.npmrc` and Changesets target `https://registry.npmjs.org` with `access=public`. The initial publication is complete and every package is available under `latest`. Keep npm publication separate from GitHub archive publication; success in one does not publish the other.

For future releases, apply pending changesets, commit package/peer versions and the lockfile, and decide the next archive bundle version. Review the [production gate](./docs/production.md), including actual provider-account sandbox checks. Consumer documentation and links can be updated on GitHub and the documentation site without a package release; README changes appear on npm when the containing package is published in a new version.

### Verify without credentials

```bash
npm ci
npm run verify:consumer
npm run test:release
npm run release:npm-check
```

The last command verifies committed package versions, public registry/access, dependency metadata
and every archive's SHA-512 hash, then runs `npm publish --dry-run` for those exact tarballs.
Required checkout-kit dependencies/peers are ordered first. It does not upload packages, require
a write token or prove scope ownership. The manual **Release** workflow defaults to this same
verification, plus types, tests, lint, build, declarations and a clean generated-file check.
`npm run release` remains a local verification command; real publication uses the workflow.

### Adding a package to the existing npm scope

The existing `@checkout-kit` scope contains the 16 published packages. Publishing a new package requires permission in that npm organization; repository ownership alone does not grant npm access. Existing versions are immutable, so changes to a published package need a new version.

A new package needs an initial authenticated publication before its package settings can be used
to configure a trusted publisher. Use the verified archives, publish dependencies/peers first,
and authenticate interactively with npm/2FA; never put credentials in source or chat:

```bash
npm publish artifacts/packages/<verified-package-file>.tgz \
  --registry https://registry.npmjs.org --access public --tag next
```

Use the actual filenames from `artifacts/packages/manifest.json`; the command above is a template.
The dry-run prints the dependency order. Initial interactive publication is distinct from the later
OIDC/provenance workflow and must not be described as having GitHub provenance without verification.

### Configure trusted publishing

For each package on npm, configure a GitHub Actions trusted publisher:

| npm field            | Value                                         |
| -------------------- | --------------------------------------------- |
| Organization or user | `pavel-labs`                                  |
| Repository           | `checkout-kit`                                |
| Workflow filename    | `release.yml`                                 |
| Environment name     | `npm`                                         |
| Allowed action       | Permit direct `npm publish` for this workflow |

The workflow uses a GitHub-hosted runner and Node.js 24 with npm CLI supporting OIDC
(npm 11.5.1 or later). Create/validate the trusted publisher according to npm's current
requirements. Restrict the GitHub `npm` environment to main and configure maintainer approvals
when desired. After OIDC works, remove unused package write tokens and restrict token publication.

Only the separate publish job has `id-token: write`. It downloads the exact consumer-tested
archives from its verification job; it does not install project dependencies or rebuild packages.
Publication is manual, serialized, main-only, public and uses provenance. The default tag is `next`;
select `latest` only for new versions you want as the default install.

Apply/commit changesets before disabling dry-run. Existing npm versions are immutable: the script
skips identical published bytes on retry, rejects different bytes at the same version before any
upload, and fails closed on registry errors. A partial upload can be rerun; published archives are
never overwritten. Changing a tag for an already published version is a separate authenticated
`npm dist-tag` operation, not a side effect of retrying this workflow.

After publication, verify the registry version/integrity, provenance badge, dist-tag and installation
from npm in a clean external project. npm release is independent of GitHub archive publication.

[Trusted publishing](https://docs.npmjs.com/trusted-publishers/) ·
[Provenance](https://docs.npmjs.com/generating-provenance-statements/) ·
[Public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
