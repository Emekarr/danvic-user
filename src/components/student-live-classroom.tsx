'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng'
import { Fastboard, useFastboard } from '@netless/fastboard-react'
import { Brand, Card } from '@danvic/ui'
import {
  apiFetch,
  type LiveJoinConfig,
  type LiveMessage,
  type LiveParticipant,
  type LiveState,
  type WhiteboardJoinConfig,
} from '@danvic/api-client'
import {
  Camera,
  CameraOff,
  Hand,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PenLine,
  ScreenShareOff,
  Users,
} from 'lucide-react'

export function StudentLiveClassroom({ sessionId }: { sessionId: string }) {
  const [join, setJoin] = useState<LiveJoinConfig | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void api<LiveJoinConfig>(`/api/live/live-sessions/${sessionId}/join`, {
      method: 'POST',
      body: '{}',
    })
      .then(setJoin)
      .catch((value) => setError(value instanceof Error ? value.message : 'Could not join'))
  }, [sessionId])
  if (!join)
    return (
      <div className="lc-joining">
        <Card className="lc-joining-card">
          <Brand />
          <div className="lc-joining-live">
            <span className="lc-live-dot" /> Live session
          </div>
          <div className="lc-joining-progress">
            <span className="lc-joining-spinner" aria-hidden="true" />
            <span className="lc-joining-step">Connecting to broadcast</span>
          </div>
          <h2>Joining live class…</h2>
          <p>This usually takes a few seconds.</p>
          {error && <p className="lc-error">{error}</p>}
        </Card>
      </div>
    )
  return <Classroom join={join} />
}

function Classroom({ join }: { join: LiveJoinConfig }) {
  const [state, setState] = useState<LiveState | null>(null),
    [error, setError] = useState(''),
    [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const rtc = useRtc(join, setError)
  const self = state?.participants.find((item) => item.id === join.participant.id)
  const session = (state?.session ?? join.session) as LiveState['session'] & {
    whiteboardActive?: boolean
    whiteboardUsedAt?: string | null
  }
  const whiteboardActive = Boolean(session.whiteboardActive && join.whiteboard)
  const whiteboardAvailable = Boolean(session.whiteboardUsedAt && join.whiteboard)
  const showWhiteboard = whiteboardAvailable && whiteboardOpen
  const refresh = useCallback(async () => {
    try {
      const value = await api<LiveState>(`/api/live/live-sessions/${join.session.id}/state`)
      setState(value)
      if (value.session.status === 'ended') {
        await rtc.leave()
        setError('This live class has ended because its time limit was reached.')
        return
      }
      const own = value.participants.find((item) => item.id === join.participant.id)
      if (!own || own.leftAt || own.bannedAt || own.kickedAt) {
        await rtc.leave()
        setError(
          own?.bannedAt ? 'You were banned from this class.' : 'You were removed from this class.',
        )
      } else {
        if (!own.microphoneOn && rtc.microphoneOn) await rtc.set('microphoneOn', false)
        if (!own.cameraOn && rtc.cameraOn) await rtc.set('cameraOn', false)
      }
    } catch {
      /* keep the active call during a transient poll failure */
    }
  }, [join.participant.id, join.session.id, rtc])
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [refresh])
  useEffect(() => {
    const leave = () => {
      void api(`/api/live/live-sessions/${join.session.id}/leave`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => undefined)
    }
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload()
    }
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', restore)
    return () => {
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('pageshow', restore)
    }
  }, [join.session.id])
  const update = async (
    field: 'microphoneOn' | 'cameraOn' | 'screenSharing' | 'handRaised',
    enabled: boolean,
  ) => {
    try {
      if (field !== 'handRaised') await rtc.set(field, enabled)
      await api(`/api/live/live-sessions/${join.session.id}/me`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: enabled }),
      })
      await refresh()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not update the live classroom.')
    }
  }
  return (
    <main className="lc-shell">
      <header className="lc-top">
        <div>
          <span className="lc-live-dot" /> Live class
        </div>
        <span className="lc-time-remaining">
          {join.session.expiresAt
            ? `Ends in ${remainingLabel(join.session.expiresAt)}`
            : 'Live now'}
        </span>
        {session.whiteboardUsedAt && (
          <span className={`lc-mode-status${whiteboardActive ? ' is-active' : ''}`}>
            {whiteboardActive ? 'Whiteboard active' : 'Whiteboard used'}
          </span>
        )}
        <span>{self?.canPublish ? 'You can speak' : 'Audience mode'}</span>
      </header>
      {error && <p className="lc-error">{error}</p>}
      <div className="lc-layout">
        <section className={`lc-stage${showWhiteboard ? ' lc-stage--whiteboard' : ''}`}>
          {showWhiteboard && join.whiteboard ? (
            <Whiteboard config={join.whiteboard} uid={`student-${join.participant.actorId}`} />
          ) : (
            <div className="lc-video-grid">
              {rtc.remoteVideos.length ? (
                rtc.remoteVideos.map((remote) => <RemoteVideo key={remote.uid} remote={remote} />)
              ) : (
                <div className="lc-video lc-video--waiting">
                  <CameraOff />
                  <strong>The author’s camera is off</strong>
                  <span>Audio and shared screens will appear automatically.</span>
                </div>
              )}
              {self?.canPublish && (
                <LocalVideo
                  track={rtc.cameraTrack}
                  cameraOn={rtc.cameraOn}
                  screenSharing={rtc.screenSharing}
                />
              )}
            </div>
          )}
        </section>
        <aside className="lc-sidebar">
          <Participants participants={state?.participants ?? []} />
          <Chat sessionId={join.session.id} messages={state?.messages ?? []} />
        </aside>
      </div>
      <footer className="lc-controls">
        <button
          disabled={!self?.canPublish || !rtc.joined}
          onClick={() => update('microphoneOn', !rtc.microphoneOn)}
        >
          {rtc.microphoneOn ? <Mic /> : <MicOff />}
          <span>{rtc.microphoneOn ? 'Mute' : 'Unmute'}</span>
        </button>
        <button
          disabled={!self?.canPublish || !rtc.joined}
          onClick={() => update('cameraOn', !rtc.cameraOn)}
        >
          {rtc.cameraOn ? <Camera /> : <CameraOff />}
          <span>{rtc.cameraOn ? 'Camera off' : 'Camera on'}</span>
        </button>
        <button
          disabled={!self?.canPublish || !rtc.joined}
          onClick={() => update('screenSharing', !rtc.screenSharing)}
        >
          {rtc.screenSharing ? <ScreenShareOff /> : <MonitorUp />}
          <span>Share screen</span>
        </button>
        <button
          className={self?.handRaised ? 'is-active' : ''}
          onClick={() => update('handRaised', !self?.handRaised)}
        >
          <Hand />
          <span>{self?.handRaised ? 'Lower hand' : 'Raise hand'}</span>
        </button>
        <button
          className={showWhiteboard ? 'is-active' : ''}
          disabled={!whiteboardAvailable}
          onClick={() => setWhiteboardOpen((value) => !value)}
        >
          <PenLine />
          <span>{showWhiteboard ? 'Show cameras' : 'Open whiteboard'}</span>
        </button>
      </footer>
    </main>
  )
}

