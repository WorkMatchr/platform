import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // node:test suites run separately (scheduler script and recovery CI step).
    exclude: [
      ...configDefaults.exclude,
      'ops/marketplace-notifications/dispatch.test.mjs',
      'ops/recovery/*.test.mjs',
      'scripts/audit-d2c-preflight.test.mjs',
      'scripts/d2c-archive-stage.test.mjs',
    ],
  },
})
