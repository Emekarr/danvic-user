'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/student-auth'

export const metadata = { title: 'Student sign in' }

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading…</p>
        </main>
      }
    >
      <LoginPage />
    </Suspense>
  )
}

function LoginPage() {
  const query = useSearchParams()
  return <LoginForm returnTo={query.get('next') ?? undefined} />
}