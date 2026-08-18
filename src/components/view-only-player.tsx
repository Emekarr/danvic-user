'use client'
/* eslint-disable @next/next/no-img-element -- signed object-storage URLs cannot use the Next image optimizer. */

import { useEffect, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { apiFetch } from '@danvic/api-client'

export function ViewOnlyPlayer({ endpoint, media = true }: { endpoint: string; media?: boolean }) {
  const [source, setSource] = useState<{ url: string; kind: string; fileName: string } | null>(null),
    [error, setError] = useState('')
  useEffect(() => {
    const init: RequestInit = media
      ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }
      : { method: 'GET' }
    void apiFetch<{ playbackUrl?: string; viewUrl?: string; kind?: string; fileName?: string }>(endpoint, init)
      .then((value) => {
        const url = value.playbackUrl ?? value.viewUrl
        if (!url) throw new Error('Viewer could not be opened')
        setSource({ url, kind: value.kind ?? attachmentKind(value.fileName), fileName: value.fileName ?? '' })
      })
      .catch((value) =>
        setError(value instanceof Error ? value.message : 'Viewer could not be opened'),
      )
  }, [endpoint, media])
  useEffect(() => {
    const prevent = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['s', 'p'].includes(event.key.toLowerCase()))
        event.preventDefault()
    }
    window.addEventListener('keydown', prevent)
    return () => window.removeEventListener('keydown', prevent)
  }, [])
  if (error) return <p className="lc-error">{error}</p>
  if (!source) return <p>Preparing protected viewer…</p>
  return (
    <div className="vo-viewer" onContextMenu={(event) => event.preventDefault()}>
      <div className="vo-banner">
        <LockKeyhole /> View only · access expires automatically
      </div>
      {source.kind === 'image' ? (
        <img src={source.url} alt={source.fileName || 'Course image attachment'} />
      ) : source.kind === 'audio' ? (
        <audio controls controlsList="nodownload noplaybackrate" src={source.url}>
          Your browser cannot play this audio attachment.
        </audio>
      ) : source.kind === 'media' || source.kind === 'video' ? (
        <video
          controls
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          src={source.url}
        />
      ) : (
        <iframe
          src={source.url}
          title="Protected course content"
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        />
      )}
    </div>
  )
}

function attachmentKind(fileName?: string) {
  const extension = fileName?.split('?')[0]?.split('.').at(-1)?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'gif' || extension === 'webp')
    return 'image'
  if (extension === 'mp3' || extension === 'wav' || extension === 'ogg') return 'audio'
  if (extension === 'mp4' || extension === 'webm' || extension === 'mov') return 'video'
  return 'document'
}
