// Generates the API reference from the packages' built declarations.
//
// Two things drive the shape of this.
//
// It reads `dist/*.d.mts` rather than `src`, because TypeDoc links against the TypeScript
// compiler API and this repository is on TypeScript 7, which does not expose one yet. The docs
// workspace pins its own typescript@6 for that reason. Reading the declarations also means the
// reference documents exactly the surface a consumer installs.
//
// It runs one TypeDoc program per package, not one over all of them. Every provider plugin
// carries `declare module '@checkout-kit/core' { interface ProviderConfigRegistry { ... } }` in
// its declarations; merged into a single program, that registry would render with six entries
// no real consumer ever has.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const out = join(here, 'api')

// TypeDoc treats entry points as globs, and a Windows backslash reads as an escape there.
const posix = (value) => value.split(sep).join('/')

/** Grouped the way someone reads them, not alphabetically. */
const GROUPS = [
  {
    title: 'The checkout',
    blurb: 'What an application integrating the checkout imports.',
    packages: ['core', 'react', 'ui', 'runtime-browser'],
  },
  {
    title: 'Payment plugins',
    blurb:
      'One package per integration shape. Each is a reference implementation against the mock backend - none has taken a real payment.',
    packages: [
      'provider-psp',
      'provider-acquiring',
      'provider-hpp',
      'provider-hosted-fields',
      'provider-wallet',
      'provider-bank-transfer',
    ],
  },
  {
    title: 'Native apps',
    blurb: 'The contract a React Native app talks to a hosted checkout through.',
    packages: ['webview-bridge'],
  },
  {
    title: 'For plugin authors',
    blurb:
      'Not needed to integrate the checkout - these are what you test a plugin of your own against.',
    packages: ['testing', 'conformance'],
  },
]

const ALL = GROUPS.flatMap((group) => group.packages)

const missing = ALL.filter((name) => !existsSync(join(root, 'packages', name, 'dist/index.d.mts')))
if (missing.length > 0) {
  console.error(
    `No declarations for: ${missing.join(', ')}.\nRun \`npm run build:packages\` first - the reference is generated from dist, not from src.`,
  )
  process.exit(1)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

for (const name of ALL) {
  const result = spawnSync(
    process.execPath,
    [
      join(here, 'node_modules/typedoc/bin/typedoc'),
      '--options',
      join(here, 'typedoc.json'),
      '--entryPoints',
      posix(join(root, 'packages', name, 'dist/index.d.mts')),
      '--out',
      join(out, name),
      '--name',
      `@checkout-kit/${name}`,
    ],
    { cwd: here, stdio: 'inherit' },
  )

  if (result.status !== 0) {
    console.error(`\nTypeDoc failed for @checkout-kit/${name}.`)
    process.exit(result.status ?? 1)
  }
}

const index = [
  '# API reference',
  '',
  'Generated from the packages’ published type declarations, so this is exactly the surface you',
  'get when you install one. It is a lookup table: the *why* lives in the guides, and each package',
  'below links to the one that explains it.',
  '',
  '::: tip Only in English',
  'The guides are kept as English and Russian pairs. This reference is generated from the source',
  'and is English only - a half-translated API reference would be worse than an honest monolingual',
  'one. / Справочник генерируется из исходников и существует только на английском.',
  ':::',
  '',
  ...GROUPS.flatMap((group) => [
    `## ${group.title}`,
    '',
    group.blurb,
    '',
    ...group.packages.map((name) => `- [\`@checkout-kit/${name}\`](./${name}/)`),
    '',
  ]),
  '## Two things the generator cannot show you',
  '',
  '**`ProviderConfigRegistry` looks empty, and `KnownProviderId` looks like `never`.** They are:',
  'the interface ships empty on purpose and each plugin augments it, so a host gets its provider id',
  'and config checked without importing the plugin. See',
  '[Writing a payment plugin](../plugin-authoring.md#registering-it).',
  '',
  '**Branded types cannot be constructed from what you see here.** `CardNumber` is',
  '`Branded<string, "CardNumber">`, and the brand is a non-exported unique symbol. Build one with',
  '`createBranded`, which is the only way in. See [Architecture](../architecture.md).',
  '',
].join('\n')

writeFileSync(join(out, 'index.md'), `${index}\n`, 'utf8')

console.log(`\nAPI reference written to docs/api for ${ALL.length} packages.`)
