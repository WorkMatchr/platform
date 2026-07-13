const STORAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i

export function isValidLogoStorageKey(storageKey: string): boolean {
  return STORAGE_KEY_PATTERN.test(storageKey)
}

export function getOrganizationLogoPublicUrl(storageKey: string): string {
  if (!isValidLogoStorageKey(storageKey)) throw new Error('Ongeldige logo-opslagsleutel.')
  return `/media/organization-logos/${storageKey}`
}
