'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WorkMatchrLogo } from '@/components/branding/workmatchr-logo'

export function HeaderBrandLink() {
  const pathname = usePathname()

  return (
    <Link
      href="/"
      className="inline-flex min-h-11 shrink-0 items-center rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      aria-label="WorkMatchr, naar de homepage"
    >
      <WorkMatchrLogo size={pathname === '/' ? 'homepageHeader' : 'header'} priority />
    </Link>
  )
}
