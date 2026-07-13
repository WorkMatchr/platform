import Image from 'next/image'
import { getOrganizationLogoPublicUrl } from '@/lib/organizations/logo-url'

type OrganizationLogoProps = {
  name: string
  storageKey?: string | null
  width?: number | null
  height?: number | null
  size?: 'small' | 'large'
}

export function OrganizationLogo({ name, storageKey, width, height, size = 'large' }: OrganizationLogoProps) {
  const className = size === 'large' ? 'size-24 sm:size-28' : 'size-12'
  if (!storageKey) {
    return <div aria-label={`Geen logo ingesteld voor ${name}`} className={`${className} flex shrink-0 items-center justify-center rounded-card border border-border bg-surface-subtle text-xl font-bold text-brand-primary`}>{name.slice(0, 2).toUpperCase()}</div>
  }
  return <Image src={getOrganizationLogoPublicUrl(storageKey)} alt={`Logo van ${name}`} width={width ?? 256} height={height ?? 256} className={`${className} rounded-card border border-border bg-surface object-contain p-2`} unoptimized />
}
