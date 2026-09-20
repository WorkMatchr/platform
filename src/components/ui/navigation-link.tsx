'use client'

import Link, { useLinkStatus } from 'next/link'
import type { ComponentProps } from 'react'
import { NavigationPending } from './navigation-feedback'

function LinkPending() {
  const { pending } = useLinkStatus()
  return <NavigationPending pending={pending} />
}

export default function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<LinkPending /></Link>
}
