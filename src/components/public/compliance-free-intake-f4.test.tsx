// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('./use-compliance-draft', () => ({ useComplianceDraft: () => ({ ready: true, completed: true, draft: { questionnaireVersion: '2.0', stepIndex: 5, answers: {} }, resetIndex: 0 }) }))
vi.mock('./compliance-free-intake-v2', () => ({ ComplianceFreeIntakeV2: () => <p>Intakeresultaat</p> }))
import { ComplianceFreeIntake } from './compliance-free-intake'
afterEach(cleanup)
it('houdt de bestaande gratis intake en F4 standaard gescheiden', () => {
  render(<ComplianceFreeIntake />)
  expect(screen.getByText('Intakeresultaat')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Ga naar uw scanomgeving' })).toBeNull()
})
it('biedt uitsluitend na de featuregate een overgang zonder antwoordovername of prijsbelofte', () => {
  render(<ComplianceFreeIntake f4Available />)
  expect(screen.getByRole('link', { name: 'Ga naar uw scanomgeving' }).getAttribute('href')).toBe('/wijzers/compliance/v2')
  expect(screen.getByText(/niet automatisch overgenomen/)).toBeTruthy()
  expect(screen.getByText(/betaalfunctie voor deze scan is nog niet vrijgegeven/)).toBeTruthy()
})
