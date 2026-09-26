import { describe, expect, it, vi } from 'vitest'
import { JorttProviderError, jorttFetch, jorttJson, jorttOperation } from './jortt-provider-diagnostics'

describe('veilige Jortt-transportdiagnostiek', () => {
  it.each([400, 401, 403, 404, 409, 422, 429, 500, 503])('behoudt stage en HTTP %i zonder vrije providertekst', async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { key: 'params.invalid', message: 'secret@example.invalid Bearer SECRET', details: { address: 'Private street' } } }), { status }))
    const error = await jorttFetch(fetcher, 'CUSTOMER_CREATE', 'https://unused.invalid', {}).catch(e => e)
    expect(error).toBeInstanceOf(JorttProviderError)
    expect(error.diagnostic).toEqual({ provider: 'JORTT', operation: 'CUSTOMER_CREATE', httpStatus: status, providerErrorCode: 'params.invalid', category: status === 429 ? 'JORTT_RATE_LIMITED' : status >= 500 ? 'JORTT_PROVIDER_UNAVAILABLE' : 'JORTT_CUSTOMER_CREATE_REJECTED' })
    expect(error.message).toBe(status === 429 || status >= 500 ? 'JORTT_TEMPORARY_PROVIDER_ERROR' : 'JORTT_PROVIDER_REJECTED')
    expect(JSON.stringify(error)).not.toMatch(/SECRET|example.invalid|Private street|message|details/)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it.each(['token_sensitive', 'someone@example.invalid', 'unknown.provider_key', 'a'.repeat(200)])('weigert onbekende of gevoelige providerkey', async (key) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { key } }), { status: 422 }))
    const error = await jorttFetch(fetcher, 'INVOICE_CREATE', 'https://unused.invalid', {}).catch(e => e)
    expect(error.diagnostic.providerErrorCode).toBeNull()
    expect(JSON.stringify(error)).not.toContain(key)
  })

  it.each(['TimeoutError', 'AbortError', 'Error'])('sanitiseert transportfout %s', async (name) => {
    const failure = new Error('Authorization: Bearer SECRET; private@example.invalid')
    failure.name = name
    const error = await jorttFetch(vi.fn().mockRejectedValue(failure), 'AUTH', 'https://unused.invalid', {}).catch(e => e)
    expect(error.diagnostic).toMatchObject({ operation: 'AUTH', httpStatus: null, category: name === 'Error' ? 'JORTT_NETWORK' : 'JORTT_TIMEOUT' })
    expect(JSON.stringify(error)).not.toMatch(/SECRET|private|Authorization/)
    expect(error.cause).toBeUndefined()
  })

  it.each(['not JSON', JSON.stringify({ error: { key: 'params.invalid', message: 'x'.repeat(17_000) } })])('behoudt HTTP-status bij onbruikbare of te grote foutbody', async body => {
    const error = await jorttFetch(vi.fn().mockResolvedValue(new Response(body, { status: 422 })), 'INVOICE_CREATE', 'https://unused.invalid', {}).catch(e => e)
    expect(error.diagnostic).toMatchObject({ httpStatus: 422, providerErrorCode: null, operation: 'INVOICE_CREATE' })
  })

  it('behoudt een gedocumenteerde OAuth-foutcode zonder error_description', async () => {
    const error = await jorttFetch(vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_client', error_description: 'SECRET' }), { status: 401 })), 'AUTH', 'https://unused.invalid', {}).catch(e => e)
    expect(error.diagnostic).toMatchObject({ providerErrorCode: 'invalid_client', category: 'JORTT_AUTH_REJECTED' })
    expect(JSON.stringify(error)).not.toContain('SECRET')
  })

  it('sanitiseert ongeldige JSON bij een succesvolle HTTP-response', async () => {
    await expect(jorttJson(new Response('SECRET'), 'INVOICE_READ')).rejects.toMatchObject({ diagnostic: { operation: 'INVOICE_READ', category: 'JORTT_INVALID_RESPONSE' } })
  })

  it.each([
    ['/customers?query=private', 'GET', 'CUSTOMER_LOOKUP'], ['/customers', 'POST', 'CUSTOMER_CREATE'],
    ['/invoices?query=private', 'GET', 'INVOICE_LOOKUP'], ['/invoices/id', 'GET', 'INVOICE_READ'],
    ['/invoices', 'POST', 'INVOICE_CREATE'], ['/invoices/id', 'PUT', 'INVOICE_UPDATE'],
    ['/invoices/id/credit', 'POST', 'CREDIT_NOTE_CREATE'], ['/invoices/id/send', 'POST', 'INVOICE_FINALIZE'],
  ])('classificeert %s zonder identifier in diagnostiek', (path, method, operation) => {
    expect(jorttOperation(path, method)).toBe(operation)
  })
})
