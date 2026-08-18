'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  apiFetch,
  type InitializedCoursePayment,
  type SavedPaymentMethod,
} from '@danvic/api-client'
import { Button, FormMessage } from '@danvic/ui'
import { Plus, Trash2 } from 'lucide-react'
import { CardBrandMark } from './card-brand-mark'

export function SavedCards({
  methods,
  setupAmountKobo,
}: {
  methods: SavedPaymentMethod[]
  setupAmountKobo: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const addCard = async () => {
    setBusy('add')
    setError('')
    try {
      const checkout = await apiFetch<InitializedCoursePayment>(
        '/api/payment-methods/paystack/setup',
        { method: 'POST', body: '{}' },
      )
      window.location.assign(checkout.authorizationUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Card setup could not be started')
      setBusy('')
    }
  }

  return (
    <section className="lr-payments-cards">
      <div className="lr-section-heading">
        <div>
          <h2>Saved cards</h2>
          <p>Use a saved card for faster course payments.</p>
        </div>
        <Button busy={busy === 'add'} onClick={() => void addCard()}>
          <Plus aria-hidden="true" /> Add card
        </Button>
      </div>
      <p className="lr-payments-note">
        Adding a card requires an authenticated first charge. You will be charged{' '}
        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
          setupAmountKobo / 100,
        )}{' '}
        and DANVIC will immediately request a full refund. Refund settlement time is controlled by
        your bank.
      </p>
      {methods.length ? (
        <div className="lr-payments-card-list">
          {methods.map((method) => (
            <div className="lr-payments-card" key={method.id}>
              <CardBrandMark brand={method.brand || method.cardType} />
              <span className="lr-payments-card-copy">
                <strong>•••• •••• •••• {method.last4}</strong>
                <span>{method.bank || method.cardType}</span>
                <small>
                  Expires {method.expMonth}/{method.expYear}
                </small>
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove card ending ${method.last4}`}
                busy={busy === method.id}
                onClick={async () => {
                  setBusy(method.id)
                  setError('')
                  try {
                    await apiFetch(`/api/payment-methods/${method.id}`, { method: 'DELETE' })
                    router.refresh()
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : 'Card could not be removed',
                    )
                  } finally {
                    setBusy('')
                  }
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="lr-empty-line">No reusable cards have been saved yet.</p>
      )}
      <FormMessage>{error}</FormMessage>
    </section>
  )
}
