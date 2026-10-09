# Releasing

Installable archives do not require a registry release. The repository also contains a
manual GitHub Packages release workflow; publishing requires access to the `@checkout-kit`
package scope and credentials configured by the owner.

## Build and install now

```bash
npm ci
npm run pack:packages
npm run verify:consumer
```

`artifacts/packages` contains every public package's `.tgz` and a `manifest.json` with names,
versions, filenames and integrity hashes. CI uploads these files as `checkout-kit-packages`.
Install the required archives together with their checkout-kit peer packages in a consumer.
The verification script does exactly that in a temporary project outside the workspace.

These archives are development builds at the committed versions. They are not evidence that
any package has been published to a registry or verified against a live provider account.

## Versions

Package changes need a changeset:

```bash
npm run changeset
npm run version
```

Versioning applies changesets, writes changelogs and updates the workspace lockfile. Commit
that result before releasing. Major versions change the plugin contract, minor versions add
compatible capabilities, and patches fix existing behavior. The conformance suite verifies
that providers still honor the contract.

## Registry configuration

The manifests currently use `publishConfig.registry=https://npm.pkg.github.com` and
`access=restricted`. `.npmrc` routes the `@checkout-kit` scope there. The release workflow
uses the Actions secret `PACKAGES_TOKEN` for publishing. It must have access to publish under
that scope; repository write access alone does not establish package-scope ownership.

For consumers of an existing registry release, configure the scope and a read token in the
consumer's `.npmrc`, keeping the token value in the environment:

```ini
@checkout-kit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install the released packages by name. Until a release exists, use the archives above.
Changing the registry or scope is a release-owner decision; update manifests, `.npmrc`,
changeset configuration and workflow authentication together.

## Release workflow

Run **Release** from the Actions tab after the version commit is merged. The default
`dry-run` packs actual archives, verifies separate-consumer installation and uploads them
without publishing. The workflow also checks formatting, lint, package and example types,
unit/conformance tests, purity, built exports and published declarations.

Only disable `dry-run` when the registry and credentials are configured and you intend to
publish. Public provider packages should state which sandbox configurations were exercised;
local fixtures and simulated browser tests are a different kind of evidence.
