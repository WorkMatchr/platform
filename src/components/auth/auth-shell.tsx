import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export function AuthShell({
  title,
  intro,
  children,
  wide = false,
}: {
  title: string
  intro: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <main className="px-5 py-12 sm:px-8 sm:py-20">
      <Card className={`mx-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-6 sm:p-9`}>
        <Link href="/" className="text-lg font-bold text-brand-dark" aria-label="WorkMatchr, naar de homepage">
          Work<span className="text-brand-primary">Matchr</span>
        </Link>
        <Heading as="h1" size="h2" className="mt-7">{title}</Heading>
        <Text className="mt-3 text-text-secondary">{intro}</Text>
        <div className="mt-8">{children}</div>
      </Card>
    </main>
  )
}

export const fieldClassName =
  'mt-2 min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-text-primary disabled:cursor-not-allowed disabled:bg-surface-subtle'

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="mt-2 text-sm text-error">{message}</p>
}

export function StatusMessage({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <p role="status" className={`rounded-control p-3 text-sm ${error ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>{children}</p>
}
