import type { Metadata } from 'next'
import { PublicHomepageV02 } from '@/components/public/public-homepage-v02'

export const metadata: Metadata = {
  title: 'Vind de juiste deskundige voor uw vraag | WorkMatchr',
  description: 'Beschrijf wat er speelt. WorkMatchr helpt u uw hulpvraag concreet te maken, een opdracht te publiceren en passende opdrachtnemers te vergelijken.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Vind de juiste deskundige voor uw vraag | WorkMatchr',
    description: 'Van hulpvraag naar een concrete opdracht. U kiest zelf met welke opdrachtnemer u verdergaat.',
    url: '/',
    type: 'website',
  },
}

export default function HomePage() {
  return <PublicHomepageV02 />
}
