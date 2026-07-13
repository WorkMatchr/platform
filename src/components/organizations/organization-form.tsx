'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { OrganizationType } from '@/generated/prisma/client'
import type { OrganizationActionState } from '@/app/organisatie/actions'
import type { OrganizationFormValues } from '@/lib/organizations/organization-validation'
import { Button } from '@/components/ui/button'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'

type SectorOption = { id: string; name: string }
type InitialOrganizationValues = {
  id?: string
  name?: string
  tradeName?: string | null
  organizationType?: OrganizationType
  chamberOfCommerceNumber?: string | null
  generalEmail?: string | null
  phone?: string | null
  website?: string | null
  employeeCount?: number | null
  sectorIds?: string[]
  primarySectorId?: string
  addressLine?: string
  postalCode?: string
  city?: string
  province?: string | null
  countryCode?: string
}

type OrganizationFormProps = {
  action: (state: OrganizationActionState, formData: FormData) => Promise<OrganizationActionState>
  initialValues?: InitialOrganizationValues
  mode: 'create' | 'edit'
  sectors: SectorOption[]
}

const organizationTypes = [
  { value: 'CLIENT', label: 'Opdrachtgever' },
  { value: 'PROVIDER', label: 'Aanbieder' },
  { value: 'BOTH', label: 'Opdrachtgever en aanbieder' },
] as const

