import Image from 'next/image'

const logoSizeClasses = {
  header: 'w-36 sm:w-48',
  auth: 'w-52 max-w-full',
  footer: 'w-48 max-w-full',
  compact: 'w-32 sm:w-40',
} as const

export function WorkMatchrLogo({
  size = 'header',
  priority = false,
}: {
  size?: keyof typeof logoSizeClasses
  priority?: boolean
}) {
  return (
    <Image
      src="/branding/workmatchr-logo.png"
      alt="WorkMatchr — Slim verbonden. De beste match voor uw vraag."
      width={1321}
      height={372}
      priority={priority}
      sizes={size === 'header' ? '(min-width: 640px) 192px, 144px' : undefined}
      className={`h-auto shrink-0 ${logoSizeClasses[size]}`}
    />
  )
}