function useRtc(join: LiveJoinConfig, onError: (value: string) => void) {
  const clientRef = useRef<IAgoraRTCClient | null>(null),
    audioRef = useRef<ILocalAudioTrack | null>(null),
    cameraRef = useRef<ICameraVideoTrack | null>(null),
    screenRef = useRef<ILocalVideoTrack | null>(null)
  const cameraPausedForScreenRef = useRef(false)
  const agoraRtcRef = useRef<typeof import('agora-rtc-sdk-ng').default | null>(null)
  const joinPromiseRef = useRef<Promise<void> | null>(null)
  const leavePromiseRef = useRef<Promise<void>>(Promise.resolve())
  const [microphoneOn, setMic] = useState(false),
    [cameraOn, setCamera] = useState(false),
    [screenSharing, setScreen] = useState(false),
    [joined, setJoined] = useState(false),
    [cameraTrack, setCameraTrack] = useState<ICameraVideoTrack | null>(null),
    [remoteVideos, setRemoteVideos] = useState<
      Array<{ uid: string | number; track: IRemoteVideoTrack }>
    >([])
  useEffect(() => {
    let disposed = false
    let client: IAgoraRTCClient | null = null
    const previousLeave = leavePromiseRef.current
    const connect = async () => {
      await previousLeave
      if (disposed) return
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
      if (disposed) return
      setJoined(false)
      agoraRtcRef.current = AgoraRTC
      const rtcClient = AgoraRTC.createClient({ mode: 'live', codec: 'vp8', role: join.role })
      client = rtcClient
      clientRef.current = rtcClient
      setRemoteVideos([])
      rtcClient.on('user-published', (user, mediaType) => {
        void rtcClient
          .subscribe(user, mediaType)
          .then(() => {
            if (mediaType === 'audio') user.audioTrack?.play()
            if (mediaType === 'video' && user.videoTrack)
              setRemoteVideos((items) => [
                ...items.filter((item) => item.uid !== user.uid),
                { uid: user.uid, track: user.videoTrack! },
              ])
          })
          .catch((value: unknown) =>
            onError(value instanceof Error ? value.message : 'Could not receive a live stream'),
          )
      })
      rtcClient.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video')
          setRemoteVideos((items) => items.filter((item) => item.uid !== user.uid))
      })
      rtcClient.on('user-left', (user) => {
        setRemoteVideos((items) => items.filter((item) => item.uid !== user.uid))
      })
      rtcClient.on('connection-state-change', (current) => {
        setJoined(current === 'CONNECTED' || current === 'RECONNECTING')
      })
      await rtcClient.join(join.appId, join.channelName, join.rtcToken, join.uid)
      if (disposed) await rtcClient.leave()
      else setJoined(true)
    }
    const joinPromise = connect().catch((value: unknown) => {
      onError(value instanceof Error ? value.message : 'Could not join Agora')
      throw value
    })
    joinPromiseRef.current = joinPromise
    void joinPromise.catch(() => undefined)
    return () => {
      disposed = true
      setJoined(false)
      for (const track of [audioRef.current, cameraRef.current, screenRef.current]) {
        track?.stop()
        track?.close()
      }
      if (joinPromiseRef.current === joinPromise) joinPromiseRef.current = null
      if (clientRef.current === client) clientRef.current = null
      const leavePromise = joinPromise.then(() => client?.leave()).catch(() => undefined)
      leavePromiseRef.current = leavePromise
      void leavePromise
    }
  }, [join, onError])
  const set = useCallback(
    async (field: 'microphoneOn' | 'cameraOn' | 'screenSharing', enabled: boolean) => {
      const client = clientRef.current
      const joinPromise = joinPromiseRef.current
      const AgoraRTC = agoraRtcRef.current
      if (!client || !joinPromise || !AgoraRTC)
        throw new Error('Still connecting to the live classroom.')
      const screenTrackPromise =
        field === 'screenSharing' && enabled ? AgoraRTC.createScreenVideoTrack({}, 'disable') : null
      const screenTrackValue = screenTrackPromise ? await screenTrackPromise : null
      await joinPromise
      if (clientRef.current !== client) return
      await client.setClientRole('host')
      if (field === 'microphoneOn') {
        if (!audioRef.current) audioRef.current = await AgoraRTC.createMicrophoneAudioTrack()
        await audioRef.current.setEnabled(enabled)
        if (enabled) await client.publish(audioRef.current)
        else await client.unpublish(audioRef.current)
        setMic(enabled)
      }
      if (field === 'cameraOn') {
        if (!cameraRef.current) {
          cameraRef.current = await AgoraRTC.createCameraVideoTrack()
          setCameraTrack(cameraRef.current)
        }
        await cameraRef.current.setEnabled(enabled)
        if (enabled) await client.publish(cameraRef.current)
        else await client.unpublish(cameraRef.current)
        setCamera(enabled)
      }
      if (field === 'screenSharing') {
        if (enabled) {
          const cameraTrack = cameraRef.current
          cameraPausedForScreenRef.current = Boolean(cameraTrack && cameraOn)
          if (cameraPausedForScreenRef.current && cameraTrack) {
            await client.unpublish(cameraTrack)
            await cameraTrack.setEnabled(false)
          }
          try {
            const screenTrack = Array.isArray(screenTrackValue)
              ? screenTrackValue[0]
              : screenTrackValue
            if (!screenTrack) throw new Error('Could not start screen sharing.')
            screenRef.current = screenTrack
            await client.publish(screenTrack)
            screenTrack.on('track-ended', () => {
              void client.unpublish(screenTrack).catch(() => undefined)
              screenTrack.stop()
              screenTrack.close()
              if (screenRef.current === screenTrack) screenRef.current = null
              setScreen(false)
            })
          } catch (error) {
            if (cameraPausedForScreenRef.current && cameraTrack) {
              await cameraTrack.setEnabled(true)
              await client.publish(cameraTrack)
            }
            cameraPausedForScreenRef.current = false
            throw error
          }
        } else if (screenRef.current) {
          await client.unpublish(screenRef.current)
          screenRef.current.stop()
          screenRef.current.close()
          screenRef.current = null
          if (cameraPausedForScreenRef.current && cameraRef.current) {
            await cameraRef.current.setEnabled(true)
            await client.publish(cameraRef.current)
          }
          cameraPausedForScreenRef.current = false
        }
        setScreen(enabled)
      }
    },
    [cameraOn],
  )
  const leave = useCallback(async () => {
    const client = clientRef.current
    clientRef.current = null
    setJoined(false)
    setRemoteVideos([])
    for (const ref of [audioRef, cameraRef, screenRef]) {
      ref.current?.stop()
      ref.current?.close()
      ref.current = null
    }
    setMic(false)
    setCamera(false)
    setScreen(false)
    setCameraTrack(null)
    await client?.leave()
  }, [])
  return useMemo(
    () => ({
      microphoneOn,
      cameraOn,
      screenSharing,
      cameraTrack,
      remoteVideos,
      joined,
      set,
      leave,
    }),
    [microphoneOn, cameraOn, screenSharing, cameraTrack, remoteVideos, joined, set, leave],
  )
}

