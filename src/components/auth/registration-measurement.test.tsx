// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { RegisterForm } from './register-form'
import { measure } from '@/lib/marketing/measurement'
import { runNewPasswordRegistrationRequest } from '@/lib/auth-form-request'
vi.mock('@/lib/marketing/measurement', () => ({ measure: vi.fn() }))
vi.mock('@/lib/auth-form-request', () => ({ runNewPasswordRegistrationRequest: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it.each(['CLIENT', 'PROFESSIONAL'] as const)('counts only an accepted %s request, not a verified registration', async accountType => {
  vi.mocked(runNewPasswordRegistrationRequest).mockResolvedValueOnce('technical_error').mockResolvedValueOnce('accepted')
  render(<RegisterForm />)
  fireEvent.click(document.querySelector(`input[value="${accountType}"]`)!)
  for (const [id, value] of [['name', 'Synthetic Test'], ['email', 'seo@example.invalid'], ['password', 'Synthetic-only-acceptance-phrase'], ['passwordConfirmation', 'Synthetic-only-acceptance-phrase']]) fireEvent.change(document.getElementById(id)!, { target: { value } })
  fireEvent.click(document.querySelector('input[name=acceptedTerms]')!)
  const form = screen.getByRole('button', { name: 'Account registreren' }).closest('form')!
  fireEvent.submit(form)
  await waitFor(() => expect(runNewPasswordRegistrationRequest).toHaveBeenCalledOnce())
  await waitFor(() => expect(screen.getByRole('button').getAttribute('aria-busy')).not.toBe('true'))
  expect(measure).not.toHaveBeenCalled()
  fireEvent.submit(form)
  await waitFor(() => expect(measure).toHaveBeenCalledExactlyOnceWith(accountType === 'CLIENT' ? 'client_registration_request_accepted' : 'professional_registration_request_accepted'))
})
