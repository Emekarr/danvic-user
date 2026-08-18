'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, type LoginResult } from '@danvic/api-client'
import {
  AuthLayout,
  Brand,
  Button,
  CodeInput,
  Field,
  FormMessage,
  Input,
  PasswordInput,
} from '@danvic/ui'
import { BookOpen, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import styles from './auth-layout.module.css'

const features = [
  { icon: ShieldCheck, label: 'Invitation-only enrollment' },
  { icon: KeyRound, label: 'Mandatory two-factor security' },
  { icon: BookOpen, label: 'Recorded module progress' },
]

export function LoginForm({ returnTo }: { returnTo?: string | undefined }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow="Student access"
      headline="Continue your learning securely."
      description="Sign in with the account created from your invitation."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const result = await apiFetch<LoginResult>('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
            })
            router.push(
              returnTo ? `${result.next}?next=${encodeURIComponent(returnTo)}` : result.next,
            )
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Sign-in failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Welcome back</p>
        <h2>Student sign in</h2>
        <p>Every student account requires an authenticator code.</p>
        <div className="sb-login-fields">
          <Field label="Email" required>
            <Input name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Password" required>
            <PasswordInput name="password" autoComplete="current-password" required />
          </Field>
          <div className="sb-login-help">
            <span>Secure learner access</span>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <Button size="lg" busy={busy}>
            Sign in
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}

export function TwoFactorForm({
  setup = false,
  returnTo,
}: {
  setup?: boolean
  returnTo?: string | undefined
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  useEffect(() => {
    if (!setup) return
    void apiFetch<{ qrCodeDataUrl: string; secret: string }>('/api/auth/two-factor/setup', {
      method: 'POST',
      body: '{}',
    })
      .then((value) => {
        setQrCode(value.qrCodeDataUrl)
        setSecret(value.secret)
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Could not start setup'),
      )
  }, [setup])
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow={setup ? 'Required security setup' : 'Second factor'}
      headline={setup ? 'Protect your learning account.' : 'Confirm it is really you.'}
      description="Use a time-based code from your authenticator app."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const result = await apiFetch<{ next: string }>(
              setup ? '/api/auth/two-factor/confirm' : '/api/auth/two-factor/verify',
              { method: 'POST', body: JSON.stringify({ code: data.get('code') }) },
            )
            router.push(returnTo ?? result.next)
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Verification failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">{setup ? 'Authenticator setup' : 'Verification'}</p>
        <h2>{setup ? 'Set up two-factor authentication' : 'Enter your six-digit code'}</h2>
        <p>
          {setup
            ? 'Use Google Authenticator, 1Password, Authy, or another TOTP app.'
            : 'The code changes every 30 seconds.'}
        </p>
        {qrCode ? (
          <Image
            className="sb-qr"
            src={qrCode}
            alt="DANVIC authenticator QR code"
            width={220}
            height={220}
            unoptimized
          />
        ) : null}
        {secret ? (
          <p className="sb-form-message" data-tone="info">
            Manual key: <strong>{secret}</strong>
          </p>
        ) : null}
        <div className="sb-login-fields">
          <Field label="Authenticator code" required>
            <CodeInput
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </Field>
          <Button size="lg" busy={busy} disabled={setup && !qrCode}>
            Verify and continue
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow="Secure invitation"
      headline="Welcome to your learning workspace."
      description="Create your account, then begin learning with DANVIC."
      features={[{ icon: CheckCircle2, label: 'Single-use invitation' }, ...features.slice(1)]}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          const password = String(data.get('password') ?? '')
          if (password !== data.get('confirmPassword')) {
            setError('Passwords do not match')
            setBusy(false)
            return
          }
          try {
            await apiFetch('/api/invitations/accept', {
              method: 'POST',
              body: JSON.stringify({
                token,
                firstName: data.get('firstName'),
                lastName: data.get('lastName'),
                password,
              }),
            })
            router.push('/login?invitation=accepted')
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Invitation could not be accepted')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Create account</p>
        <h2>Accept student invitation</h2>
        <p>Two-factor authentication can be enabled after sign-in.</p>
        <div className="sb-login-fields">
          <div className="sb-form-grid">
            <Field label="First name" required>
              <Input name="firstName" maxLength={100} autoComplete="given-name" required />
            </Field>
            <Field label="Last name" required>
              <Input name="lastName" maxLength={100} autoComplete="family-name" required />
            </Field>
          </div>
          <Field label="Create password" hint="Between 12 and 128 characters." required>
            <PasswordInput
              name="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirm password" required>
            <PasswordInput
              name="confirmPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button size="lg" busy={busy}>
            Create student account
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}

export function AcceptExistingInvitation({ token }: { token: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      eyebrow="Student invitation"
      headline="Accept this student invitation."
      description="The invitation email must match your signed-in student account."
      features={features}
    >
      <div className="sb-login-form">
        <Brand href="/dashboard" />
        <h2>Accept student invitation</h2>
        <p>Your identity and mandatory two-factor authentication have already been verified.</p>
        <div className="sb-login-fields">
          <Button
            size="lg"
            busy={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                const result = await apiFetch<{ courseId: string | null }>(
                  '/api/invitations/accept-existing',
                  { method: 'POST', body: JSON.stringify({ token }) },
                )
                router.push(result.courseId ? `/courses/${result.courseId}` : '/dashboard')
                router.refresh()
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : 'Invitation could not be accepted',
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            Accept invitation
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </div>
    </AuthLayout>
  )
}

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  return (
    <AuthLayout
      eyebrow="Account recovery"
      headline="Recover secure access."
      description="A one-time code will be sent if your student account exists."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const result = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
              method: 'POST',
              body: JSON.stringify({ email: data.get('email') }),
            })
            setMessage(result.message)
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not request code')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Brand href="/login" />
        <p className="sb-page-eyebrow" style={{ marginTop: 36 }}>
          Password reset
        </p>
        <h2>Request a reset code</h2>
        <p>The six-digit code expires after ten minutes.</p>
        <div className="sb-login-fields">
          <Field label="Email" required>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Button size="lg" busy={busy}>
            Send reset code
          </Button>
          <FormMessage tone="success">{message}</FormMessage>
          <FormMessage>{error}</FormMessage>
          {message ? (
            <Link className="sb-button sb-button--soft sb-button--lg" href="/reset-password">
              Enter reset code
            </Link>
          ) : null}
        </div>
      </form>
    </AuthLayout>
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      eyebrow="Single-use recovery"
      headline="Set a new secure password."
      description="Use the code delivered to your student email. A successful reset invalidates every existing access token."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          const password = String(data.get('newPassword') ?? '')
          if (password !== data.get('confirmPassword')) {
            setError('Passwords do not match')
            setBusy(false)
            return
          }
          try {
            await apiFetch('/api/auth/reset-password', {
              method: 'POST',
              body: JSON.stringify({
                email: data.get('email'),
                code: data.get('code'),
                newPassword: password,
              }),
            })
            router.push('/login?reset=complete')
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Reset failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Secure reset</p>
        <h2>Choose a new password</h2>
        <p>Use at least 12 characters.</p>
        <div className="sb-login-fields">
          <Field label="Email" required>
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Reset code" required>
            <CodeInput name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
          </Field>
          <Field label="New password" required>
            <PasswordInput
              name="newPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirm password" required>
            <PasswordInput
              name="confirmPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button size="lg" busy={busy}>
            Reset password
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}
