import { Suspense } from 'react'
import { InvitationQueryPage } from '@/components/auth-query-pages'

export const metadata = { title: 'Accept student invitation' }

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading…</p>
        </main>
      }
    >
      <InvitationQueryPage />
    </Suspense>
  )
}
