'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch, tokenSchema } from '@danvic/api-client'
import {
  AcceptExistingInvitation,
  AcceptInvitationForm,
  LoginForm,
  TwoFactorForm,
} from '@/components/student-auth'

const safeReturnPath = (value: string | null) =>
  value?.startsWith('/') && !value.startsWith('//') ? value : undefined

export function LoginQueryPage() {
  const query = useSearchParams()
  return <LoginForm returnTo={safeReturnPath(query.get('next'))} />
}

export function TwoFactorQueryPage({ setup = false }: { setup?: boolean }) {
  const query = useSearchParams()
  return <TwoFactorForm setup={setup} returnTo={safeReturnPath(query.get('next'))} />
}

export function InvitationQueryPage() {
  const query = useSearchParams()
  const token = query.get('token') ?? ''
  const parsed = tokenSchema.safeParse(token)
  const [mode, setMode] = useState<'checking' | 'new' | 'existing'>('checking')

  useEffect(() => {
    if (!parsed.success) return
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

  if (!parsed.success)
    return (
      <main className="sb-login-form-wrap" style={{ minHeight: '100vh' }}>
        <div className="sb-login-form">
          <h2>Invalid invitation link</h2>
          <p>Ask the course author or administrator for a new invitation.</p>
        </div>
      </main>
    )

  if (mode === 'checking')
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message">Checking your session…</p>
      </main>
    )

  return mode === 'existing' ? (
    <AcceptExistingInvitation token={parsed.data} />
  ) : (
    <AcceptInvitationForm token={parsed.data} />
  )
}
