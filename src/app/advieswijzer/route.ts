import { NextRequest, NextResponse } from 'next/server'
import { publicRoutes } from '@/content/public-routes'

export function GET(request: NextRequest) {
  // A relative Location preserves the request origin, including local loopback hosts.
  return new NextResponse(null, {
    status: 301,
    headers: { Location: `${publicRoutes.adviceGuide}${request.nextUrl.search}` },
  })
}
