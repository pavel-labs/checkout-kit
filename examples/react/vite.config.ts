import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defaultClientConditions, defineConfig } from 'vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    // Without this the example resolves the workspace packages through their `default`
    // export condition - that is, whatever was last built into dist - and silently runs
    // against a stale copy of the kit. The demo app resolves the same way.
    conditions: ['@checkout-kit/source', ...defaultClientConditions],
  },
})
