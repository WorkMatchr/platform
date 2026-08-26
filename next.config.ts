import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas', 'sharp'],
  outputFileTracingIncludes: {
    '/organisatie/*': ['./node_modules/sharp/**/*', './node_modules/@img/sharp-linux-x64/**/*', './node_modules/@img/sharp-libvips-linux-x64/**/*'],
    '/wijzers/*/pdf': ['./public/branding/workmatchr-logo.png'],
    '/mijn-arbo-wijzers/*/pdf': ['./public/branding/workmatchr-logo.png'],
    '/platformbeheer/kennisbank/bronnen/uploaden': ['./node_modules/@napi-rs/canvas/**/*', './node_modules/@napi-rs/canvas-linux-x64-gnu/**/*', './node_modules/pdfjs-dist/legacy/build/**/*'],
  },
}

export default nextConfig
