// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const route = vi.hoisted(() => ({ pathname: '/e-learning/rie-in-de-praktijk' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
import { PublicNavigation } from './public-navigation'

afterEach(cleanup)

describe('publieke navigatie-interactie', () => {
  it('opent een productgroep, markeert E-learning en herstelt focus met Escape', async () => {
    render(<PublicNavigation />)
    const button = screen.getByRole('button', { name: 'WorkMatchr — Actuele sectie' })
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    const link = screen.getByRole('link', { name: /E-learning Online/ })
    expect(link.getAttribute('aria-current')).toBe('page')
    link.focus()
    fireEvent.keyDown(link, { key: 'Escape' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await waitFor(() => expect(document.activeElement).toBe(button))
  })

  it('sluit een dropdown wanneer Tab-focus de groep verlaat', () => {
    render(<PublicNavigation />)
    const products = screen.getByRole('button', { name: 'WorkMatchr — Actuele sectie' })
    fireEvent.click(products)
    fireEvent.blur(products, { relatedTarget: screen.getByRole('link', { name: 'Inloggen' }) })
    expect(products.getAttribute('aria-expanded')).toBe('false')
  })

  it('behoudt twee gelabelde mobiele groepen en houdt inloggen afzonderlijk', () => {
    render(<PublicNavigation />)
    const button = screen.getByRole('button', { name: 'Hoofdnavigatie openen of sluiten' })
    fireEvent.click(button)
    const nav = screen.getByRole('navigation', { name: 'Mobiele hoofdnavigatie' })
    const professionals = within(nav).getByRole('region', { name: 'Professionals & opdrachtgevers' })
    const products = within(nav).getByRole('region', { name: 'WorkMatchr' })
    expect(within(professionals).getByRole('link', { name: /^Diensten/ }).getAttribute('href')).toBe('/diensten')
    expect(within(products).getByRole('link', { name: /^Arbo Compliance Check/ }).getAttribute('href')).toBe('/wijzers/compliance')
    expect(within(nav).queryByRole('link', { name: 'Inloggen' })).toBeNull()
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('sluit bij een routewisseling en kiest de meest specifieke productlink', () => {
    const view = render(<PublicNavigation />)
    fireEvent.click(screen.getByRole('button', { name: 'WorkMatchr — Actuele sectie' }))
    route.pathname = '/wijzers/compliance'
    view.rerender(<PublicNavigation />)
    const button = screen.getByRole('button', { name: 'WorkMatchr — Actuele sectie' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(button)
    expect(screen.getByRole('link', { name: /^Arbo Compliance Check/ }).getAttribute('aria-current')).toBe('page')
    expect(within(screen.getByRole('navigation', { name: 'Hoofdnavigatie' })).getAllByRole('link').filter(link => link.hasAttribute('aria-current'))).toHaveLength(1)
    route.pathname = '/e-learning/rie-in-de-praktijk'
  })
})