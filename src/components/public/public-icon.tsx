import type { PublicIconName } from '@/content/public-homepage'

const paths: Record<PublicIconName, React.ReactNode> = {
  advice: <path d="M6 18h12M8 14h8M9 3h6l3 4v4l-4 3h-4l-4-3V7l3-4Z" />,
  checklist: <path d="m5 7 2 2 4-4M5 14l2 2 4-4M13 7h6M13 14h6" />,
  growth: <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />,
  health: <path d="M12 20S4 15.5 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.5 12 20 12 20Z" />,
  incident: <path d="M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01" />,
  law: <path d="M12 3v18M5 6h14M7 6l-4 7h8L7 6Zm10 0-4 7h8l-4-7ZM8 21h8" />,
  search: <path d="m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />,
}

export function PublicIcon({ name }: { name: PublicIconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}
