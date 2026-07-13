import { randomUUID } from 'node:crypto'
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getOrganizationLogoPublicUrl, isValidLogoStorageKey } from './logo-url'
import { logLogoDevelopment, logoErrorDetails } from './logo-development-log'

export interface OrganizationLogoStorage {
  save(data: Buffer): Promise<string>
  delete(storageKey: string): Promise<void>
  read(storageKey: string): Promise<Buffer | null>
  getPublicUrl(storageKey: string): string
}

export class LogoStorageConfigurationError extends Error {
  constructor() {
    super('Organisatielogo-opslag is niet geconfigureerd voor deze omgeving.')
    this.name = 'LogoStorageConfigurationError'
  }
}

function assertStorageKey(storageKey: string): void {
  if (!isValidLogoStorageKey(storageKey)) throw new Error('Ongeldige logo-opslagsleutel.')
}

export class LocalOrganizationLogoStorage implements OrganizationLogoStorage {
  private readonly baseDirectory: string

  constructor(baseDirectory = path.resolve(process.cwd(), '.local-storage', 'organization-logos')) {
    this.baseDirectory = path.resolve(baseDirectory)
  }

  async save(data: Buffer): Promise<string> {
    const storageKey = `${randomUUID()}.webp`
    logLogoDevelopment('storage', 'storage-key-generated', { storageKey })

    try {
      await mkdir(this.baseDirectory, { recursive: true })
      const directory = await stat(this.baseDirectory)
      logLogoDevelopment('storage', 'target-directory-checked', { exists: directory.isDirectory() })
      await writeFile(this.resolve(storageKey), data, { flag: 'wx' })
      logLogoDevelopment('storage', 'write-succeeded', { storageKey, sizeBytes: data.length })
      return storageKey
    } catch (error) {
      logLogoDevelopment('storage', 'write-failed', { storageKey, ...logoErrorDetails(error) })
      throw error
    }
  }

  async delete(storageKey: string): Promise<void> {
    assertStorageKey(storageKey)
    try {
      await unlink(this.resolve(storageKey))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  async read(storageKey: string): Promise<Buffer | null> {
    assertStorageKey(storageKey)
    try {
      return await readFile(this.resolve(storageKey))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  getPublicUrl(storageKey: string): string {
    return getOrganizationLogoPublicUrl(storageKey)
  }

  private resolve(storageKey: string): string {
    assertStorageKey(storageKey)
    const resolved = path.resolve(this.baseDirectory, storageKey)
    if (path.dirname(resolved) !== this.baseDirectory) throw new Error('Ongeldige logo-opslagsleutel.')
    return resolved
  }
}

export function getOrganizationLogoStorage(): OrganizationLogoStorage {
  const provider = process.env.ORGANIZATION_LOGO_STORAGE
  if (process.env.NODE_ENV !== 'production' && (provider === undefined || provider === '' || provider === 'local')) {
    return new LocalOrganizationLogoStorage()
  }

  console.error('Organisatielogo-opslag ontbreekt voor de huidige omgeving.')
  throw new LogoStorageConfigurationError()
}
