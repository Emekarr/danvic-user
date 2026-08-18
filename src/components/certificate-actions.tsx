'use client'

import { useState } from 'react'
import type { Certificate } from '@danvic/api-client'
import { apiFetch, apiUrl } from '@danvic/api-client'
import { Button, Field, FormMessage, Input } from '@danvic/ui'
import { Download, ExternalLink, Mail, Send, X } from 'lucide-react'

export function CertificateActions({ certificate }: { certificate: Certificate }) {
  const [showEmail, setShowEmail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const publicPath = `/certificates/${encodeURIComponent(certificate.certificateNumber)}`
  const downloadPath = apiUrl(
    `/api/certificate-verification/${encodeURIComponent(certificate.certificateNumber)}/pdf?download=1`,
  )

  return (
    <div className="cert-actions-wrap">
      <div className="cert-actions">
        <a
          href={publicPath}
          target="_blank"
          rel="noreferrer"
          className="sb-button sb-button--primary sb-button--md"
        >
          <ExternalLink aria-hidden="true" /> View certificate
        </a>
        <a href={downloadPath} download className="sb-button sb-button--secondary sb-button--md">
          <Download aria-hidden="true" /> Download
        </a>
        <Button type="button" variant="soft" onClick={() => setShowEmail((value) => !value)}>
          {showEmail ? <X aria-hidden="true" /> : <Mail aria-hidden="true" />}
          {showEmail ? 'Close email form' : 'Send to email'}
        </Button>
      </div>
      {showEmail ? (
        <form
          className="cert-email-form"
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            setMessage('')
            const form = event.currentTarget
            const email = String(new FormData(form).get('email') ?? '')
            try {
              await apiFetch(`/api/certificates/${certificate.id}/email`, {
                method: 'POST',
                body: JSON.stringify({ email }),
              })
              setMessage(`Certificate queued for delivery to ${email}.`)
              form.reset()
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Certificate could not be sent')
            } finally {
              setBusy(false)
            }
          }}
        >
          <Field label="Recipient email" required hint="Enter one email address.">
            <Input name="email" type="email" inputMode="email" autoComplete="email" required />
          </Field>
          <Button busy={busy}>
            <Send aria-hidden="true" /> Send certificate
          </Button>
          <FormMessage>{error}</FormMessage>
          <FormMessage tone="success">{message}</FormMessage>
        </form>
      ) : null}
    </div>
  )
}
