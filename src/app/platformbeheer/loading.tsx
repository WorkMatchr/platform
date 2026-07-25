export default function PlatformAdminLoading() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <div className="h-20 animate-pulse rounded-card bg-border" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => <div className="h-28 animate-pulse rounded-card bg-border" key={index} />)}
      </div>
      <span className="sr-only">Platformbeheer wordt geladen.</span>
    </div>
  )
}
