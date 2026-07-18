'use client'

import { useState } from 'react'
import { Button, type ButtonVariant } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

type LogoutButtonProps = {
  className?: string
  variant?: ButtonVariant
}

export function LogoutButton({ className = '', variant = 'outline' }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      await authClient.signOut()
      window.location.assign('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button className={className} variant={variant} loading={loading} onClick={handleLogout}>
      Uitloggen
    </Button>
  )
}
