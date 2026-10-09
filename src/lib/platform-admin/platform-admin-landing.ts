import 'server-only'
import { getPlatformAuditorContext, PlatformAdminAccessError } from './platform-admin-authorization'

/** Resolve only the generic landing. Explicit returnTo destinations stay intact. */
export async function getPlatformAdminLanding(userId: string): Promise<string | null> {
  try {
    await getPlatformAuditorContext(userId)
    return '/platformbeheer'
  } catch (error) {
    if (error instanceof PlatformAdminAccessError) return null
    throw error
  }
}
