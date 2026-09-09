# Releasing

These packages are published **privately**, to GitHub Packages, under the `@checkout-kit` scope.
Only accounts with read access to this repository can install them. Nothing goes to npmjs.com.

That is deliberate for now. All six plugins are written against a mock backend and **none of
them has taken a real payment**, so they are not something to hand strangers. Publishing
privately means they can be installed rather than copied between projects, which is the only
thing that was missing.

## Before the first release

The scope has to belong to the account that owns the repository — that is how GitHub Packages
decides who may publish. So, once:

1. **Create a GitHub organisation named `checkout-kit`.** Free. This is what makes the
   `@checkout-kit/*` names work without renaming anything.
2. **Transfer this repository into it.** Settings → General → Transfer ownership. GitHub keeps
   redirecting the old URL, so existing clones and links carry on working.
3. Check that Pages is still enabled afterwards. The documentation site moves to
   `https://checkout-kit.github.io/checkout-kit/`, which is the URL the docs and the README
   already point at.

Everything in the repository is already set up for it: the manifests carry
`publishConfig.registry` and `access: restricted`, and `.npmrc` sends the `@checkout-kit` scope
to GitHub Packages and nothing else.

Free-plan GitHub Packages allows 500 MB of storage and 1 GB of transfer a month for private
packages. These are a few tens of kilobytes each, so that is not a constraint.

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
export NPM_TOKEN=<a personal access token with write:packages>
npm run release
```

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
