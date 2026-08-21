'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  ArrowLeft,
  Camera,
  CameraOff,
  Ellipsis,
  Hand,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PenLine,
  PhoneOff,
  ScreenShareOff,
  Send,
  SmilePlus,
  Users,
  X,
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
  const router = useRouter()
  const [state, setState] = useState<LiveState | null>(null),
    [error, setError] = useState(''),
    [whiteboardOpen, setWhiteboardOpen] = useState(false),
    [moreOpen, setMoreOpen] = useState(false),
    [reactionsOpen, setReactionsOpen] = useState(false),
    [detailsOpen, setDetailsOpen] = useState(false),
    [detailsTab, setDetailsTab] = useState<'messages' | 'people'>('messages')
  const reactionButtonRef = useRef<HTMLButtonElement>(null)
  const rtc = useRtc(join, setError)
  const self = state?.participants.find((item) => item.id === join.participant.id)
  const session = (state?.session ?? join.session) as LiveState['session'] & {
    whiteboardActive?: boolean
    whiteboardUsedAt?: string | null
  }
  const whiteboardActive = Boolean(session.whiteboardActive && join.whiteboard)
  const whiteboardAvailable = Boolean(session.whiteboardUsedAt && join.whiteboard)
  const showWhiteboard = whiteboardAvailable && whiteboardOpen
  const activeParticipants = (state?.participants ?? []).filter((participant) => !participant.leftAt)
  const otherParticipantCount = activeParticipants.filter((participant) => participant.id !== join.participant.id).length
  const hasOtherParticipants = otherParticipantCount > 0 || rtc.remoteVideos.length > 0
  const visibleParticipantCount = Math.max(activeParticipants.length, rtc.remoteVideos.length + 1)
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
        if (!own.canPublish) {
          await rtc.moveToAudience()
        } else {
          if (!own.microphoneOn && rtc.microphoneOn) await rtc.set('microphoneOn', false)
          if (!own.cameraOn && rtc.cameraOn) await rtc.set('cameraOn', false)
          if (!own.screenSharing && rtc.screenSharing) await rtc.set('screenSharing', false)
        }
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
  const sendReaction = async (value: string) => {
    try {
      await api(`/api/live/live-sessions/${join.session.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ kind: 'reaction', body: value }),
      })
      setReactionsOpen(false)
      await refresh()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not send your reaction.')
    }
  }
  const leaveClass = async () => {
    try {
      await api(`/api/live/live-sessions/${join.session.id}/leave`, { method: 'POST' })
      await rtc.leave()
      router.push('/courses')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not leave the classroom.')
    }
  }
  return (
    <main className="lc-shell">
      <header className="lc-top lc-top--studio">
        <button type="button" className="lc-minimize" aria-label="Minimize classroom" onClick={() => void leaveClass()}>
          <ArrowLeft />
        </button>
        <div className="lc-session-heading">
          <span className="lc-live-pill"><span className="lc-live-dot" /> Live</span>
          <span>
            <strong>Live classroom</strong>
          </span>
        </div>
        <div className="lc-session-meta">
          <span className="lc-time-remaining">
            {join.session.expiresAt
              ? `Ends in ${remainingLabel(join.session.expiresAt)}`
              : 'Live now'}
          </span>
          {session.whiteboardUsedAt && (
            <span className={`lc-mode-status${whiteboardActive ? ' is-active' : ''}`}>
              {whiteboardActive ? 'Whiteboard active' : 'Whiteboard ready'}
            </span>
          )}
          <span className={`lc-role-status${self?.canPublish ? ' is-on-stage' : ''}`}>
            {self?.canPublish ? 'On stage' : 'Audience'}
          </span>
        </div>
      </header>
      {error && <p className="lc-error" role="alert">{error}</p>}
      <div className="lc-layout">
        <section className={`lc-stage${showWhiteboard ? ' lc-stage--whiteboard' : ''}`}>
          {showWhiteboard && join.whiteboard ? (
            <Whiteboard config={join.whiteboard} uid={`student-${join.participant.actorId}`} />
          ) : (
            <div className="lc-video-grid">
              {rtc.remoteVideos.length ? (
                rtc.remoteVideos.map((remote) => <RemoteVideo key={remote.uid} remote={remote} />)
              ) : !hasOtherParticipants ? (
                <div className="lc-alone-state">
                  <Users />
                  <strong>Waiting for your tutor</strong>
                  <span>Audio, video and shared screens will appear automatically.</span>
                </div>
              ) : (
                <div className="lc-alone-state lc-presence-state">
                  <Users />
                  <strong>{visibleParticipantCount} people are in class</strong>
                  <span>No one is sharing a camera or screen right now. Class audio continues automatically.</span>
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
        <aside className={`lc-sidebar${detailsOpen ? ' is-open' : ''}`}>
          <div className="lc-details-heading">
            <div><strong>Class details</strong><span>People and messages</span></div>
            <button type="button" aria-label="Close class details" onClick={() => setDetailsOpen(false)}><X /></button>
          </div>
          <div className={`lc-details-tabs${detailsTab === 'people' ? ' is-people' : ''}`} role="tablist" aria-label="Class details">
            <button type="button" role="tab" aria-selected={detailsTab === 'messages'} aria-controls="student-class-messages" onClick={() => setDetailsTab('messages')}>Messages</button>
            <button type="button" role="tab" aria-selected={detailsTab === 'people'} aria-controls="student-class-people" onClick={() => setDetailsTab('people')}>People</button>
          </div>
          <div className="lc-details-pages">
            <div className={`lc-details-track is-${detailsTab}`}>
              <div className="lc-details-page" id="student-class-messages" role="tabpanel" aria-hidden={detailsTab !== 'messages'} inert={detailsTab !== 'messages'}>
                <Chat sessionId={join.session.id} messages={state?.messages ?? []} currentActorType="student" />
              </div>
              <div className="lc-details-page" id="student-class-people" role="tabpanel" aria-hidden={detailsTab !== 'people'} inert={detailsTab !== 'people'}>
                <Participants participants={state?.participants ?? []} />
              </div>
            </div>
          </div>
        </aside>
      </div>
      <footer className="lc-controls">
        {reactionsOpen && <ReactionTray anchorRef={reactionButtonRef} onSelect={sendReaction} onClose={() => setReactionsOpen(false)} />}
        <button
          ref={reactionButtonRef}
          type="button"
          className={rtc.cameraOn ? 'is-active' : 'is-off'}
          disabled={!self?.canPublish || !rtc.joined}
          onClick={() => update('cameraOn', !rtc.cameraOn)}
        >
          {rtc.cameraOn ? <Camera /> : <CameraOff />}
          <span>Camera</span>
        </button>
        <button
          type="button"
          className={rtc.microphoneOn ? 'is-active' : 'is-off'}
          disabled={!self?.canPublish || !rtc.joined}
          onClick={() => update('microphoneOn', !rtc.microphoneOn)}
        >
          {rtc.microphoneOn ? <Mic /> : <MicOff />}
          <span>Microphone</span>
        </button>
        <button
          type="button"
          className={reactionsOpen ? 'is-active' : ''}
          aria-expanded={reactionsOpen}
          onClick={() => { setMoreOpen(false); setReactionsOpen((value) => !value) }}
        >
          <SmilePlus />
          <span>React</span>
        </button>
        <button
          type="button"
          className={moreOpen ? 'is-active' : ''}
          aria-expanded={moreOpen}
          onClick={() => { setReactionsOpen(false); setMoreOpen((value) => !value) }}
        >
          <Ellipsis />
          <span>More</span>
        </button>
        <button type="button" className="is-danger" onClick={() => void leaveClass()}>
          <PhoneOff />
          <span>Leave</span>
        </button>
      </footer>
      {moreOpen && (
        <div className="lc-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <section className="lc-more-sheet" role="dialog" aria-modal="true" aria-label="More class controls" onClick={(event) => event.stopPropagation()}>
            <span className="lc-sheet-handle" />
            <div className="lc-sheet-heading"><div><strong>More options</strong><span>Choose what you want to do</span></div><button type="button" aria-label="Close controls" onClick={() => setMoreOpen(false)}><X /></button></div>
            <div className="lc-sheet-grid">
              <button type="button" className={self?.handRaised ? 'is-selected' : ''} onClick={() => void update('handRaised', !self?.handRaised)}><span><Hand /></span><strong>{self?.handRaised ? 'Lower hand' : 'Raise hand'}</strong><small>Let your tutor know you want to speak.</small></button>
              <button type="button" className={rtc.screenSharing ? 'is-selected' : ''} disabled={!self?.canPublish || !rtc.joined} onClick={() => { setMoreOpen(false); void update('screenSharing', !rtc.screenSharing) }}><span>{rtc.screenSharing ? <ScreenShareOff /> : <MonitorUp />}</span><strong>{rtc.screenSharing ? 'Stop sharing' : 'Share screen'}</strong><small>Present a browser tab or screen.</small></button>
              <button type="button" className={showWhiteboard ? 'is-selected' : ''} disabled={!whiteboardAvailable} onClick={() => { setWhiteboardOpen((value) => !value); setMoreOpen(false) }}><span><PenLine /></span><strong>{showWhiteboard ? 'Show cameras' : 'Whiteboard'}</strong><small>View the collaborative class board.</small></button>
              <button type="button" onClick={() => { setDetailsOpen(true); setMoreOpen(false) }}><span><Users /></span><strong>People & chat</strong><small>See attendees and class messages.</small></button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function useRtc(join: LiveJoinConfig, onError: (value: string) => void) {
  const clientRef = useRef<IAgoraRTCClient | null>(null),
    audioRef = useRef<ILocalAudioTrack | null>(null),
    cameraRef = useRef<ICameraVideoTrack | null>(null),
    screenRef = useRef<ILocalVideoTrack | null>(null)
  const cameraPausedForScreenRef = useRef(false)
  const roleRef = useRef(join.role)
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
      roleRef.current = join.role
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
  const stopScreenSharing = useCallback(async () => {
    const client = clientRef.current
    const joinPromise = joinPromiseRef.current
    if (!client || !joinPromise) return
    await joinPromise
    if (clientRef.current !== client) return

    const screenTrack = screenRef.current
    if (screenTrack) {
      await client.unpublish(screenTrack)
      if (screenRef.current === screenTrack) screenRef.current = null
      screenTrack.stop()
      screenTrack.close()
    }
    if (cameraPausedForScreenRef.current && cameraRef.current) {
      await cameraRef.current.setEnabled(true)
      await client.publish(cameraRef.current)
    }
    cameraPausedForScreenRef.current = false
    setScreen(false)
  }, [])
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
      if (enabled && roleRef.current !== 'host') {
        await client.setClientRole('host')
        roleRef.current = 'host'
      }
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
              if (screenRef.current !== screenTrack) return
              void (async () => {
                await stopScreenSharing()
                await api(`/api/live/live-sessions/${join.session.id}/me`, {
                  method: 'PATCH',
                  body: JSON.stringify({ screenSharing: false }),
                })
              })().catch((value: unknown) =>
                onError(
                  value instanceof Error
                    ? value.message
                    : 'Could not restore the camera after screen sharing.',
                ),
              )
            })
          } catch (error) {
            if (cameraPausedForScreenRef.current && cameraTrack) {
              await cameraTrack.setEnabled(true)
              await client.publish(cameraTrack)
            }
            cameraPausedForScreenRef.current = false
            throw error
          }
        } else await stopScreenSharing()
        if (enabled) setScreen(true)
      }
    },
    [cameraOn, join.session.id, onError, stopScreenSharing],
  )
  const moveToAudience = useCallback(async () => {
    const client = clientRef.current
    const joinPromise = joinPromiseRef.current
    if (!client || !joinPromise) return
    await joinPromise
    if (clientRef.current !== client) return

    const localTracks = new Set<unknown>([audioRef.current, cameraRef.current, screenRef.current])
    const publishedTracks = client.localTracks.filter((track) => localTracks.has(track))
    if (publishedTracks.length) await client.unpublish(publishedTracks).catch(() => undefined)

    cameraPausedForScreenRef.current = false
    for (const ref of [audioRef, cameraRef, screenRef]) {
      const track = ref.current
      ref.current = null
      track?.stop()
      track?.close()
    }
    setMic(false)
    setCamera(false)
    setScreen(false)
    setCameraTrack(null)

    if (roleRef.current !== 'audience') {
      await client.setClientRole('audience')
      roleRef.current = 'audience'
    }
  }, [])
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
      moveToAudience,
      leave,
    }),
    [
      microphoneOn,
      cameraOn,
      screenSharing,
      cameraTrack,
      remoteVideos,
      joined,
      set,
      moveToAudience,
      leave,
    ],
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
    <div className="lc-video lc-video--local" ref={containerRef}>
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
    <section className="lc-panel lc-participant-panel">
      <div className="lc-panel-heading">
        <h3><Users /> People</h3>
        <span>{active.length} in class</span>
      </div>
      <div className="lc-participants">
        {active.length ? active.map((person) => (
          <div className="lc-person" key={person.id}>
            <span className="lc-person-avatar" aria-hidden="true">{initials(person.displayName)}</span>
            <div className="lc-person-copy">
              <span className="lc-person-name">
                <strong>{person.displayName}</strong>
                {person.handRaised && <span className="lc-hand-raised"><Hand /> Hand raised</span>}
              </span>
              <small>{person.actorType === 'author' ? 'Tutor' : person.canPublish ? 'On stage' : 'Attendee'}</small>
            </div>
            <div className="lc-person-media" aria-label="Media status">
              {person.microphoneOn ? <Mic aria-label="Microphone on" /> : <MicOff aria-label="Microphone off" />}
              {person.cameraOn ? <Camera aria-label="Camera on" /> : <CameraOff aria-label="Camera off" />}
            </div>
          </div>
        )) : <p className="lc-panel-empty">Waiting for people to join.</p>}
      </div>
    </section>
  )
}
function Chat({ sessionId, messages, currentActorType }: { sessionId: string; messages: LiveMessage[]; currentActorType: LiveMessage['actorType'] }) {
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
      <div className="lc-messages">
        {messages.length ? messages.map((message) => (
          <article className={`lc-message${message.actorType === currentActorType ? ' is-own' : ''}${message.kind !== 'chat' ? ' is-event' : ''}`} key={message.id}>
            <span className="lc-message-author">{message.displayName}</span>
            <p>{message.body}</p>
          </article>
        )) : (
          <div className="lc-chat-empty"><MessageCircle /><strong>No messages yet</strong><span>Start the class conversation here.</span></div>
        )}
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
        <button type="submit" aria-label="Send message">
          <Send />
          <span>Send</span>
        </button>
      </form>
    </section>
  )
}

function ReactionTray({
  anchorRef,
  onSelect,
  onClose,
}: {
  anchorRef: { current: HTMLButtonElement | null }
  onSelect: (value: string) => Promise<void>
  onClose: () => void
}) {
  const trayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node
      if (!trayRef.current?.contains(target) && !anchorRef.current?.contains(target)) onClose()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [anchorRef, onClose])
  return (
    <div className="lc-dock-reactions" ref={trayRef} role="dialog" aria-label="Choose a reaction">
      {['👍', '👏', '❤️', '🎉', '😂', '🤔', '🔥', '🙌'].map((emoji) => (
        <button type="button" key={emoji} aria-label={`React with ${emoji}`} onClick={() => void onSelect(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  )
}
async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init)
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A'
}
