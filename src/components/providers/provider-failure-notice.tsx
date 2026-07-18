import type { ReactNode } from 'react'

export function ProviderFailureNotice({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="rounded-card border border-warning/40 bg-warning/10 p-5" aria-labelledby="failure-title"><h2 id="failure-title" className="font-bold text-brand-dark">{title}</h2><div className="mt-2 text-sm leading-6 text-text-secondary">{children}</div></aside>
}
