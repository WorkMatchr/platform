import { getPrisma } from '@/lib/prisma'
import { canManageOrganization } from './organization-policy'
import { getOrganizationLogoStorage } from './logo-storage'
import { processOrganizationLogo } from './logo-processing'
import { logLogoDevelopment, logoErrorDetails } from './logo-development-log'

async function requireLogoManager(userId: string, organizationId: string) {
  const membership = await getPrisma().organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    include: { organization: true },
  })
  if (!membership || !canManageOrganization(membership.role, membership.status, membership.organization.status)) {
    throw new Error('U heeft geen toegang tot deze organisatieactie.')
  }
  return membership.organization
}

export async function replaceOrganizationLogo(userId: string, organizationId: string, file: File) {
  const organization = await requireLogoManager(userId, organizationId)
  const processed = await processOrganizationLogo(Buffer.from(await file.arrayBuffer()), file.type)
  const storage = getOrganizationLogoStorage()
  const newStorageKey = await storage.save(processed.data)

  try {
    await getPrisma().organization.update({
      where: { id: organizationId },
      data: {
        logoStorageKey: newStorageKey,
        logoMimeType: processed.mimeType,
        logoSizeBytes: processed.sizeBytes,
        logoWidth: processed.width,
        logoHeight: processed.height,
        logoUpdatedAt: new Date(),
      },
    })
    logLogoDevelopment('database', 'metadata-update-succeeded')
  } catch (error) {
    logLogoDevelopment('database', 'metadata-update-failed', logoErrorDetails(error))
    try {
      await storage.delete(newStorageKey)
    } catch (cleanupError) {
      logLogoDevelopment('storage', 'rollback-delete-failed', {
        storageKey: newStorageKey,
        ...logoErrorDetails(cleanupError),
      })
    }
    throw error
  }

  if (organization.logoStorageKey) {
    try {
      await storage.delete(organization.logoStorageKey)
    } catch {
      console.error('Een vervangen organisatielogo wacht op opruiming.', { storageKey: organization.logoStorageKey })
    }
  }
}

export async function removeOrganizationLogo(userId: string, organizationId: string) {
  const organization = await requireLogoManager(userId, organizationId)
  if (!organization.logoStorageKey) return

  await getPrisma().organization.update({
    where: { id: organizationId },
    data: {
      logoStorageKey: null,
      logoMimeType: null,
      logoSizeBytes: null,
      logoWidth: null,
      logoHeight: null,
      logoUpdatedAt: null,
    },
  })

  try {
    await getOrganizationLogoStorage().delete(organization.logoStorageKey)
  } catch {
    console.error('Een verwijderd organisatielogo wacht op opruiming.', { storageKey: organization.logoStorageKey })
  }
}
