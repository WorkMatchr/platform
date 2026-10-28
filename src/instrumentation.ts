// Reject an unsafe Preview before serving requests, including paths that do not
// use Prisma (for example external provider operations). No Production change.
export async function register() {
  if (process.env.VERCEL_ENV === 'preview') {
    const { previewDatabasePolicy } = await import('./lib/maintenance/preview-isolation')
    previewDatabasePolicy()
  }
}
