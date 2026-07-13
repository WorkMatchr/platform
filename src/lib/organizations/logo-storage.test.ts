import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOrganizationLogoStorage, LocalOrganizationLogoStorage, LogoStorageConfigurationError } from './logo-storage'
import { isValidLogoStorageKey } from './logo-url'

const tempDirectories: string[] = []

afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('lokale logo-opslag', () => {
  it('gebruikt willekeurige geldige keys en kan opslaan, lezen en verwijderen', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'workmatchr-logo-'))
    tempDirectories.push(directory)
    const storage = new LocalOrganizationLogoStorage(directory)
    const key = await storage.save(Buffer.from('webp-test'))
    expect(isValidLogoStorageKey(key)).toBe(true)
    expect((await storage.read(key))?.toString()).toBe('webp-test')
    await storage.delete(key)
    expect(await storage.read(key)).toBeNull()
  })

  it.each(['../secret.webp', '..\\secret.webp', 'logo.webp', '/absolute.webp'])('blokkeert traversal of niet-willekeurige key %s', (key) => {
    expect(isValidLogoStorageKey(key)).toBe(false)
  })

  it('weigert productie zonder geconfigureerde provider veilig', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ORGANIZATION_LOGO_STORAGE', '')
    expect(() => getOrganizationLogoStorage()).toThrow(LogoStorageConfigurationError)
  })
})
