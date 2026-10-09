// No workspace links, source condition, or access to this repo's node_modules.
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const archives = resolve('artifacts/packages')
const packages = JSON.parse(readFileSync(join(archives, 'manifest.json'), 'utf8'))
const consumer = mkdtempSync(join(tmpdir(), 'checkout-kit-consumer-'))
const npmCli = process.env.npm_execpath
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: consumer, stdio: 'inherit' })
  if (result.status !== 0)
    throw new Error(`${command} failed (${result.status}). Consumer: ${consumer}`)
}
writeFileSync(
  join(consumer, 'package.json'),
  JSON.stringify(
    {
      private: true,
      type: 'module',
      dependencies: {
        ...Object.fromEntries(
          packages.map(({ name, filename }) => [name, `file:${join(archives, filename)}`]),
        ),
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        typescript: '~7.0.2',
        msw: '^2.15.0',
        vitest: '^5.0.0',
      },
    },
    null,
    2,
  ),
)
writeFileSync(
  join(consumer, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2023',
        lib: ['ES2023', 'DOM'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        jsx: 'react-jsx',
        noEmit: true,
        skipLibCheck: false,
      },
      include: ['consumer.tsx'],
    },
    null,
    2,
  ),
)
writeFileSync(
  join(consumer, 'consumer.tsx'),
  `
import { createCheckout, createRunnerRegistry, defineProvider } from '@checkout-kit/core'
import { createHttpClient } from '@checkout-kit/core/http'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import { CheckoutProvider, useCheckout, useCheckoutSelector } from '@checkout-kit/react'
import { createBridgeCommand, createCommandScript } from '@checkout-kit/webview-bridge/host'
import { Button, Field, IconButton, Input, InputGroup, Money } from '@checkout-kit/ui'
import type { StripeConfig } from '@checkout-kit/provider-stripe'
import type { AdyenConfig } from '@checkout-kit/provider-adyen'
import type { PayPalConfig } from '@checkout-kit/provider-paypal'
import { renderToString } from 'react-dom/server'
const providers = [
  defineProvider({ id: 'stripe', config: { baseUrl: '/api/stripe' } satisfies StripeConfig, load: () => import('@checkout-kit/provider-stripe') }),
  defineProvider({ id: 'adyen', config: { baseUrl: '/api/adyen' } satisfies AdyenConfig, load: () => import('@checkout-kit/provider-adyen') }),
  defineProvider({ id: 'paypal', config: { baseUrl: '/api' } satisfies PayPalConfig, load: () => import('@checkout-kit/provider-paypal') }),
]
const engine = createCheckout({ providers, runners: createRunnerRegistry(), returnUrl: 'https://merchant.test/payment/return' })
void createHttpClient
void createBrowserRuntime
const cancel = createBridgeCommand('PAYMENT_CANCEL', {}, { sessionId: 'session', id: 'cmd' })
createCommandScript(cancel)
function Selected() { const s = useCheckoutSelector((s) => ({ phase: s.phase }), (a, b) => a.phase === b.phase); return <span>{s.phase}</span> }
void Selected
function Checkout() {
  const { phase } = useCheckout()
  return <><Field label="Email">{(control) => <InputGroup trailing={<IconButton label="Clear email">×</IconButton>}><Input {...control} type="email" /></InputGroup>}</Field><Button><Money amount={2500} currency="USD" />{phase}</Button></>
}
renderToString(<CheckoutProvider engine={engine}><Checkout /></CheckoutProvider>)
`,
)
writeFileSync(
  join(consumer, 'smoke.mjs'),
  `
import assert from 'node:assert/strict'
import { createCheckout, createRunnerRegistry, defineProvider } from '@checkout-kit/core'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { IconButton, Input, InputGroup, Money } from '@checkout-kit/ui'
import { createBridgeCommand, createCommandScript, createCheckoutMessageHandler } from '@checkout-kit/webview-bridge/host'
import { parseBridgeCommand } from '@checkout-kit/webview-bridge/protocol'
const command = createBridgeCommand('PAYMENT_RESUME', { params: { token: 'opaque' } }, { sessionId: 'session', id: 'cmd' })
assert.equal(parseBridgeCommand(command).ok, true)
assert.equal(typeof createCommandScript(command), 'string')
assert.equal(createCheckoutMessageHandler({}).sessionId, null)
const publicPackages = ${JSON.stringify(packages.map(({ name }) => name))}
for (const name of publicPackages) {
  const entry = import.meta.resolve(name)
  assert.ok(entry.includes('/dist/'), name + ' resolves to dist')
  if (name !== '@checkout-kit/conformance') await import(name)
}
for (const entry of ['@checkout-kit/core/http', '@checkout-kit/ui/styles.css', '@checkout-kit/webview-bridge/host']) import.meta.resolve(entry)
const runners = createRunnerRegistry()
for (const kind of ['redirect', 'sdk_handoff']) runners.register({ kind, surfaces: ['top', 'none'], run: async (action) => ({ via: 'aborted', actionId: action.id, reason: 'user' }) })
let posts = 0
const checkout = createCheckout({
  providers: [defineProvider({ id: 'stripe', config: { baseUrl: 'https://merchant.test/stripe' }, load: () => import('@checkout-kit/provider-stripe') })],
  runners, returnUrl: 'https://merchant.test/payment/return', defaultProviderId: 'stripe',
  fetch: async (_url, init) => { if (init.method === 'POST') posts++; return Response.json({ id: 'pi_consumer', amount: 2500, currency: 'usd', status: posts === 1 ? 'requires_payment_method' : 'succeeded' }) },
})
const result = await checkout.pay({ input: { planId: '1id' }, instrument: { kind: 'token', token: 'pm_fixture' }, idempotencyKey: 'consumer' })
assert.equal(result.status, 'succeeded')
assert.equal(posts, 2)
assert.ok(renderToString(createElement(Money, { amount: 2500, currency: 'USD' })).includes('25'))
const inputGroup = renderToString(createElement(InputGroup, {
  trailing: createElement(IconButton, { label: 'Clear email' }, '×'),
}, createElement(Input, { type: 'email', 'aria-label': 'Email' })))
assert.ok(inputGroup.includes('aria-label="Clear email"'))
assert.ok(inputGroup.includes('type="email"'))
console.log('Installed tarballs: Node checkout flow, SSR, exports and strict consumer types passed.')
`,
)
try {
  run(
    npmCli ? process.execPath : 'npm',
    npmCli
      ? [npmCli, 'install', '--ignore-scripts', '--no-audit', '--no-fund']
      : ['install', '--ignore-scripts', '--no-audit', '--no-fund'],
  )
  run(process.execPath, [join(consumer, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'])
  run(process.execPath, ['smoke.mjs'])
  for (const { name, version } of packages) {
    const installed = join(consumer, 'node_modules', name)
    for (const notice of ['LICENSE', 'NOTICE']) {
      assert.equal(
        readFileSync(join(installed, 'dist', notice), 'utf8'),
        readFileSync(notice, 'utf8'),
      )
    }
    assert.ok(readFileSync(join(installed, 'CHANGELOG.md'), 'utf8').includes(`## ${version}`))
  }
  for (const { names, expected, smoke } of [
    {
      names: ['runtime-browser', 'provider-paypal'],
      expected: ['core', 'provider-paypal', 'runtime-browser'],
      smoke: `
import assert from 'node:assert/strict'
import { createCheckout, createRunnerRegistry, defineProvider } from '@checkout-kit/core'
import { createBrowserRuntime } from '@checkout-kit/runtime-browser'
import { payPalProvider } from '@checkout-kit/provider-paypal'
assert.equal(typeof createBrowserRuntime, 'function')
const checkout = createCheckout({ providers: [defineProvider({ id: 'paypal', config: { baseUrl: '/api' }, load: async () => ({ default: payPalProvider }) })], runners: createRunnerRegistry(), returnUrl: 'https://merchant.test/payment/return' })
assert.equal(checkout.getSnapshot().phase, 'idle')
`,
    },
    {
      names: ['provider-paypal', 'react', 'ui'],
      expected: ['core', 'provider-paypal', 'react', 'runtime-browser', 'ui'],
      smoke: `
import assert from 'node:assert/strict'
import { createCheckout, createRunnerRegistry } from '@checkout-kit/core'
import { CheckoutProvider } from '@checkout-kit/react'
import { Money } from '@checkout-kit/ui'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
const engine = createCheckout({ providers: [], runners: createRunnerRegistry(), returnUrl: 'https://merchant.test/payment/return' })
const html = renderToString(createElement(CheckoutProvider, { engine }, createElement(Money, { amount: 2500, currency: 'USD' })))
assert.ok(html.includes('25'))
`,
    },
  ]) {
    const project = mkdtempSync(join(tmpdir(), 'checkout-kit-selection-'))
    try {
      writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({ private: true, type: 'module' }),
      )
      const result = spawnSync(process.execPath, [join(archives, 'install.mjs'), ...names], {
        cwd: project,
        stdio: 'inherit',
        env: {
          ...process.env,
          npm_config_ignore_scripts: 'true',
          npm_config_audit: 'false',
          npm_config_fund: 'false',
        },
      })
      assert.equal(result.status, 0, `Installer failed for ${names.join(', ')}`)
      assert.deepEqual(readdirSync(join(project, 'node_modules/@checkout-kit')).sort(), expected)
      // React DOM is a host dependency, not a checkout-kit peer. Supply the same
      // version as the first consumer so the SSR smoke can resolve it locally.
      if (names.includes('react')) {
        const args = ['install', '--ignore-scripts', '--no-audit', '--no-fund', 'react-dom@^19']
        const installed = spawnSync(
          npmCli ? process.execPath : 'npm',
          npmCli ? [npmCli, ...args] : args,
          { cwd: project, stdio: 'inherit' },
        )
        assert.equal(installed.status, 0)
      }
      writeFileSync(join(project, 'smoke.mjs'), smoke)
      const checked = spawnSync(process.execPath, ['smoke.mjs'], { cwd: project, stdio: 'inherit' })
      assert.equal(checked.status, 0, `Selected package smoke failed: ${names.join(', ')}`)
    } finally {
      rmSync(project, { recursive: true, force: true })
    }
  }
  // Reject a damaged download and an invalid selection before invoking npm.
  const damaged = mkdtempSync(join(tmpdir(), 'checkout-kit-damaged-'))
  try {
    for (const filename of ['manifest.json', 'install.mjs'])
      copyFileSync(join(archives, filename), join(damaged, filename))
    const core = packages.find(({ name }) => name === '@checkout-kit/core')
    writeFileSync(join(damaged, core.filename), 'damaged download')
    for (const [selection, expectedError] of [
      ['core', /Integrity check failed/],
      ['../outside', /Unknown package/],
    ]) {
      const result = spawnSync(process.execPath, [join(damaged, 'install.mjs'), selection], {
        cwd: damaged,
        encoding: 'utf8',
      })
      assert.equal(result.status, 1)
      assert.match(result.stderr, expectedError)
      assert.equal(existsSync(join(damaged, 'package.json')), false)
      assert.equal(existsSync(join(damaged, 'node_modules')), false)
    }
  } finally {
    rmSync(damaged, { recursive: true, force: true })
  }
  console.log(
    'Archive installer: headless and React selections resolve peers; invalid and damaged archives fail before installation.',
  )
  rmSync(consumer, { recursive: true, force: true })
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
