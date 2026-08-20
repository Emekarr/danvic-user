'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TwoFactorForm } from '@/components/student-auth'

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading…</p>
        </main>
      }
    >
      <TwoFactorPage />
    </Suspense>
  )
}

function TwoFactorPage() {
  const query = useSearchParams()
  return <TwoFactorForm returnTo={query.get('next') ?? undefined} />
}