export class FirstPlatformOwnerBootstrapArgumentError extends Error {
  constructor() { super('Ongeldige bootstrapargumenten: geef een User-ID en besluitreferentie op; uitvoering vereist --execute én --confirm-first-platform-owner.'); this.name = 'FirstPlatformOwnerBootstrapArgumentError' }
}

/** No unknown arguments, implicit execution, secrets or permissive argument fallback. */
export function parseFirstPlatformOwnerBootstrapArguments(args: string[]) {
  const values = new Map<string, string>()
  const flags = new Set<string>()
  for (let index = 0; index < args.length; index++) {
    const name = args[index]
    if (['--user-id', '--operator-reference'].includes(name)) {
      const value = args[++index]
      if (values.has(name) || !value || value.startsWith('--')) throw new FirstPlatformOwnerBootstrapArgumentError()
      values.set(name, value)
    } else if (['--execute', '--dry-run', '--confirm-first-platform-owner'].includes(name)) {
      if (flags.has(name)) throw new FirstPlatformOwnerBootstrapArgumentError()
      flags.add(name)
    } else throw new FirstPlatformOwnerBootstrapArgumentError()
  }
  const userId = values.get('--user-id'), operatorReference = values.get('--operator-reference')
  const execute = flags.has('--execute'), confirmed = flags.has('--confirm-first-platform-owner')
  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    || !operatorReference || !/^[A-Za-z0-9][A-Za-z0-9:_-]{5,119}$/.test(operatorReference)
    || execute !== confirmed || (execute && flags.has('--dry-run'))) throw new FirstPlatformOwnerBootstrapArgumentError()
  return { execute, userId, operatorReference }
}
