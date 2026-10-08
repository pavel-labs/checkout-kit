import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

// Start Node processes directly so a signal does not leave npm's grandchildren running.
const require = createRequire(import.meta.url)
const exampleRoot = resolve('examples')
const vite = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js')
const children = []
let stopping = false
const stop = (code) => {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) child.kill('SIGTERM')
}
const run = (args, env = {}) => {
  const child = spawn(process.execPath, args, {
    cwd: exampleRoot,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  children.push(child)
  child.on('error', (error) => {
    console.error(error.message)
    stop(1)
  })
  child.on('exit', (code) => stop(code ?? 1))
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
run(['--import', 'tsx', 'server/index.ts', '--mock'], {
  PORT: '4000',
  CHECKOUT_ORIGIN: 'http://localhost:5173',
  CHECKOUT_RETURN_URL: 'http://localhost:5173/payment/return',
})
run([vite, '--config', 'react/vite.config.ts', '--port', '5173', '--strictPort'], {
  VITE_REAL_PROVIDER_API_BASE_URL: 'http://localhost:4000',
  VITE_PROTOCOL_SIMULATION: '1',
  VITE_STRIPE_PUBLISHABLE_KEY: '',
  VITE_ADYEN_CLIENT_KEY: '',
})
