'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function ApplicationChrome({
  banner,
  children,
  footer,
  header,
}: {
  banner: ReactNode
  children: ReactNode
  footer: ReactNode
  header: ReactNode
}) {
  const pathname = usePathname()
  const usesPlatformChrome =
    pathname === '/platformbeheer' || pathname.startsWith('/platformbeheer/')

  return (
    <div
      className={
        usesPlatformChrome
          ? 'flex min-h-screen flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden'
          : 'flex min-h-screen flex-col'
      }
    >
      {usesPlatformChrome ? null : header}
      {usesPlatformChrome ? <div className="shrink-0">{banner}</div> : banner}
      <main
        id="main-content"
        className={usesPlatformChrome ? 'flex-1 lg:min-h-0 lg:overflow-hidden' : 'flex-1'}
      >
        {children}
      </main>
      {usesPlatformChrome ? null : footer}
    </div>
  )
}
