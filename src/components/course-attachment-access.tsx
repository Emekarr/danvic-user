'use client'

import { useState, type ReactNode } from 'react'
import { apiFetch } from '@danvic/api-client'
import { FormMessage } from '@danvic/ui'
import { Download, ExternalLink } from 'lucide-react'

type SignedView = { viewUrl: string; fileName?: string }
type SignedDownload = { downloadUrl: string }

export function CourseAttachmentAccess({
  courseId,
  attachmentId,
  name,
  icon,
  detail,
}: {
  courseId: string
  attachmentId: string
  name: string
  icon: ReactNode
  detail: string
}) {
  const [busyAction, setBusyAction] = useState<'open' | 'download' | null>(null)
  const [error, setError] = useState('')

  const attachmentPath = `/api/courses/${encodeURIComponent(courseId)}/attachments/${encodeURIComponent(attachmentId)}`

  const open = async () => {
    const newTab = window.open('about:blank', '_blank')
    if (newTab) newTab.opener = null
    setBusyAction('open')
    setError('')
    try {
      const signed = await apiFetch<SignedView>(`${attachmentPath}/view`)
      if (newTab) newTab.location.replace(signed.viewUrl)
      else window.open(signed.viewUrl, '_blank', 'noopener,noreferrer')
    } catch (cause) {
      newTab?.close()
      setError(cause instanceof Error ? cause.message : 'This course material could not be opened')
    } finally {
      setBusyAction(null)
    }
  }

  const download = async () => {
    setBusyAction('download')
    setError('')
    try {
      const signed = await apiFetch<SignedDownload>(`${attachmentPath}/download`)
      const link = document.createElement('a')
      link.href = signed.downloadUrl
      link.click()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This course material could not be downloaded')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <>
      <div className="lr-resource-link lr-resource-link--file-access">
        <span className="lr-resource-icon" data-kind="file">{icon}</span>
        <span className="lr-resource-copy">
          <strong>{name}</strong>
          <small>{busyAction ? 'Preparing secure access…' : detail}</small>
        </span>
        <span className="lr-resource-actions">
          <button type="button" className="lr-resource-action" onClick={() => void download()} disabled={busyAction !== null}>
            <Download aria-hidden="true" /> {busyAction === 'download' ? 'Downloading…' : 'Download'}
          </button>
          <button type="button" className="lr-resource-action lr-resource-action--open" onClick={() => void open()} disabled={busyAction !== null}>
            <ExternalLink aria-hidden="true" /> {busyAction === 'open' ? 'Opening…' : 'Open'}
          </button>
        </span>
      </div>
      <FormMessage>{error}</FormMessage>
    </>
  )
}
