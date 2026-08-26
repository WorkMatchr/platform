import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button, buttonBaseStyles, buttonVariantStyles } from '@/components/ui/button'

describe('Button', () => {
  it('renders a visible destructive action with the shared accessible button contract', () => {
    const html = renderToStaticMarkup(
      <Button variant="destructive">Volledig terugbetalen</Button>,
    )

    expect(buttonVariantStyles.destructive).toContain('bg-error')
    expect(buttonVariantStyles.destructive).toContain('text-text-on-dark')
    expect(buttonVariantStyles.destructive).toContain('hover:bg-error/90')
    expect(buttonBaseStyles).toContain('min-h-11')
    expect(html).toContain('Volledig terugbetalen')
    expect(html).not.toContain('bg-danger')
  })

  it('keeps the destructive disabled state native and visibly muted', () => {
    const html = renderToStaticMarkup(
      <Button disabled variant="destructive">Volledig terugbetalen</Button>,
    )

    expect(buttonBaseStyles).toContain('disabled:opacity-55')
    expect(html).toContain('disabled=""')
  })
})
