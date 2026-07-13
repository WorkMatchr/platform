import type { Metadata } from 'next'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://workmatchr.nl'),
  title: 'WorkMatchr | Van hulpvraag naar passende specialist',
  description:
    'WorkMatchr helpt organisaties hun hulpvraag te verduidelijken en selecteert daarna onafhankelijk maximaal drie passende arbo- en veiligheidsspecialisten.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