export function OrganizationForm({ action, initialValues = {}, mode, sectors }: OrganizationFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const submittedValues = state.values
  const error = (field: string) => state.errors?.[field]?.[0]
  const isInvalid = (field: string) => Boolean(error(field))
  const describedBy = (field: string) => (isInvalid(field) ? `${field}-error` : undefined)
  const inputClassName = (field: string) =>
    `${fieldClassName}${isInvalid(field) ? ' border-error ring-1 ring-error/30 focus:border-error focus:ring-error/30' : ''}`
  const optionClassName = (field: string) =>
    `flex min-h-11 items-center gap-3 rounded-control border bg-surface px-3 py-2${isInvalid(field) ? ' border-error ring-1 ring-error/30' : ' border-border'}`
  const value = (field: keyof OrganizationFormValues, fallback = '') => {
    if (!submittedValues) return fallback
    const submittedValue = submittedValues[field]
    return typeof submittedValue === 'string' ? submittedValue : fallback
  }
  const selectedSectorIds = new Set(submittedValues?.sectorIds ?? initialValues.sectorIds)
  const selectedOrganizationType = value('organizationType', initialValues.organizationType ?? 'CLIENT')
  const formKey = submittedValues ? JSON.stringify(submittedValues) : 'initial'

  useEffect(() => {
    if (!state.errors) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus()
  }, [state.errors, state.values])

  return (
    <form ref={formRef} key={formKey} action={formAction} className="space-y-9" noValidate>
      {initialValues.id && <input type="hidden" name="organizationId" value={initialValues.id} />}
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}

      <fieldset className="space-y-5">
        <legend className="text-lg font-bold text-brand-dark">Organisatie</legend>
        <div>
          <label htmlFor="name" className="font-semibold">Officiële organisatienaam <span aria-hidden="true">*</span></label>
          <input id="name" name="name" required minLength={2} maxLength={160} defaultValue={value('name', initialValues.name)} className={inputClassName('name')} aria-invalid={isInvalid('name')} aria-describedby={describedBy('name')} />
          <FieldError id="name-error" message={error('name')} />
        </div>
        <div>
          <label htmlFor="tradeName" className="font-semibold">Handelsnaam <span className="font-normal text-text-secondary">(optioneel)</span></label>
          <input id="tradeName" name="tradeName" maxLength={160} defaultValue={value('tradeName', initialValues.tradeName ?? '')} className={inputClassName('tradeName')} aria-invalid={isInvalid('tradeName')} aria-describedby={describedBy('tradeName')} />
          <FieldError id="tradeName-error" message={error('tradeName')} />
        </div>
        {mode === 'create' ? (
          <fieldset>
            <legend className="font-semibold">Organisatietype <span aria-hidden="true">*</span></legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {organizationTypes.map((type) => (
                <label key={type.value} className={`${optionClassName('organizationType')} cursor-pointer`}>
                  <input type="radio" name="organizationType" value={type.value} defaultChecked={selectedOrganizationType === type.value} data-invalid={isInvalid('organizationType')} aria-describedby={describedBy('organizationType')} />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
            <FieldError id="organizationType-error" message={error('organizationType')} />
          </fieldset>
        ) : (
          <div>
            <p className="font-semibold">Organisatietype</p>
            <p className="mt-2 text-text-secondary">{organizationTypes.find((type) => type.value === initialValues.organizationType)?.label}</p>
            <p className="mt-1 text-sm text-text-secondary">Het type kan in deze versie alleen door toekomstig beheer worden gewijzigd.</p>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-bold text-brand-dark">Zakelijke contactgegevens</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="chamberOfCommerceNumber" className="font-semibold">KvK-nummer <span className="font-normal text-text-secondary">(optioneel)</span></label><input id="chamberOfCommerceNumber" name="chamberOfCommerceNumber" maxLength={32} defaultValue={value('chamberOfCommerceNumber', initialValues.chamberOfCommerceNumber ?? '')} className={inputClassName('chamberOfCommerceNumber')} aria-invalid={isInvalid('chamberOfCommerceNumber')} aria-describedby={describedBy('chamberOfCommerceNumber')} /><FieldError id="chamberOfCommerceNumber-error" message={error('chamberOfCommerceNumber')} /></div>
          <div><label htmlFor="employeeCount" className="font-semibold">Aantal medewerkers <span className="font-normal text-text-secondary">(optioneel)</span></label><input id="employeeCount" name="employeeCount" type="number" min="0" step="1" defaultValue={value('employeeCount', initialValues.employeeCount?.toString() ?? '')} className={inputClassName('employeeCount')} aria-invalid={isInvalid('employeeCount')} aria-describedby={describedBy('employeeCount')} /><FieldError id="employeeCount-error" message={error('employeeCount')} /></div>
          <div><label htmlFor="generalEmail" className="font-semibold">Algemeen e-mailadres <span className="font-normal text-text-secondary">(optioneel)</span></label><input id="generalEmail" name="generalEmail" type="email" maxLength={254} defaultValue={value('generalEmail', initialValues.generalEmail ?? '')} className={inputClassName('generalEmail')} aria-invalid={isInvalid('generalEmail')} aria-describedby={describedBy('generalEmail')} /><FieldError id="generalEmail-error" message={error('generalEmail')} /></div>
          <div><label htmlFor="phone" className="font-semibold">Telefoonnummer <span className="font-normal text-text-secondary">(optioneel)</span></label><input id="phone" name="phone" type="tel" maxLength={32} defaultValue={value('phone', initialValues.phone ?? '')} className={inputClassName('phone')} aria-invalid={isInvalid('phone')} aria-describedby={describedBy('phone')} /><FieldError id="phone-error" message={error('phone')} /></div>
        </div>
        <div><label htmlFor="website" className="font-semibold">Website <span className="font-normal text-text-secondary">(optioneel)</span></label><input id="website" name="website" type="text" inputMode="url" maxLength={2048} placeholder="www.voorbeeld.nl" defaultValue={value('website', initialValues.website ?? '')} className={inputClassName('website')} aria-invalid={isInvalid('website')} aria-describedby={describedBy('website')} /><FieldError id="website-error" message={error('website')} /></div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-bold text-brand-dark">Sectoren</legend>
        <p className="mt-2 text-sm text-text-secondary">Selecteer minimaal één sector en wijs daarna de primaire sector aan.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {sectors.map((sector) => <label key={sector.id} className={optionClassName('sectorIds')}><input type="checkbox" name="sectorIds" value={sector.id} defaultChecked={selectedSectorIds.has(sector.id)} aria-invalid={isInvalid('sectorIds')} aria-describedby={describedBy('sectorIds')} /><span>{sector.name}</span></label>)}
        </div>
        <FieldError id="sectorIds-error" message={error('sectorIds')} />
        <div className="mt-5"><label htmlFor="primarySectorId" className="font-semibold">Primaire sector <span aria-hidden="true">*</span></label><select id="primarySectorId" name="primarySectorId" required defaultValue={value('primarySectorId', initialValues.primarySectorId ?? '')} className={inputClassName('primarySectorId')} aria-invalid={isInvalid('primarySectorId')} aria-describedby={describedBy('primarySectorId')}><option value="" disabled>Kies een sector</option>{sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select><FieldError id="primarySectorId-error" message={error('primarySectorId')} /></div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-bold text-brand-dark">Primaire locatie</legend>
        <div><label htmlFor="addressLine" className="font-semibold">Adresregel <span aria-hidden="true">*</span></label><input id="addressLine" name="addressLine" required maxLength={200} defaultValue={value('addressLine', initialValues.addressLine)} className={inputClassName('addressLine')} aria-invalid={isInvalid('addressLine')} aria-describedby={describedBy('addressLine')} /><FieldError id="addressLine-error" message={error('addressLine')} /></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label htmlFor="postalCode" className="font-semibold">Postcode <span aria-hidden="true">*</span></label><input id="postalCode" name="postalCode" required maxLength={20} defaultValue={value('postalCode', initialValues.postalCode)} className={inputClassName('postalCode')} aria-invalid={isInvalid('postalCode')} aria-describedby={describedBy('postalCode')} /><FieldError id="postalCode-error" message={error('postalCode')} /></div>
          <div><label htmlFor="city" className="font-semibold">Plaats <span aria-hidden="true">*</span></label><input id="city" name="city" required maxLength={100} defaultValue={value('city', initialValues.city)} className={inputClassName('city')} aria-invalid={isInvalid('city')} aria-describedby={describedBy('city')} /><FieldError id="city-error" message={error('city')} /></div>
          <div><label htmlFor="province" className="font-semibold">Provincie <span className="font-normal text-text-secondary">(optioneel)</span></label><input id="province" name="province" maxLength={100} defaultValue={value('province', initialValues.province ?? '')} className={inputClassName('province')} aria-invalid={isInvalid('province')} aria-describedby={describedBy('province')} /><FieldError id="province-error" message={error('province')} /></div>
          <div><label htmlFor="countryCode" className="font-semibold">Landcode <span aria-hidden="true">*</span></label><input id="countryCode" name="countryCode" required minLength={2} maxLength={2} defaultValue={value('countryCode', initialValues.countryCode ?? 'NL')} className={inputClassName('countryCode')} aria-invalid={isInvalid('countryCode')} aria-describedby={describedBy('countryCode')} /><FieldError id="countryCode-error" message={error('countryCode')} /></div>
        </div>
      </fieldset>

      {mode === 'create' && <div><label className={`flex items-start gap-3 rounded-control${isInvalid('acceptedBusinessAccuracy') ? ' text-error' : ''}`}><input className="mt-1" type="checkbox" name="acceptedBusinessAccuracy" required defaultChecked={value('acceptedBusinessAccuracy') === 'on'} aria-invalid={isInvalid('acceptedBusinessAccuracy')} aria-describedby={describedBy('acceptedBusinessAccuracy')} /><span>Ik bevestig dat deze gegevens zakelijk en correct zijn. <span aria-hidden="true">*</span></span></label><FieldError id="acceptedBusinessAccuracy-error" message={error('acceptedBusinessAccuracy')} /></div>}
      <Button type="submit" loading={pending} className="w-full sm:w-auto">{mode === 'create' ? 'Organisatie aanmaken' : 'Wijzigingen opslaan'}</Button>
    </form>
  )
}
