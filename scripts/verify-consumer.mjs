// No workspace links, source condition, or access to this repo's node_modules.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
import { CheckoutProvider, useCheckout } from '@checkout-kit/react'
import { Button, Money } from '@checkout-kit/ui'
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
function Checkout() { const { phase } = useCheckout(); return <Button><Money amount={2500} currency="USD" />{phase}</Button> }
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
import { Money } from '@checkout-kit/ui'
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
  rmSync(consumer, { recursive: true, force: true })
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
