import { NextResponse, type NextRequest } from 'next/server'
import { getOrganizationLogoStorage } from '@/lib/organizations/logo-storage'
import { isValidLogoStorageKey } from '@/lib/organizations/logo-url'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ storageKey: string }> }) {
  const { storageKey } = await params
  if (!isValidLogoStorageKey(storageKey)) return new NextResponse(null, { status: 404 })

  try {
    const data = await getOrganizationLogoStorage().read(storageKey)
    if (!data) return new NextResponse(null, { status: 404 })
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