function LocalVideo({
  track,
  cameraOn,
  screenSharing,
}: {
  track: ICameraVideoTrack | null
  cameraOn: boolean
  screenSharing: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (track && cameraOn && !screenSharing && ref.current) track.play(ref.current)
    return () => track?.stop()
  }, [track, cameraOn, screenSharing])
  return (
    <div className="lc-video" ref={containerRef}>
      <div ref={ref} className="lc-video-canvas">
        {(!cameraOn || screenSharing) && <CameraOff />}
      </div>
      <span>You</span>
      <FullscreenButton targetRef={containerRef} />
    </div>
  )
}
function RemoteVideo({ remote }: { remote: { uid: string | number; track: IRemoteVideoTrack } }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) remote.track.play(ref.current)
    return () => remote.track.stop()
  }, [remote])
  return (
    <div className="lc-video" ref={containerRef}>
      <div ref={ref} className="lc-video-canvas" />
      <span>Live video</span>
      <FullscreenButton targetRef={containerRef} />
    </div>
  )
}
function FullscreenButton({ targetRef }: { targetRef: { current: HTMLDivElement | null } }) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const update = () => setActive(document.fullscreenElement === targetRef.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [targetRef])
  return (
    <button
      type="button"
      className="lc-video-fullscreen"
      title={active ? 'Exit full screen' : 'View camera full screen'}
      aria-label={active ? 'Exit full screen' : 'View camera full screen'}
      onClick={() => {
        if (active) void document.exitFullscreen()
        else void targetRef.current?.requestFullscreen()
      }}
    >
      {active ? <Minimize2 /> : <Maximize2 />}
    </button>
  )
}
function remainingLabel(expiresAt: string): string {
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000))
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`
}
function Whiteboard({ config, uid }: { config: WhiteboardJoinConfig; uid: string }) {
  const app = useFastboard(() => ({
    sdkConfig: { appIdentifier: config.appIdentifier, region: 'us-sv' },
    joinRoom: {
      uid,
      uuid: config.roomUuid,
      roomToken: config.roomToken,
      isWritable: config.writable,
    },
  }))
  return (
    <section className="lc-whiteboard">
      <h3>Class whiteboard</h3>
      <div className="lc-whiteboard-canvas">
        <Fastboard app={app} />
      </div>
    </section>
  )
}
function Participants({ participants }: { participants: LiveParticipant[] }) {
  const active = participants.filter((item) => !item.leftAt)
  return (
    <section className="lc-panel">
      <h3>
        <Users /> Participants ({active.length})
      </h3>
      {active.map((person) => (
        <div className="lc-person" key={person.id}>
          <div>
            <strong>{person.displayName}</strong>
            <small>
              {person.actorType}
              {person.handRaised ? ' · ✋' : ''}
            </small>
          </div>
          <span>
            {person.microphoneOn ? '🎙️' : '🔇'} {person.cameraOn ? '📹' : ''}
          </span>
        </div>
      ))}
    </section>
  )
}
function Chat({ sessionId, messages }: { sessionId: string; messages: LiveMessage[] }) {
  const [body, setBody] = useState('')
  const send = async (kind: 'chat' | 'reaction', value: string) => {
    if (!value.trim()) return
    await api(`/api/live/live-sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ kind, body: value }),
    })
    setBody('')
  }
  return (
    <section className="lc-panel lc-chat">
      <h3>
        <MessageCircle /> Live chat
      </h3>
      <div className="lc-messages">
        {messages.map((message) => (
          <p key={message.id}>
            <strong>{message.displayName}</strong> {message.body}
          </p>
        ))}
      </div>
      <div className="lc-reactions">
        {['👍', '👏', '❤️', '🎉'].map((emoji) => (
          <button key={emoji} onClick={() => send('reaction', emoji)}>
            {emoji}
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void send('chat', body)
        }}
      >
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Message the class"
        />
        <button aria-label="Send">
          <MessageCircle />
        </button>
      </form>
    </section>
  )
}
async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init)
}
