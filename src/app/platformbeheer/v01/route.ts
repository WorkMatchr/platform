import { NextResponse } from 'next/server'
import { requirePlatformAuditor } from '@/lib/platform-admin/platform-admin-authorization'

export async function GET(request: Request) {
  await requirePlatformAuditor('/platformbeheer/v01')
  const response = NextResponse.redirect(new URL('/platformbeheer', request.url))
  response.cookies.set('platform-admin-view', 'v01', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/platformbeheer' })
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
