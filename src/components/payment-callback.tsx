'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  apiFetch,
  paystackReferenceSchema,
  type VerifiedCoursePayment,
} from '@danvic/api-client'
import { courseHref } from '@/lib/course-route'

export function PaymentCallback() {
  const query = useSearchParams()
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, '')
  const message = backendUrl
    ? 'Verifying your payment…'
    : 'Payment verification is unavailable because the backend URL is not configured.'

  useEffect(() => {
    const parsed = paystackReferenceSchema.safeParse(query.get('reference'))
    if (!parsed.success) {
      window.location.replace('/catalog?payment=invalid')
      return
    }

    if (!backendUrl) return

    void apiFetch<VerifiedCoursePayment>(`${backendUrl}/payments/paystack/verify`, {
      method: 'POST',
      body: JSON.stringify({ reference: parsed.data }),
    })
      .then((result) => {
        if (result.purpose === 'card_setup') {
          const refund = encodeURIComponent(result.refundStatus ?? 'requested')
          window.location.replace(
            `/payments?card=${result.cardSaved ? 'saved' : 'unavailable'}&refund=${refund}`,
          )
          return
        }
        if (!result.courseId) {
          window.location.replace('/catalog?payment=failed')
          return
        }
        window.location.replace(
          `${courseHref(result.courseId)}&payment=success`,
        )
      })
      .catch(() => {
        window.location.replace('/catalog?payment=failed')
      })
  }, [backendUrl, query])

  return (
    <main className="sb-login-form-wrap" style={{ minHeight: '100vh' }}>
      <div className="sb-login-form">
        <p className="sb-page-eyebrow">Paystack</p>
        <h2>{message}</h2>
        <p>Please keep this page open while DANVIC confirms the transaction.</p>
      </div>
    </main>
  )
}
