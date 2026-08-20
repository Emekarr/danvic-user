'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge, PageHeader } from '@danvic/ui'
import { useEnrollments, usePayments } from '@/lib/data'
import { SavedCards } from '@/components/payment-center'
import { CardBrandMark } from '@/components/card-brand-mark'
import { TransactionReference } from '@/components/transaction-reference'
import Link from 'next/link'
import { courseHref } from '@/lib/course-route'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaymentsPage />
    </Suspense>
  )
}

function PaymentsPage() {
  const query = useSearchParams()
  const paymentsState = usePayments()
  const enrollmentsState = useEnrollments()

  if (paymentsState.loading || enrollmentsState.loading)
    return <p className="ad-empty-line">Loading your payment history…</p>
  if (paymentsState.error || enrollmentsState.error)
    return (
      <p className="ad-empty-line" data-tone="error">
        {paymentsState.error || enrollmentsState.error}
      </p>
    )

  const payments = paymentsState.data
  const enrollments = enrollmentsState.data ?? []
  if (!payments)
    return (
      <p className="ad-empty-line" data-tone="error">
        Could not load your payment history.
      </p>
    )
  const courseNames = new Map(
    enrollments
      .filter((item) => item.course)
      .map((item) => [item.course!.id, item.course!.name]),
  )
  const naira = (kobo: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(kobo / 100)
  const card = query.get('card')
  const refund = query.get('refund')
  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        description="Manage reusable cards and review your transaction history."
      />
      {card ? (
        <div className="lr-payments-banner">
          <Badge tone={card === 'saved' ? 'green' : 'violet'} dot>
            {card === 'saved' ? 'Card saved' : 'Card could not be saved'}
          </Badge>
          <p>
            {card === 'saved'
              ? 'The reusable Paystack authorization is ready for future course payments.'
              : 'Paystack did not return a reusable card authorization. Any successful verification charge is still being refunded.'}
          </p>
          {refund === 'failed' ? (
            <p>
              The automatic refund request failed. Contact support with the transaction reference
              shown below.
            </p>
          ) : null}
        </div>
      ) : null}
      <SavedCards methods={payments.paymentMethods} setupAmountKobo={payments.cardSetupAmountKobo} />
      <section className="lr-section">
        <div className="lr-section-heading">
          <div>
            <h2>Transaction log</h2>
            <p>Amounts are shown in naira; sensitive card details are never stored.</p>
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                  <td>
                    <TransactionReference reference={transaction.reference} />
                  </td>
                  <td>
                    {transaction.courseId ? (
                      <Link
                        href={courseHref(transaction.courseId)}
                        className="sb-cell-link"
                      >
                        {courseNames.get(transaction.courseId) ?? transaction.courseId}
                      </Link>
                    ) : (
                      'Saved-card verification'
                    )}
                  </td>
                  <td>
                    <strong>{naira(transaction.amountKobo)}</strong>
                  </td>
                  <td>
                    {transaction.cardBrand || transaction.cardType ? (
                      <CardBrandMark
                        brand={transaction.cardBrand || transaction.cardType || ''}
                        large
                      />
                    ) : (
                      <span className="lr-bank-transfer">Bank Transfer</span>
                    )}
                  </td>
                  <td>
                    <Badge tone={transaction.status === 'succeeded' ? 'green' : 'violet'} dot>
                      {transaction.status}
                    </Badge>
                    {transaction.refundStatus ? (
                      <span className="sb-cell-secondary">
                        Refund: {transaction.refundStatus}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!payments.transactions.length ? (
                <tr>
                  <td colSpan={6}>No payment transactions have been recorded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
