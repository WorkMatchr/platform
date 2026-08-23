import Image from 'next/image'

const logoSizeClasses = {
  header: 'w-[10.8rem] sm:w-[14.4rem]',
  homepageHeader: 'w-[10.8rem] sm:w-[14.4rem]',
  auth: 'w-[10.8rem] max-w-full sm:w-[14.4rem]',
  footer: 'w-[10.8rem] max-w-full sm:w-[14.4rem]',
  compact: 'w-[10.8rem] sm:w-[14.4rem]',
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
      sizes="(min-width: 640px) 230.4px, 172.8px"
      className={`h-auto shrink-0 ${logoSizeClasses[size]}`}
    />
  )
}
