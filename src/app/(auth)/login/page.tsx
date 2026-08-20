import { Suspense } from 'react'
import { LoginQueryPage } from '@/components/auth-query-pages'

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
      <LoginQueryPage />
    </Suspense>
  )
}
