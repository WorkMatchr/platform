import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        // Keep Next.js inline hydration and existing provider redirects working.
        // A script-src nonce policy needs a separate compatibility review.
        { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }]
  },
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas', 'sharp'],
  outputFileTracingIncludes: {
    '/organisatie/*': ['./node_modules/sharp/**/*', './node_modules/@img/sharp-linux-x64/**/*', './node_modules/@img/sharp-libvips-linux-x64/**/*'],
    '/wijzers/*/pdf': ['./public/branding/workmatchr-logo.png'],
    '/mijn-arbo-wijzers/*/pdf': ['./public/branding/workmatchr-logo.png'],
    '/platformbeheer/kennisbank/bronnen/uploaden': ['./node_modules/@napi-rs/canvas/**/*', './node_modules/@napi-rs/canvas-linux-x64-gnu/**/*', './node_modules/pdfjs-dist/legacy/build/**/*'],
  },
}

export default nextConfig
