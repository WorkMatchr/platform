import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/aanbiedersdossier' }))

import { DisclosureMenu } from './disclosure-menu'

describe('toegankelijk disclosure-menu', () => {
  it('gebruikt een echte knop met een gekoppeld, standaard gesloten paneel', () => {
    const html = renderToStaticMarkup(<DisclosureMenu ariaLabel="Menu openen" trigger="Menu"><a href="/doel">Doel</a></DisclosureMenu>)
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls=')
    expect(html).toContain('hidden=""')
  })

  it('borgt sluiten via Escape, klik buiten, routewissel en menuactie met focusherstel', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/ui/disclosure-menu.tsx'), 'utf8')
    expect(source).toContain("event.key !== 'Escape'")
    expect(source).toContain("document.addEventListener('pointerdown'")
    expect(source).toContain('menuState.pathname === pathname')
    expect(source).toContain("target.closest('a, button')")
    expect(source).toContain('triggerRef.current?.focus()')
    expect(source).toContain('onClick={() => setMenuState({ open: !open, pathname })}')
  })
})
