import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/wijzers/*/pdf': ['./public/branding/workmatchr-logo.png'],
    '/mijn-arbo-wijzers/*/pdf': ['./public/branding/workmatchr-logo.png'],
  },
}

export default nextConfig
