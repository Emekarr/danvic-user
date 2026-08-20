'use client'

import { useRef, useState, type ReactNode } from 'react'
import { apiFetch } from '@danvic/api-client'
import { Button, FormMessage } from '@danvic/ui'
import { Download, ExternalLink, X } from 'lucide-react'

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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [viewUrl, setViewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const attachmentPath = `/api/courses/${encodeURIComponent(courseId)}/attachments/${encodeURIComponent(attachmentId)}`
  const close = () => dialogRef.current?.close()

  const chooseAction = async () => {
    setBusy(true)
    setError('')
    try {
      const signed = await apiFetch<SignedView>(attachmentPath)
      setViewUrl(signed.viewUrl)
      dialogRef.current?.showModal()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This course material could not be opened')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    close()
    try {
      const signed = await apiFetch<SignedDownload>(`${attachmentPath}/download`)
      const link = document.createElement('a')
      link.href = signed.downloadUrl
      link.click()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This course material could not be downloaded')
    }
  }

  return (
    <>
      <button type="button" className="lr-resource-link lr-resource-link--button" onClick={() => void chooseAction()} disabled={busy}>
        <span className="lr-resource-icon" data-kind="file">{icon}</span>
        <span className="lr-resource-copy">
          <strong>{name}</strong>
          <small>{busy ? 'Preparing secure access…' : detail}</small>
        </span>
        <ExternalLink aria-hidden="true" />
      </button>
      <FormMessage>{error}</FormMessage>
      <dialog ref={dialogRef} className="lr-attachment-dialog" aria-labelledby={`attachment-action-${attachmentId}`}>
        <div className="lr-dialog-head">
          <h2 id={`attachment-action-${attachmentId}`}>Open course material</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={close}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="lr-dialog-body">
          <p className="lr-dialog-question">Would you like to view this file in a new tab or download it?</p>
        </div>
        <div className="lr-dialog-footer">
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          <Button type="button" variant="secondary" onClick={() => void download()}>
            <Download aria-hidden="true" /> Download
          </Button>
          <Button
            type="button"
            onClick={() => {
              close()
              window.open(viewUrl, '_blank', 'noopener,noreferrer')
            }}
          >
            <ExternalLink aria-hidden="true" /> View in new tab
          </Button>
        </div>
      </dialog>
    </>
  )
}
