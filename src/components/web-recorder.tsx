'use client'

import { useEffect, useRef, useState } from 'react'
import type { IAgoraRTCClient, IRemoteVideoTrack } from 'agora-rtc-sdk-ng'
import { Fastboard, useFastboard } from '@netless/fastboard-react'
import { apiFetch, type WhiteboardJoinConfig } from '@danvic/api-client'

type Bootstrap = {
  appId: string
  channelName: string
  uid: number
  rtcToken: string
  whiteboard: WhiteboardJoinConfig | null
}

export function WebRecorder({ sessionId, token }: { sessionId: string; token: string }) {
  const [config, setConfig] = useState<Bootstrap | null>(null),
    [videos, setVideos] = useState<Array<{ uid: string | number; track: IRemoteVideoTrack }>>([])
  const client = useRef<IAgoraRTCClient | null>(null)
  useEffect(() => {
    void apiFetch<Bootstrap>(`/api/recorder/${sessionId}?token=${encodeURIComponent(token)}`).then(
      setConfig,
    )
  }, [sessionId, token])
  useEffect(() => {
    if (!config) return
    let disposed = false
    void (async () => {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
      const value = AgoraRTC.createClient({ mode: 'live', codec: 'vp8', role: 'audience' })
      client.current = value
      value.on('user-published', async (user, mediaType) => {
        await value.subscribe(user, mediaType)
        if (mediaType === 'audio') user.audioTrack?.play()
        if (mediaType === 'video' && user.videoTrack)
          setVideos((items) => [
            ...items.filter((item) => item.uid !== user.uid),
            { uid: user.uid, track: user.videoTrack! },
          ])
      })
      value.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video')
          setVideos((items) => items.filter((item) => item.uid !== user.uid))
      })
      await value.join(config.appId, config.channelName, config.rtcToken, config.uid)
      if (disposed) await value.leave()
    })()
    return () => {
      disposed = true
      void client.current?.leave()
    }
  }, [config])
  if (!config)
    return (
      <main className="lc-recorder">
        <h1>Preparing class recording…</h1>
      </main>
    )
  return (
    <main className="lc-recorder">
      <header>
        <strong>DANVIC live class</strong>
        <span>
          <i /> Recording
        </span>
      </header>
      <div className="lc-recorder-layout">
        <section className="lc-video-grid">
          {videos.map((video) => (
            <RecordedVideo key={video.uid} value={video} />
          ))}
        </section>
        {config.whiteboard && <RecorderWhiteboard config={config.whiteboard} />}
      </div>
    </main>
  )
}

function RecordedVideo({ value }: { value: { uid: string | number; track: IRemoteVideoTrack } }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) value.track.play(ref.current)
    return () => value.track.stop()
  }, [value])
  return (
    <div className="lc-video">
      <div className="lc-video-canvas" ref={ref} />
    </div>
  )
}
function RecorderWhiteboard({ config }: { config: WhiteboardJoinConfig }) {
  const app = useFastboard(() => ({
    sdkConfig: { appIdentifier: config.appIdentifier, region: 'us-sv' },
    joinRoom: {
      uid: 'cloud-recorder',
      uuid: config.roomUuid,
      roomToken: config.roomToken,
      isWritable: false,
    },
  }))
  return (
    <div className="lc-whiteboard-canvas">
      <Fastboard app={app} />
    </div>
  )
}
