'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch, tokenSchema } from '@danvic/api-client'
import { AcceptExistingInvitation, AcceptInvitationForm } from '@/components/student-auth'

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading…</p>
        </main>
      }
    >
      <InvitationPage />
    </Suspense>
  )
}

function InvitationPage() {
  const query = useSearchParams()
  const token = query.get('token') ?? ''
  const parsed = tokenSchema.safeParse(token)
  const [mode, setMode] = useState<'checking' | 'new' | 'existing'>('checking')
  useEffect(() => {
    if (!parsed.success) {
      setMode('new')
      return
    }
    let active = true
    apiFetch<{ student: { id: string } }>('/api/auth/me')
      .then(() => {
        if (active) setMode('existing')
      })
      .catch(() => {
        if (active) setMode('new')
      })
    return () => {
      active = false
    }
  }, [parsed.success])
  if (!parsed.success) return <AcceptInvitationForm token="" />
  if (mode === 'checking')
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message">Checking your session…</p>
      </main>
    )
  return mode === 'existing' ? (
    <AcceptExistingInvitation token={token} />
  ) : (
    <AcceptInvitationForm token={token} />
  )
}