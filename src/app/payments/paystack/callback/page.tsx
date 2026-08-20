import { Suspense } from 'react'
import { PaymentCallback } from '@/components/payment-callback'

export const metadata = { title: 'Verifying payment' }

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Verifying your payment…</p>
        </main>
      }
    >
      <PaymentCallback />
    </Suspense>
  )
}
