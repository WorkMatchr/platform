'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/authorization'
import { requireManageableOrganization } from '@/lib/organizations/organization-authorization'
import { removeOrganizationLogo, replaceOrganizationLogo } from '@/lib/organizations/logo-service'
import { logLogoDevelopment, logoErrorDetails } from '@/lib/organizations/logo-development-log'
import { createOrganization, OrganizationServiceError, updateOrganization } from '@/lib/organizations/organization-service'
import { createOrganizationSchema, organizationFormData, organizationProfileSchema, type OrganizationFormValues } from '@/lib/organizations/organization-validation'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

export type OrganizationActionState = {
  message?: string
  success?: boolean
  errors?: Record<string, string[] | undefined>
  values?: OrganizationFormValues
}

export async function createOrganizationAction(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const user = await requireUser()
  const values = organizationFormData(formData)
  const parsed = createOrganizationSchema.safeParse(values)
  if (!parsed.success) return { message: 'Controleer de gemarkeerde velden.', errors: parsed.error.flatten().fieldErrors, values }

  try {
    await createOrganization(user.id, parsed.data)
  } catch (error) {
    return { message: error instanceof OrganizationServiceError ? error.message : 'De organisatie kon niet worden aangemaakt.', values }
  }

  revalidatePath('/', 'layout')
  redirect(getSafeReturnUrl(String(formData.get('returnTo') ?? ''), '/organisatie?aangemaakt=1'))
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
