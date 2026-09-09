# Releasing

These packages are published **privately**, to GitHub Packages, under the `@checkout-kit` scope.
Only accounts with read access to this repository can install them. Nothing goes to npmjs.com.

That is deliberate for now. All six plugins are written against a mock backend and **none of
them has taken a real payment**, so they are not something to hand strangers. Publishing
privately means they can be installed rather than copied between projects, which is the only
thing that was missing.

## Before the first release

**The repository stays where it is.** The organisation below owns the _packages_, not the code —
GitHub Packages decides who may publish from the scope, and the scope is what has to belong to
an account you control.

### 1. Create the organisation

github.com → **+** (top right) → **New organization** → the **Free** plan. Name it exactly
**`checkout-kit`**, all lowercase: it becomes the `@checkout-kit` scope, and npm scopes cannot
contain capitals.

Nothing else about it needs configuring, and no repository moves into it.

### 2. Create a token that may publish

The first publish of an organisation-scoped package cannot use a workflow's `GITHUB_TOKEN` —
that token only has rights over its own repository's owner, and here the owner of the packages
is the organisation. So, a classic personal access token:

Settings → Developer settings → **Personal access tokens (classic)** → Generate new token.
Tick **`write:packages`** (which pulls in `read:packages` and `repo`). Copy it once; GitHub will
not show it again.

If your organisation has SSO enabled, authorise the token for it on the token's page, or every
publish returns 403.

### 3. Give the workflow the token

This repository → Settings → Secrets and variables → **Actions** → New repository secret, named
**`PACKAGES_TOKEN`**, with the token as its value.

That is all. The manifests already carry `publishConfig.registry` and `access: restricted`, and
`.npmrc` sends the `@checkout-kit` scope to GitHub Packages and nothing else.

### After the first publish

Once a package exists under the organisation you can grant this repository access to it —
organisation → Packages → the package → Settings → Manage Actions access. From then on the
workflow's own `GITHUB_TOKEN` is enough and the PAT is only a fallback.

Free-plan GitHub Packages allows 500 MB of storage and 1 GB of transfer a month for private
packages. These are a few tens of kilobytes each, so that is not a constraint.

### The one thing the first publish will tell you

The manifests' `repository` field points at this repository, in a personal account, while the
packages belong to the organisation. GitHub uses that field to _link_ a package to a repository;
when it cannot, the package is published to the organisation unlinked, which is fine — the
organisation is what grants access.

If a publish is ever refused over that mismatch, there are two ways out and neither touches the
package names: drop the `repository` field from the manifests, or point it at an empty
repository inside the organisation. Run the workflow with the dry-run box ticked first; it packs
everything and checks the entry points without sending anything.

## Cutting a release

Anything that changes a package needs a changeset. Commit it with your change:

```bash
npm run changeset
```

Write the summary for someone upgrading, not for someone reviewing the diff. "Adds a `display`
action for QR payments" is useful. "Refactors runner registry" is not.

Then:

```bash
npm run version   # applies the changesets: bumps versions, writes CHANGELOG.md files
```

`npm run version` also refreshes the lockfile, because the workspace packages reference each
other and their versions move together. Commit the result.

To publish, run the **Release** workflow from the Actions tab. It leaves the `dry-run` box
ticked by default: that packs every package and checks the entry points resolve as published,
without sending anything. Untick it when you actually mean it.

The workflow re-runs the whole verification — format, lint, types, tests, purity, `verify:dist`,
`check:types` — before publishing. A release should not trust a green run from last week.

### Publishing from your machine instead

```bash
export NPM_TOKEN=<the same classic token, with write:packages>
npm run release
```

`.npmrc` reads `NPM_TOKEN`, so nothing else needs configuring — and the token stays in your
shell rather than in a file.

## Installing them in another project

The consumer needs to know where the scope lives, and needs a token to read it. In that
project's `.npmrc`:

```ini
@checkout-kit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

A classic personal access token with **`read:packages`** is enough. Put it in the environment
rather than in the file — `.npmrc` is committed, tokens are not.

```bash
npm install @checkout-kit/core @checkout-kit/runtime-browser @checkout-kit/react @checkout-kit/ui
npm install @checkout-kit/provider-psp
```

## What the versions mean

These packages depend on each other through `peerDependencies`, so a breaking change in
`@checkout-kit/core` is a breaking change for every plugin.

- **major** — the plugin contract changed. A new required field on `PaymentAction`, a changed
  method signature, a removed export. Every plugin has to be updated.
- **minor** — something was added that existing plugins can ignore. A new action kind, a new
  optional field, a new runner.
- **patch** — a fix that does not change the contract.

The conformance suite is the test of this: if a change makes an existing plugin fail it, the
change is a major.

## If you ever go public

Two things would have to be true first, and neither is today:

1. **At least one plugin has taken a real payment**, against a provider's sandbox at minimum.
   Publishing them publicly as integrations would promise something that does not exist.
2. **The `@checkout-kit` scope is claimed on npmjs.com.** It was unclaimed at the time of
   writing; claiming it early costs nothing and stops someone else taking the name.

Then, per package: change `publishConfig.access` to `public` and drop
`publishConfig.registry`, remove the `@checkout-kit:registry` line from `.npmrc`, and set
`access` back to `public` in `.changeset/config.json`. The package names do not change, so
nothing downstream breaks.
