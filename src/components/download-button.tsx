'use client'

import { useState } from 'react'
import { apiFetch } from '@danvic/api-client'
import { Button, FormMessage } from '@danvic/ui'
import { Download } from 'lucide-react'

export function DownloadButton({
  courseId,
  attachmentId,
}: {
  courseId: string
  attachmentId: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div>
      <Button
        size="sm"
        variant="secondary"
        busy={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, '')
            if (!backendUrl) throw new Error('The backend URL is not configured')
            const result = await apiFetch<{ downloadUrl: string }>(
              `${backendUrl}/student/courses/${encodeURIComponent(courseId)}/attachments/${encodeURIComponent(attachmentId)}/download`,
            )
            window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Attachment could not be opened')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Download aria-hidden="true" /> Open file
      </Button>
      <FormMessage>{error}</FormMessage>
    </div>
  )
}
