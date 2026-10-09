# Releasing

Checkout kit has two independent distribution paths: public GitHub release archives and
an optional package-registry release. Archive installation needs no registry credentials.
Version `0.1.0` is an early release; fixture/simulator coverage and provider account verification
are documented separately.

## Install a tagged release

Download `checkout-kit-0.1.0.tar.gz` from
[GitHub Releases](https://github.com/pavel-labs/checkout-kit/releases/tag/v0.1.0) and extract it.
From your application's directory:

```bash
node /path/to/checkout-kit-0.1.0/install.mjs runtime-browser provider-paypal react ui
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
npm pkg set version=0.1.1
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

## Optional registry publication

The manifests still use `publishConfig.registry=https://npm.pkg.github.com` and
`access=restricted`. `.npmrc` routes the `@checkout-kit` scope there. The manual **Release** workflow
uses the Actions secret `PACKAGES_TOKEN`, which must have access to publish under that scope.
Repository write access alone does not establish package-scope ownership.

Run **Release** after the version commit is merged. Its default `dry-run` packs actual archives,
verifies separate-consumer installation and uploads them without publishing. It also checks
formatting, lint, package/example types, tests, purity, built exports and declarations. Disable
`dry-run` only when the intended registry and credentials are configured. This workflow does not
claim that archive releases are available on npm.

Consumers of an existing GitHub Packages registry release configure their own scope and read token:

```ini
@checkout-kit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Keep the token value in the environment. Changing registry or scope requires updating manifests,
`.npmrc`, Changesets access configuration and workflow authentication together. Public provider
release notes should state which account sandbox configurations were exercised; local fixtures and
simulated browser tests are a different kind of evidence.
