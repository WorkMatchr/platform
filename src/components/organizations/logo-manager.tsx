'use client'

import { useActionState } from 'react'
import { removeOrganizationLogoAction, uploadOrganizationLogoAction } from '@/app/organisatie/actions'
import { Button } from '@/components/ui/button'
import { StatusMessage } from '@/components/auth/auth-shell'
import { OrganizationLogo } from './organization-logo'

type LogoManagerProps = {
  organization: { id: string; name: string; logoStorageKey: string | null; logoWidth: number | null; logoHeight: number | null }
}

export function LogoManager({ organization }: LogoManagerProps) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadOrganizationLogoAction, {})
  const [removeState, removeAction, removePending] = useActionState(removeOrganizationLogoAction, {})
  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
      <OrganizationLogo name={organization.name} storageKey={organization.logoStorageKey} width={organization.logoWidth} height={organization.logoHeight} />
      <div className="space-y-4">
        <div><h2 className="text-lg font-bold text-brand-dark">Organisatielogo</h2><p className="mt-1 text-sm text-text-secondary">PNG, JPG of WebP, maximaal 2 MB. Wij verwerken het bestand veilig naar WebP.</p></div>
        {uploadState.message && <StatusMessage error={!uploadState.success}>{uploadState.message}</StatusMessage>}
        {removeState.message && <StatusMessage error={!removeState.success}>{removeState.message}</StatusMessage>}
        <form action={uploadAction} className="space-y-3">
          <input type="hidden" name="organizationId" value={organization.id} />
          <label htmlFor="logo" className="block font-semibold">Nieuw logo</label>
          <input id="logo" name="logo" type="file" required accept="image/png,image/jpeg,image/webp" className="block w-full rounded-control border border-border bg-surface p-2 text-sm file:mr-3 file:rounded-control file:border-0 file:bg-brand-primary-subtle file:px-3 file:py-2 file:font-semibold file:text-brand-dark" />
          <Button type="submit" loading={uploadPending}>Logo {organization.logoStorageKey ? 'vervangen' : 'uploaden'}</Button>
        </form>
        {organization.logoStorageKey && <form action={removeAction}><input type="hidden" name="organizationId" value={organization.id} /><Button type="submit" variant="outline" loading={removePending}>Logo verwijderen</Button></form>}
      </div>
    </div>
  )
}
