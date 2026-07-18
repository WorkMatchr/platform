import { ProviderServiceError } from './provider-errors'

/**
 * @deprecated Capaciteitsregistratie bestaat alleen nog voor historische compatibiliteit.
 * Nieuwe capaciteitssnapshots worden niet meer geschreven.
 */
export async function confirmProviderCapacity(userId: string, providerProfileId: string, rawInput: unknown) {
  void userId
  void providerProfileId
  void rawInput
  throw new ProviderServiceError('CAPACITY_DEPRECATED')
}
