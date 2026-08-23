import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas'],
  outputFileTracingIncludes: {
    '/wijzers/*/pdf': ['./public/branding/workmatchr-logo.png'],
    '/mijn-arbo-wijzers/*/pdf': ['./public/branding/workmatchr-logo.png'],
    '/platformbeheer/kennisbank/bronnen/uploaden': ['./node_modules/@napi-rs/canvas/**/*'],
    '/api/preview-fixtures/knowledge-upload': ['./node_modules/@napi-rs/canvas/**/*'],
  },
}

export default nextConfig
