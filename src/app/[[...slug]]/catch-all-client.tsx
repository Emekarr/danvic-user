'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CatchAllViews } from '@/components/dynamic-views'

export function CatchAllDispatcher() {
  const router = useRouter()
  const pathname = usePathname().replace(/\/+$/, '') || '/'

  useEffect(() => {
    if (pathname === '/') router.replace('/dashboard')
  }, [pathname, router])

  if (pathname === '/') {
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message">Opening your dashboard…</p>
      </main>
    )
  }

  return <CatchAllViews />
}
