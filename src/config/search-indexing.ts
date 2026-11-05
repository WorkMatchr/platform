// Indexing is not access control. Existing server-side authorization remains required.
export const nonIndexableRoutePrefixes = [
  '/account', '/account-activeren', '/aanvragen', '/adviesdossiers', '/aanbiedersdossier',
  '/api', '/dashboard', '/hulpvragen', '/inloggen', '/organisatie', '/opdrachten',
  '/registreren', '/wachtwoord-vergeten', '/wachtwoord-instellen', '/verifieer-email',
  '/platformbeheer', '/offertes', '/credits', '/berichten', '/notificaties',
  '/beheer', '/marktplaats', '/professional', '/uitnodigingen', '/certificaat',
  '/media', '/e-learnings', '/frontpage-v02', '/wachtwoord-herstellen',
  '/mijn-arbo-wijzers', '/mijn-opleidingen', '/e-learning', '/wijzers/compliance/v2',
] as const

export function searchIndexingHeaders(environment: string | undefined) {
  const sources = environment === 'production'
    ? nonIndexableRoutePrefixes.map(prefix => `${prefix}/:path*`)
    : ['/:path*']
  return sources.map(source => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }))
}
