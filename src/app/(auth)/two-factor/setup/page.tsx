import { Suspense } from 'react'
import { TwoFactorQueryPage } from '@/components/auth-query-pages'

export const metadata = { title: 'Set up two-factor authentication' }

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading…</p>
        </main>
      }
    >
      <TwoFactorQueryPage setup />
    </Suspense>
  )
}
