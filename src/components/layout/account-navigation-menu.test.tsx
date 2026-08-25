import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ pathname: '/aanbiedersdossier/professionals' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}))

vi.mock('@/components/auth/logout-button', () => ({
  LogoutButton: ({ className }: { className?: string }) => <button className={className}>Uitloggen</button>,
}))

import { AccountNavigationMenu } from './account-navigation-menu'

const groups = [
  { key: 'work', label: 'Werk', links: [{ href: '/dashboard', label: 'Dashboard' }] },
  {
    key: 'organization',
    label: 'Organisatie',
    links: [
      { href: '/organisatie', label: 'Organisatie' },
      { href: '/aanbiedersdossier', label: 'Dienstverlenersprofiel' },
      { href: '/aanbiedersdossier/professionals', label: 'Professionals' },
    ],
  },
  { key: 'personal', label: 'Persoonlijk', links: [{ href: '/account', label: 'Account' }] },
] as const

describe('accountzijbalknavigatie', () => {
  it('opent de actieve groep en markeert de meest specifieke route', () => {
    const html = renderToStaticMarkup(<AccountNavigationMenu groups={groups} />)
    expect(html.match(/open=""/g)).toHaveLength(1)
    expect(html).toMatch(/aria-current="page"[^>]*href="\/aanbiedersdossier\/professionals"/)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toContain('Uitloggen')
  })

  it('wisselt de groepskleuren A-B-A af', () => {
    const html = renderToStaticMarkup(<AccountNavigationMenu groups={groups} />)
    const summaries = [...html.matchAll(/<summary class="([^"]+)"/g)].map((match) => match[1])

    expect(summaries).toHaveLength(3)
    expect(summaries[0]).toContain('border-sky-200 bg-sky-50')
    expect(summaries[1]).toContain('border-slate-200 bg-slate-50')
    expect(summaries[2]).toContain('border-sky-200 bg-sky-50')
  })
})
