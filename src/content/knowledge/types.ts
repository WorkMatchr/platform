import type { InternalHref } from '@/content/public-homepage'

export type PublicCallToActionContent = {
  title: string
  description: string
  primary: { label: string; href: InternalHref }
  secondary?: { label: string; href: InternalHref }
}
