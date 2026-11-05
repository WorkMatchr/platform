// Node CLI has no Next resolver. Resolve only Next's server-only marker to
// its official react-server entry; all application auth remains unchanged.
import { registerHooks } from 'node:module'
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return nextResolve('next/dist/compiled/server-only/empty.js', context)
  return nextResolve(specifier, context)
} })
