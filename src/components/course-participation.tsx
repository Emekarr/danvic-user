'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  apiFetch,
  type InitializedCoursePayment,
  type SavedPaymentMethod,
  type StudentPayments,
  type VerifiedCoursePayment,
} from '@danvic/api-client'
import { Button, FormMessage } from '@danvic/ui'
import { Bell, BellOff, CheckCircle2, CreditCard, UserPlus, WalletCards, X } from 'lucide-react'
import { CardBrandMark } from './card-brand-mark'
import { courseHref } from '@/lib/course-route'

export function PaidEnrollButton({
  courseId,
  priceKobo,
  onEnrolled,
}: {
  courseId: string
  priceKobo: number
  onEnrolled?: () => void
}) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [methods, setMethods] = useState<SavedPaymentMethod[] | null>(null)
  const [selected, setSelected] = useState<string>('new')
  const [saveNew, setSaveNew] = useState(false)
  const close = () => dialogRef.current?.close()

  const startPayment = async () => {
    setBusy(true)
    setError('')
    try {
      const payment = await apiFetch<InitializedCoursePayment | VerifiedCoursePayment>(
        `/api/courses/${courseId}/payments/paystack/initialize`,
        {
          method: 'POST',
          body: JSON.stringify({
            paymentMethodId: selected === 'new' ? null : selected,
            savePaymentMethod: selected === 'new' && saveNew,
            callbackUrl: `${window.location.origin}/payments/paystack/callback`,
          }),
        },
      )
      if (payment.status === 'success') {
        close()
        onEnrolled?.()
        router.replace(`${courseHref(courseId)}&payment=success`)
        return
      }
      window.location.assign(payment.authorizationUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment could not be started')
      setBusy(false)
    }
  }

  return (
    <div>
      <Button
        busy={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            const payments = await apiFetch<StudentPayments>('/api/payments')
            setMethods(payments.paymentMethods)
            setSelected(payments.paymentMethods[0]?.id ?? 'new')
            dialogRef.current?.showModal()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Payment methods could not load')
          } finally {
            setBusy(false)
          }
        }}
      >
        <WalletCards aria-hidden="true" /> Pay &amp; enroll
      </Button>
      <dialog ref={dialogRef} className="lr-dialog" aria-labelledby={`payment-title-${courseId}`}>
        <div className="lr-dialog-head">
          <h2 id={`payment-title-${courseId}`}>Choose how to enroll</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={close}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="lr-dialog-body">
          <p className="lr-dialog-count">
            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
              priceKobo / 100,
            )}{' '}
            · You’ll finish securely on Paystack.
          </p>
          {methods?.length ? (
            <p className="lr-dialog-question">Would you like to use a saved card?</p>
          ) : (
            <p className="lr-dialog-question">No saved cards yet. Use a new card to enroll.</p>
          )}
          <div className="lr-payment-method-list">
            {methods?.map((method) => (
              <label
                className="lr-payment-method"
                data-selected={selected === method.id || undefined}
                key={method.id}
              >
                <input
                  type="radio"
                  name={`payment-method-${courseId}`}
                  value={method.id}
                  checked={selected === method.id}
                  onChange={() => setSelected(method.id)}
                />
                <CardBrandMark brand={method.brand || method.cardType} compact />
                <span>
                  <strong>•••• {method.last4}</strong>
                  <small>{method.bank || method.cardType}</small>
                </span>
              </label>
            ))}
            <label className="lr-payment-method" data-selected={selected === 'new' || undefined}>
              <input
                type="radio"
                name={`payment-method-${courseId}`}
                value="new"
                checked={selected === 'new'}
                onChange={() => setSelected('new')}
              />
              <CreditCard aria-hidden="true" />
              <span>
                <strong>Use a new card</strong>
                <small>Enter your card details on Paystack.</small>
              </span>
            </label>
          </div>
          {selected === 'new' ? (
            <label className="lr-payment-save-card">
              <input
                type="checkbox"
                checked={saveNew}
                onChange={(event) => setSaveNew(event.target.checked)}
              />
              Save this new card for future course enrollments
            </label>
          ) : null}
          <FormMessage>{error}</FormMessage>
        </div>
        <div className="lr-dialog-footer">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button busy={busy} onClick={() => void startPayment()}>
            Continue to Paystack
          </Button>
        </div>
      </dialog>
      <FormMessage>{error}</FormMessage>
    </div>
  )
}

export function EnrollButton({
  courseId,
  onEnrolled,
}: {
  courseId: string
  onEnrolled?: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div>
      <Button
        busy={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            await apiFetch(`/api/courses/${courseId}/enroll`, { method: 'POST', body: '{}' })
            if (onEnrolled) onEnrolled()
            else router.push(courseHref(courseId))
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Enrollment failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <UserPlus aria-hidden="true" /> Enroll
      </Button>
      <FormMessage>{error}</FormMessage>
    </div>
  )
}

export function CourseBookmarkButton({
  courseId,
  initialBookmarked = false,
  onChange,
}: {
  courseId: string
  initialBookmarked?: boolean
  onChange?: (bookmarked: boolean) => void
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <div>
      <Button
        variant={bookmarked ? 'soft' : 'primary'}
        busy={busy}
        onClick={async () => {
          const next = !bookmarked
          setBusy(true)
          setError('')
          try {
            await apiFetch(`/api/courses/${encodeURIComponent(courseId)}/bookmark`, {
              method: 'PUT',
              body: JSON.stringify({ enabled: next }),
            })
            setBookmarked(next)
            onChange?.(next)
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Bookmark could not be updated')
          } finally {
            setBusy(false)
          }
        }}
      >
        {bookmarked ? <BellOff aria-hidden="true" /> : <Bell aria-hidden="true" />}
        {bookmarked ? 'Remove bookmark' : 'Bookmark & remind me'}
      </Button>
      <FormMessage>{error}</FormMessage>
    </div>
  )
}

export function CompleteModuleButton({
  courseId,
  moduleId,
  completed,
  locked,
  onCompleted,
}: {
  courseId: string
  moduleId: string
  completed: boolean
  locked: boolean
  onCompleted?: (courseCompleted: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div style={{ marginTop: 18 }}>
      <Button
        variant={completed ? 'soft' : 'primary'}
        busy={busy}
        disabled={completed || locked}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            const result = await apiFetch<{ courseCompleted: boolean }>(
              `/api/courses/${courseId}/modules/${moduleId}/complete`,
              {
              method: 'POST',
              body: '{}',
              },
            )
            onCompleted?.(result.courseCompleted)
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Progress could not be saved')
          } finally {
            setBusy(false)
          }
        }}
      >
        <CheckCircle2 aria-hidden="true" />{' '}
        {completed ? 'Completed' : locked ? 'Complete earlier modules first' : 'Mark complete'}
      </Button>
      <FormMessage>{error}</FormMessage>
    </div>
  )
}
