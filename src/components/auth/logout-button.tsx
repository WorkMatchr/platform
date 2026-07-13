'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)
  return <Button variant="outline" loading={loading} onClick={async () => { setLoading(true); await authClient.signOut(); window.location.assign('/') }}>Uitloggen</Button>
}
