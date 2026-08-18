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
            const result = await apiFetch<{ downloadUrl: string }>(
              `/api/courses/${courseId}/attachments/${attachmentId}`,
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
