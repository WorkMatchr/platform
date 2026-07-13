'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'
import { ACTIVE_ORGANIZATION_COOKIE, requireManageableOrganization } from '@/lib/organizations/organization-authorization'
import { removeOrganizationLogo, replaceOrganizationLogo } from '@/lib/organizations/logo-service'
import { logLogoDevelopment, logoErrorDetails } from '@/lib/organizations/logo-development-log'
import { createOrganization, OrganizationServiceError, updateOrganization } from '@/lib/organizations/organization-service'
import { createOrganizationSchema, organizationFormData, organizationProfileSchema, type OrganizationFormValues } from '@/lib/organizations/organization-validation'

export type OrganizationActionState = {
  message?: string
  success?: boolean
  errors?: Record<string, string[] | undefined>
  values?: OrganizationFormValues
}

const activeOrganizationCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
}

export async function createOrganizationAction(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const user = await requireUser()
  const values = organizationFormData(formData)
  const parsed = createOrganizationSchema.safeParse(values)
  if (!parsed.success) return { message: 'Controleer de gemarkeerde velden.', errors: parsed.error.flatten().fieldErrors, values }

  let organizationId: string
  try {
    organizationId = (await createOrganization(user.id, parsed.data)).id
  } catch (error) {
    return { message: error instanceof OrganizationServiceError ? error.message : 'De organisatie kon niet worden aangemaakt.', values }
  }

  ;(await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, activeOrganizationCookieOptions)
  redirect('/organisatie?aangemaakt=1')
}

export async function updateOrganizationAction(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const organizationId = String(formData.get('organizationId') ?? '')
  const context = await requireManageableOrganization(organizationId)
  const values = organizationFormData(formData)
  const parsed = organizationProfileSchema.safeParse(values)
  if (!parsed.success) return { message: 'Controleer de gemarkeerde velden.', errors: parsed.error.flatten().fieldErrors, values }

  try {
    await updateOrganization(context.user.id, organizationId, parsed.data)
  } catch (error) {
    return { message: error instanceof OrganizationServiceError ? error.message : 'De wijzigingen konden niet worden opgeslagen.', values }
  }

  revalidatePath('/organisatie')
  redirect('/organisatie?gewijzigd=1')
}

export async function switchOrganizationAction(formData: FormData) {
  const user = await requireUser()
  const organizationId = String(formData.get('organizationId') ?? '')
  const membership = await getPrisma().organizationMembership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    include: { organization: { select: { status: true } } },
  })
  if (!membership || membership.status !== 'ACTIVE' || membership.organization.status === 'ARCHIVED') {
    redirect('/organisatie?toegang=geweigerd')
  }
  ;(await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, activeOrganizationCookieOptions)
  redirect('/organisatie')
}

export async function uploadOrganizationLogoAction(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const organizationId = String(formData.get('organizationId') ?? '')
  const context = await requireManageableOrganization(organizationId)
  const file = formData.get('logo')
  if (!(file instanceof File)) return { message: 'Selecteer een logo.' }

  logLogoDevelopment('upload', 'received', {
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  })

  try {
    await replaceOrganizationLogo(context.user.id, organizationId, file)
    revalidatePath('/organisatie')
    revalidatePath('/organisatie/profiel')
    return { message: 'Het logo is opgeslagen.', success: true }
  } catch (error) {
    logLogoDevelopment('upload', 'failed', logoErrorDetails(error))
    return { message: 'Het logo kon niet veilig worden opgeslagen.' }
  }
}

export async function removeOrganizationLogoAction(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const organizationId = String(formData.get('organizationId') ?? '')
  const context = await requireManageableOrganization(organizationId)
  try {
    await removeOrganizationLogo(context.user.id, organizationId)
    revalidatePath('/organisatie')
    revalidatePath('/organisatie/profiel')
    return { message: 'Het logo is verwijderd.', success: true }
  } catch {
    return { message: 'Het logo kon niet veilig worden verwijderd.' }
  }
}
