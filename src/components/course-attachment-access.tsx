'use client'

import { useState } from 'react'
import { apiFetch } from '@danvic/api-client'
import { Button, FormMessage } from '@danvic/ui'
import { Download } from 'lucide-react'

type SignedDownload = { downloadUrl: string }

export function CourseAttachmentDownloadButton({
  courseId,
  attachmentId,
}: {
  courseId: string
  attachmentId: string
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const attachmentPath = `/api/courses/${encodeURIComponent(courseId)}/attachments/${encodeURIComponent(attachmentId)}`

  const download = async () => {
    setDownloading(true)
    setError('')
    try {
      const signed = await apiFetch<SignedDownload>(`${attachmentPath}/download`)
      const link = document.createElement('a')
      link.href = signed.downloadUrl
      link.download = ''
      link.hidden = true
      document.body.append(link)
      link.click()
      link.remove()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This course material could not be downloaded')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="lr-attachment-download">
      <Button type="button" size="md" busy={downloading} onClick={() => void download()}>
        <Download aria-hidden="true" /> {downloading ? 'Downloading…' : 'Download'}
      </Button>
      <FormMessage>{error}</FormMessage>
    </div>
  )
}
