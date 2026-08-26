'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { notFound, usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  apiFetch,
  certificateNumberSchema,
  type Assessment,
  type Certificate,
  type CoursePreview,
  type LiveRecording,
  type LiveSession,
  type StudentCourseAggregate,
  type StudentEnrollmentSummary,
  type StudentProfile,
} from '@danvic/api-client'
import { Badge, Card, EmptyState, PageHeader } from '@danvic/ui'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  LockKeyhole,
  MessageSquareText,
  Play,
  Radio,
  ShieldX,
  Star,
  Video,
} from 'lucide-react'
import { CourseStudyPlayer } from '@/components/course-study-player'
import { ViewOnlyPlayer } from '@/components/view-only-player'
import { CourseAttachmentDownloadButton } from '@/components/course-attachment-access'
import { AssessmentPlayer, StartAssessmentButton } from '@/components/assessment-player'
import { AuthorRating } from '@/components/author-rating'
import {
  CourseBookmarkButton,
  EnrollButton,
  PaidEnrollButton,
} from '@/components/course-participation'
import { CertificateActions } from '@/components/certificate-actions'
import { CourseCover } from '@/components/course-cover-display'
import { LearnerAppShell } from '@/components/learner-app-shell'
import { LearnerShellLoading, LoadingState } from '@/components/loading-state'
import { StaticRouteLink } from '@/components/static-route-link'
import {
  useAssessment,
  useAssessmentAttempt,
  useAuthorProfile,
  useCertificate,
  useCourseAggregate,
  useLiveSession,
  useRecordings,
  useResource,
} from '@/lib/data'
import {
  assessmentAttemptHref,
  assessmentHref,
  authorHref,
  courseHref,
  type CoursePageView,
} from '@/lib/course-route'
import styles from '@/components/author-detail.module.css'

const StudentLiveClassroom = dynamic(
  () => import('@/components/student-live-classroom').then((module) => module.StudentLiveClassroom),
  {
    ssr: false,
    loading: () => <p className="ad-empty-line">Joining the live classroom…</p>,
  },
)

const WebRecorder = dynamic(
  () => import('@/components/web-recorder').then((module) => module.WebRecorder),
  {
    ssr: false,
    loading: () => <p className="ad-empty-line">Preparing the recorder…</p>,
  },
)

const formatNaira = (amountKobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amountKobo / 100)

const formatDuration = (seconds: number | null) => {
  if (!seconds) return 'Duration pending'
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60),
    rest = seconds % 60
  return [hours, minutes, rest]
    .filter((_, index) => index > 0 || hours > 0)
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

function runningDurationLabel(startedAt: string, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const hours = Math.floor(elapsedSeconds / 3600)
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  if (hours) return `${hours} hr${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} min` : ''}`
  if (minutes) return `${minutes} min`
  return 'less than a minute'
}

function CourseProgress({ percent, className }: { percent: number; className: string }) {
  return (
    <span className={className} aria-label={`${percent}% course progress`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="lr-course-progress-track" cx="18" cy="18" r="15.5" />
        <circle
          className="lr-course-progress-value"
          cx="18"
          cy="18"
          r="15.5"
          pathLength="100"
          strokeDasharray={`${percent} 100`}
        />
      </svg>
      <span>{percent}%</span>
    </span>
  )
}

function LiveSessionTiming({ session }: { session: LiveSession }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  if (!session.startedAt) return null
  return (
    <>
      <span>
        <CalendarClock aria-hidden="true" /> Started {new Date(session.startedAt).toLocaleString()}
      </span>
      <span>
        <Clock3 aria-hidden="true" /> Running for {runningDurationLabel(session.startedAt, now)}
      </span>
    </>
  )
}

export function CourseView({ courseId }: { courseId: string }) {
  const router = useRouter()
  const query = useSearchParams()
  const paymentSucceeded = query.get('payment') === 'success'
  const [viewer, setViewer] = useState<StudentProfile | null | undefined>(undefined)
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{
    phase: 'loading' | 'participating' | 'preview' | 'unavailable'
    aggregate: StudentCourseAggregate | null
    session: LiveSession | null
    sessions: LiveSession[]
    recordings: LiveRecording[]
    finalAssessment: Assessment | null
    preview: CoursePreview | null
    canEnroll: boolean
    canBookmark: boolean
    bookmarked: boolean
    upcomingLive: boolean
    message: string
    scheduled: boolean
  }>({
    phase: 'loading',
    aggregate: null,
    session: null,
    sessions: [],
    recordings: [],
    finalAssessment: null,
    preview: null,
    canEnroll: false,
    canBookmark: false,
    bookmarked: false,
    upcomingLive: false,
    message: '',
    scheduled: false,
  })
  useEffect(() => {
    let active = true
    void (async () => {
      const resolvedViewer = await apiFetch<{ student: StudentProfile }>('/api/auth/me')
        .then((value) => value.student)
        .catch(() => null)
      const signedIn = Boolean(resolvedViewer)
      if (active) setViewer(resolvedViewer)
      let aggregate: StudentCourseAggregate | null = null
      let aggregateCode = ''
      let aggregateMessage = ''
      if (signedIn) {
        try {
          aggregate = await apiFetch<StudentCourseAggregate>(
            `/api/courses/${encodeURIComponent(courseId)}`,
          )
        } catch (cause) {
          aggregateCode = (cause as { code?: string }).code ?? ''
          aggregateMessage =
            cause instanceof Error ? cause.message : 'The enrolled course could not be loaded.'
        }
      }
      if (!active) return
      if (aggregate) {
        const [sessionsValue, recordingsValue, assessmentsValue] = await Promise.all([
          apiFetch<{ sessions: LiveSession[] }>(
            `/api/live/courses/${encodeURIComponent(courseId)}/live-sessions`,
          ).catch(() => null),
          apiFetch<{ recordings: LiveRecording[] }>(
            `/api/live/courses/${encodeURIComponent(courseId)}/recordings`,
          ).catch(() => null),
          apiFetch<{ assessments: Assessment[] }>('/api/assessments').catch(() => null),
        ])
        if (!active) return
        const sessions = [...(sessionsValue?.sessions ?? [])].sort(
          (left, right) =>
            new Date(right.scheduledAt ?? right.createdAt).getTime() -
            new Date(left.scheduledAt ?? left.createdAt).getTime(),
        )
        setState({
          phase: 'participating',
          aggregate,
          session: sessions.find((item) => item.status === 'live') ?? sessions[0] ?? null,
          sessions,
          recordings: recordingsValue?.recordings ?? [],
          finalAssessment:
            (assessmentsValue?.assessments ?? []).find((item) => item.courseId === courseId) ??
            null,
          preview: null,
          canEnroll: false,
          canBookmark: false,
          bookmarked: false,
          upcomingLive: false,
          message: '',
          scheduled: false,
        })
        return
      }
      if (
        signedIn &&
        aggregateCode !== 'ENROLLMENT_REQUIRED' &&
        aggregateCode !== 'COURSE_NOT_AVAILABLE'
      ) {
        setState({
          phase: 'unavailable',
          aggregate: null,
          session: null,
          sessions: [],
          recordings: [],
          finalAssessment: null,
          preview: null,
          canEnroll: false,
          canBookmark: false,
          bookmarked: false,
          upcomingLive: false,
          message: aggregateMessage,
          scheduled: false,
        })
        return
      }
      try {
        const preview = await apiFetch<CoursePreview>(
          `/api/catalog/courses/${encodeURIComponent(courseId)}`,
        )
        const upcomingLive =
          preview.course.type === 'live' &&
          Boolean(preview.course.scheduledAt) &&
          new Date(preview.course.scheduledAt!).getTime() > Date.now()
        const saved =
          signedIn && upcomingLive
            ? await apiFetch<{ bookmarks: Array<{ courseId: string; enabled: boolean }> }>(
                '/api/course-bookmarks',
              ).catch(() => ({ bookmarks: [] }))
            : { bookmarks: [] }
        if (active)
          setState({
            phase: 'preview',
            aggregate: null,
            session: null,
            sessions: [],
            recordings: [],
            finalAssessment: null,
            preview,
            canEnroll: signedIn && aggregateCode === 'ENROLLMENT_REQUIRED' && !upcomingLive,
            canBookmark: signedIn && upcomingLive,
            bookmarked: saved.bookmarks.some((item) => item.courseId === courseId && item.enabled),
            upcomingLive,
            message: '',
            scheduled: false,
          })
      } catch (cause) {
        if (active)
          setState({
            phase: 'unavailable',
            aggregate: null,
            session: null,
            sessions: [],
            recordings: [],
            finalAssessment: null,
            preview: null,
            canEnroll: false,
            canBookmark: false,
            bookmarked: false,
            upcomingLive: false,
            message: cause instanceof Error ? cause.message : 'The course could not be loaded.',
            scheduled: (cause as { code?: string }).code === 'COURSE_NOT_AVAILABLE',
          })
      }
    })()
    return () => {
      active = false
    }
  }, [courseId, revision])

  if (state.phase === 'loading') return <LearnerShellLoading label="Loading the course…" />

  if (state.phase === 'participating' && state.aggregate) {
    const value = state.aggregate
    const { course, modules, completedModuleIds, enrollment } = value
    const completed = new Set(completedModuleIds)
    const progressResetHistory = (
      enrollment as typeof enrollment & {
        progressResetHistory?: Array<{
          resetAt: string
          completedModuleIds: string[]
        }>
      }
    ).progressResetHistory
    const latestProgressReset = progressResetHistory?.at(-1) ?? null
    const modulesComplete =
      modules.length === 0 || modules.every((module) => completed.has(module.id))
    const progressPercent = enrollment.completedAt
      ? 100
      : modules.length
        ? Math.round((completed.size / modules.length) * 100)
        : 0
    const finalAttempt = state.finalAssessment?.attempt ?? null
    return (
      <LearnerAppShell student={viewer ?? null}>
        <div className="lr-course-detail-page">
          {latestProgressReset ? (
            <Card style={{ marginBottom: 20 }}>
              <div className="sb-card-body">
                <Badge tone="blue" dot>
                  Course updated
                </Badge>
                <p style={{ marginTop: 10 }}>
                  The course modules changed on{' '}
                  {new Date(latestProgressReset.resetAt).toLocaleDateString('en-NG')}. Your active
                  progress was restarted from module one; your previous position of{' '}
                  {latestProgressReset.completedModuleIds.length} completed module
                  {latestProgressReset.completedModuleIds.length === 1 ? '' : 's'} remains in the
                  course history.
                </p>
              </div>
            </Card>
          ) : null}
          {paymentSucceeded ? (
            <Card style={{ marginBottom: 20 }}>
              <div className="sb-card-body">
                <Badge tone="green" dot>
                  Payment verified
                </Badge>
                <p style={{ marginTop: 10 }}>Your course access is now active.</p>
              </div>
            </Card>
          ) : null}
          <button
            type="button"
            className="lr-course-mobile-back"
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/courses'))}
          >
            <ArrowLeft aria-hidden="true" /> Back
          </button>
          <PageHeader
            eyebrow={course.type === 'live' ? 'Live course' : 'Premade course'}
            title={course.name}
            description={`${course.durationMinutes} minutes of structured learning.`}
            actions={
              <>
                <span className="lr-course-type">
                  <Badge tone={course.type === 'live' ? 'violet' : 'blue'}>{course.type}</Badge>
                </span>
                <span className="lr-course-status">
                  <Badge tone={enrollment.completedAt ? 'green' : 'blue'} dot>
                    {enrollment.completedAt ? 'Completed' : 'In progress'}
                  </Badge>
                </span>
                <CourseProgress
                  percent={progressPercent}
                  className="lr-course-progress lr-course-progress--header"
                />
                <Link
                  href={courseHref(course.id, 'study')}
                  className="sb-button sb-button--primary sb-button--md lr-course-resume"
                >
                  Resume studying
                </Link>
                {course.type === 'live' && state.session?.status === 'live' ? (
                  <Link
                    href={courseHref(course.id, 'live', state.session.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sb-button sb-button--primary sb-button--md lr-course-resume"
                  >
                    <Radio /> Join class
                  </Link>
                ) : null}
                {state.recordings.length ? (
                  <Link
                    href={courseHref(course.id, 'recordings')}
                    className="sb-button sb-button--secondary sb-button--md"
                  >
                    <Play /> View recordings
                  </Link>
                ) : null}
              </>
            }
          />
          <div className="sb-course-meta" style={{ marginBottom: 28 }}>
            {course.type === 'live' && state.session?.status === 'live' ? (
              <LiveSessionTiming session={state.session} />
            ) : (
              <span>
                <Clock3 aria-hidden="true" /> {course.durationMinutes} minutes
              </span>
            )}
            {course.type === 'live' && state.session?.status !== 'live' && course.scheduledAt ? (
              <span>
                <CalendarClock aria-hidden="true" /> Scheduled for{' '}
                {new Date(course.scheduledAt).toLocaleString()}
              </span>
            ) : course.type !== 'live' && course.scheduledAt ? (
              <span>
                <CalendarClock aria-hidden="true" /> Available since{' '}
                {new Date(course.scheduledAt).toLocaleString()}
              </span>
            ) : null}
          </div>
          <CourseCover course={course} className="lr-course-hero-media" />
          <StaticRouteLink
            href={authorHref(course.createdByAuthorId)}
            className="lr-author-link lr-author-link--inline"
          >
            Meet the course author
          </StaticRouteLink>
          {state.sessions.some(
            (item) => item.status === 'live' || Boolean(item.scheduledAt),
          ) ? (
            <Card style={{ marginBottom: 20 }}>
              <div className="sb-card-body">
                <Badge tone="violet" dot>
                  Live classes
                </Badge>
                <p style={{ marginTop: 10 }}>
                  You can join a class only while it is live. Everyone enrolled is notified by
                  email when a new class is scheduled.
                </p>
                <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
                  {state.sessions
                    .filter((item) => item.status === 'live' || Boolean(item.scheduledAt))
                    .map((item) => (
                    <li
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '6px 0',
                      }}
                    >
                      <span>
                        <strong>
                          {item.scheduledAt
                            ? new Date(item.scheduledAt).toLocaleString()
                            : 'Unscheduled class'}
                        </strong>{' '}
                        · {item.durationMinutes} min{' '}
                        <Badge
                          tone={
                            item.status === 'live'
                              ? 'green'
                              : item.status === 'ended'
                                ? 'blue'
                                : 'violet'
                          }
                        >
                          {item.status}
                        </Badge>
                      </span>
                      {item.status === 'live' ? (
                        <Link
                          href={courseHref(course.id, 'live', item.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sb-button sb-button--primary sb-button--sm"
                        >
                          Join
                        </Link>
                      ) : null}
                    </li>
                      ))
                    }
                </ul>
              </div>
            </Card>
          ) : null}
          {state.finalAssessment && !enrollment.completedAt ? (
            <Card className="as-course-final">
              <div>
                <Badge tone="violet">Final assessment</Badge>
                <h2>{state.finalAssessment.title}</h2>
                <p>
                  {!finalAttempt
                    ? modulesComplete
                      ? 'You have completed the learning modules. Take this assessment to finalise the course.'
                      : 'Complete every module to unlock the final assessment.'
                    : finalAttempt.status === 'pending_review'
                      ? 'Your responses were submitted and are awaiting author review.'
                      : finalAttempt.passed
                        ? 'You passed the final assessment.'
                        : 'The assessment was graded; open your results for details.'}
                </p>
              </div>
              {finalAttempt && finalAttempt.status === 'pending_review' ? (
                <span className="sb-button sb-button--soft sb-button--md" aria-disabled="true">
                  Awaiting grading
                </span>
              ) : finalAttempt && finalAttempt.status === 'graded' ? (
                <StaticRouteLink
                  href={assessmentAttemptHref(finalAttempt.id)}
                  className="sb-button sb-button--primary sb-button--md"
                >
                  See results
                </StaticRouteLink>
              ) : modulesComplete && state.finalAssessment.availability === 'open' ? (
                <StaticRouteLink
                  href={assessmentHref(state.finalAssessment.id)}
                  className="sb-button sb-button--primary sb-button--md"
                >
                  Take final assessment
                </StaticRouteLink>
              ) : (
                <span className="sb-button sb-button--soft sb-button--md" aria-disabled="true">
                  {!modulesComplete
                    ? 'Locked'
                    : state.finalAssessment.availability === 'scheduled'
                      ? `Opens ${new Date(state.finalAssessment.opensAt).toLocaleString()}`
                      : 'Assessment closed'}
                </span>
              )}
            </Card>
          ) : null}
          {enrollment.completedAt && value.certificate ? (
            <section className="lr-cert-complete">
              <div className="lr-cert-complete-head">
                <span className="lr-cert-complete-icon">
                  <CheckCircle2 aria-hidden="true" />
                </span>
                <div className="lr-cert-complete-heading">
                  <Badge tone="green">Course completed</Badge>
                  <h2>You have finished this course</h2>
                  <p>
                    {state.finalAssessment
                      ? 'You completed every course module and the final assessment. Your verified certificate is ready.'
                      : 'You completed every course module. Your verified certificate is ready.'}
                  </p>
                </div>
              </div>
              <div className="lr-cert-complete-actions">
                <CertificateActions certificate={value.certificate} />
              </div>
            </section>
          ) : null}
          {enrollment.completedAt ? (
            <AuthorRating courseId={course.id} initialRating={value.authorRating} />
          ) : null}
        </div>
      </LearnerAppShell>
    )
  }

  if (state.phase === 'preview' && state.preview) {
    const { course, modules } = state.preview
    const upcomingLive = state.upcomingLive
    return (
      <LearnerAppShell student={viewer ?? null}>
        <div className="lr-course-preview">
          <PageHeader
            eyebrow={course.type === 'live' ? 'Live course' : 'Premade course'}
            title={course.name}
            description={`${course.durationMinutes} minutes across ${modules.length} module${modules.length === 1 ? '' : 's'}. Explore the outline before enrolling.`}
            actions={
              <span className="lr-course-preview-labels">
                <span>{course.type === 'live' ? 'Live course' : 'Premade course'}</span>
                <span>{upcomingLive ? 'Scheduled' : 'Available'}</span>
                <span>{course.accessType === 'paid' ? formatNaira(course.priceKobo) : 'Free'}</span>
              </span>
            }
          />
          <div className="sb-course-meta lr-course-preview-meta">
            <span>
              <Clock3 aria-hidden="true" /> {course.durationMinutes} minutes
            </span>
            {course.scheduledAt ? (
              <span>
                <CalendarClock aria-hidden="true" /> {upcomingLive ? 'Starts' : 'Available since'}{' '}
                {new Date(course.scheduledAt).toLocaleString()}
              </span>
            ) : null}
          </div>
          <CourseCover course={course} className="lr-course-hero-media" />
          <StaticRouteLink
            href={authorHref(course.createdByAuthorId)}
            className="lr-author-link lr-author-link--inline"
          >
            Meet the course author
          </StaticRouteLink>
          <section className="lr-course-preview-access">
            <div className="lr-course-preview-access-content">
              <div>
                <h2>{upcomingLive ? 'Save your place' : 'Ready to participate?'}</h2>
                <p>
                  {upcomingLive
                    ? 'Bookmark this course and we will email you 30 minutes and 10 minutes before it starts.'
                    : course.accessType === 'paid'
                      ? 'Complete a secure Paystack payment to unlock this course.'
                      : 'Sign in and enroll to unlock this free course.'}
                </p>
              </div>
              {upcomingLive && state.canBookmark ? (
                <CourseBookmarkButton courseId={course.id} initialBookmarked={state.bookmarked} />
              ) : upcomingLive ? (
                <Link
                  href={`/login?next=${encodeURIComponent(courseHref(course.id))}`}
                  className="sb-button sb-button--primary sb-button--md"
                >
                  Sign in to bookmark
                </Link>
              ) : state.canEnroll ? (
                course.accessType === 'paid' ? (
                  <PaidEnrollButton
                    courseId={course.id}
                    priceKobo={course.priceKobo}
                    onEnrolled={() => setRevision((value) => value + 1)}
                  />
                ) : (
                  <EnrollButton
                    courseId={course.id}
                    onEnrolled={() => setRevision((value) => value + 1)}
                  />
                )
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(courseHref(course.id))}`}
                  className="sb-button sb-button--primary sb-button--md"
                >
                  Sign in to enroll
                </Link>
              )}
            </div>
          </section>
          <section className="lr-course-preview-modules" aria-label="Course modules">
            {modules.map((module, index) => (
              <article className="lr-course-preview-module" key={module.id}>
                <p className="sb-module-index">Module {index + 1}</p>
                <h2>{module.title}</h2>
                <p className="sb-module-content">
                  <LockKeyhole aria-hidden="true" /> Sign in and enroll to read this module’s
                  writeup.
                </p>
              </article>
            ))}
          </section>
        </div>
      </LearnerAppShell>
    )
  }

  return (
    <LearnerAppShell student={viewer ?? null}>
      <div>
        <Card className="sb-empty-state">
          <span className="sb-empty-icon">
            {state.scheduled ? (
              <CalendarClock aria-hidden="true" />
            ) : (
              <LockKeyhole aria-hidden="true" />
            )}
          </span>
          <h3>{state.scheduled ? 'This course is scheduled' : 'Course unavailable'}</h3>
          <p>{state.message}</p>
          <Link href="/catalog" className="sb-button sb-button--primary sb-button--md">
            Return to catalog
          </Link>
        </Card>
      </div>
    </LearnerAppShell>
  )
}

export function StudyView({ courseId }: { courseId: string }) {
  const router = useRouter()
  const { data, loading, error } = useCourseAggregate(courseId)
  useEffect(() => {
    if (error) router.replace(courseHref(courseId))
  }, [error, router, courseId])
  if (loading)
    return (
      <LearnerAppShell>
        <LoadingState label="Loading your course…" />
      </LearnerAppShell>
    )
  if (error || !data)
    return (
      <p className="ad-empty-line" data-tone="error">
        {error || 'Could not load your course.'}
      </p>
    )
  return <CourseStudyPlayer value={data} />
}

export function LiveView({
  courseId,
  sessionId,
}: {
  courseId: string
  sessionId?: string | undefined
}) {
  const latest = useLiveSession(courseId)
  const specific = useResource<{ session: LiveSession }>(
    sessionId ? `/api/live/live-sessions/${encodeURIComponent(sessionId)}/state` : '/api/auth/me',
    false,
    Boolean(sessionId),
  )
  if (latest.loading || (sessionId && specific.loading))
    return <LearnerShellLoading label="Checking the live session…" />
  const session = sessionId ? specific.data?.session ?? null : latest.data?.session ?? null
  const error = sessionId ? specific.error : latest.error
  if (error || !session || session.status !== 'live')
    return (
      <LearnerAppShell>
        <EmptyState
          icon={<Radio aria-hidden="true" />}
          title="The class is not live"
          description={
            error ||
            (session?.status === 'ended'
              ? 'This live class has ended.'
              : 'The author has not started this live class yet.')
          }
          action={
            <Link
              href={courseHref(courseId)}
              className="sb-button sb-button--secondary sb-button--md"
            >
              Back to course
            </Link>
          }
        />
      </LearnerAppShell>
    )
  return <StudentLiveClassroom sessionId={session.id} />
}

export function RecordingsView({ courseId }: { courseId: string }) {
  const { data, loading, error } = useRecordings(courseId)
  if (loading)
    return (
      <LearnerAppShell>
        <LoadingState label="Loading class recordings…" />
      </LearnerAppShell>
    )
  if (error)
    return (
      <LearnerAppShell>
        <p className="ad-empty-line" data-tone="error">
          {error}
        </p>
      </LearnerAppShell>
    )
  const recordings = data ?? []
  return (
    <LearnerAppShell>
      <div>
        <PageHeader
          eyebrow="Course library"
          title="Class recordings"
          description="Each start/stop interval is listed separately. Playback is enrollment-gated and view-only."
          actions={
            <Link href={courseHref(courseId)} className="sb-button sb-button--ghost sb-button--md">
              Back to course
            </Link>
          }
        />
        <div className="sb-module-list">
          {recordings.map((recording) => (
            <Card className="sb-list-row" key={recording.id}>
              <div>
                <div className="sb-page-actions">
                  <Video />
                  <h2>Recording {recording.sequence}</h2>
                  <Badge
                    tone={
                      recording.status === 'ready'
                        ? 'green'
                        : recording.status === 'failed'
                          ? 'red'
                          : 'blue'
                    }
                  >
                    {recording.status}
                  </Badge>
                </div>
                <p>
                  {new Date(recording.startedAt).toLocaleString()} ·{' '}
                  {recording.type === 'web' ? 'Full classroom page' : 'Audio only'}
                </p>
                <span className="sb-cell-secondary">
                  <Clock3 /> {formatDuration(recording.durationSeconds)}
                </span>
              </div>
              {recording.status === 'ready' ? (
                <Link
                  href={courseHref(courseId, 'recording', recording.id)}
                  className="sb-button sb-button--primary sb-button--md"
                >
                  <Play /> Watch
                </Link>
              ) : null}
            </Card>
          ))}
          {!recordings.length ? (
            <Card className="sb-card-body">
              <p>No class recordings are available yet.</p>
            </Card>
          ) : null}
        </div>
      </div>
    </LearnerAppShell>
  )
}

export function PlaybackView({ courseId, recordingId }: { courseId: string; recordingId: string }) {
  return (
    <LearnerAppShell>
      <div>
        <PageHeader
          eyebrow="Protected playback"
          title="Class recording"
          description="Streaming access is short-lived and the player does not expose a download action."
          actions={
            <Link
              href={courseHref(courseId, 'recordings')}
              className="sb-button sb-button--ghost sb-button--md"
            >
              Back to recordings
            </Link>
          }
        />
        <ViewOnlyPlayer
          endpoint={`/api/live/courses/${encodeURIComponent(courseId)}/recordings/${encodeURIComponent(recordingId)}/playback`}
        />
      </div>
    </LearnerAppShell>
  )
}

export function AttachmentView({
  courseId,
  attachmentId,
}: {
  courseId: string
  attachmentId: string
}) {
  return (
    <LearnerAppShell>
      <div className="lr-attachment-view">
        <div className="lr-attachment-view-actions">
          <Link href={courseHref(courseId)} className="sb-button sb-button--ghost sb-button--md">
            <ArrowLeft aria-hidden="true" /> Back to course
          </Link>
          <CourseAttachmentDownloadButton courseId={courseId} attachmentId={attachmentId} />
        </div>
        <PageHeader
          eyebrow="Protected material"
          title="Course attachment"
          description="Open the attachment securely here or download a copy for offline use."
        />
        <ViewOnlyPlayer
          endpoint={`/api/courses/${encodeURIComponent(courseId)}/attachments/${encodeURIComponent(attachmentId)}`}
          media={false}
        />
      </div>
    </LearnerAppShell>
  )
}

export function RecorderView({ sessionId }: { sessionId: string }) {
  const query = useSearchParams()
  const token = query.get('token') ?? ''
  return <WebRecorder sessionId={sessionId} token={token} />
}

export function AssessmentStartView({ assessmentId }: { assessmentId: string }) {
  const router = useRouter()
  const { data: assessment, loading, error, reload } = useAssessment(assessmentId)
  useEffect(() => {
    if (assessment?.attempt && assessment.attempt.status !== 'in_progress')
      router.replace(assessmentAttemptHref(assessment.attempt.id))
  }, [assessment, router])
  if (loading)
    return (
      <LearnerAppShell>
        <LoadingState label="Loading the assessment…" />
      </LearnerAppShell>
    )
  if (error || !assessment)
    return (
      <LearnerAppShell>
        <p className="ad-empty-line" data-tone="error">
          {error || 'Could not load the assessment.'}
        </p>
      </LearnerAppShell>
    )
  if (assessment.attempt?.status === 'in_progress') {
    return (
      <LearnerAppShell>
        <div>
          <PageHeader
            eyebrow="Assessment in progress"
            title={assessment.title}
            description={assessment.description}
            actions={
              <Badge tone="blue" dot>
                In progress
              </Badge>
            }
          />
          <AssessmentPlayer assessment={assessment} attempt={assessment.attempt} />
        </div>
      </LearnerAppShell>
    )
  }
  const facts = [
    { label: 'Time limit', value: `${assessment.durationMinutes} min` },
    { label: 'Questions', value: `${assessment.questions.length}` },
    { label: 'Pass mark', value: `${assessment.passingScorePercent}%` },
    { label: 'Attempts', value: `${assessment.maxAttempts}` },
  ]
  return (
    <LearnerAppShell>
      <div>
        <PageHeader
          eyebrow={assessment.courseId ? 'Course final' : 'Standalone assessment'}
          title={assessment.title}
          description={assessment.description}
        />
        <dl className="lr-facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <section className="lr-begin">
          <p className="lr-begin-note">
            The timer starts when you begin and you’ll have {assessment.durationMinutes} minutes to
            finish. You need {assessment.passingScorePercent}% to pass.
            {assessment.retrySupported
              ? ` Failed attempts can be retried up to ${assessment.maxAttempts} total attempts.`
              : ' This assessment does not allow retries.'}{' '}
            Written responses may remain pending while the author reviews them.
          </p>
          <StartAssessmentButton
            assessmentId={assessment.id}
            label="Start assessment"
            onStarted={reload}
          />
        </section>
        <p className="lr-window">
          <CalendarClock aria-hidden="true" /> Available{' '}
          {new Date(assessment.opensAt).toLocaleString()}
          {' – '}
          {new Date(assessment.closesAt).toLocaleString()}
        </p>
      </div>
    </LearnerAppShell>
  )
}

export function AssessmentAttemptView({ attemptId }: { attemptId: string }) {
  const { data, loading, error } = useAssessmentAttempt(attemptId)
  if (loading)
    return (
      <LearnerAppShell>
        <LoadingState label="Loading your submission…" />
      </LearnerAppShell>
    )
  if (error || !data)
    return (
      <LearnerAppShell>
        <p className="ad-empty-line" data-tone="error">
          {error || 'Could not load your submission.'}
        </p>
      </LearnerAppShell>
    )
  const { assessment, attempt, attemptHistory, attemptsRemaining } = data
  const pending = attempt.status === 'pending_review'
  const passed = attempt.passed === true
  const percentage = attempt.maxScore
    ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
    : 0
  const canRetry =
    !pending &&
    !passed &&
    assessment.retrySupported &&
    (attemptsRemaining ?? 0) > 0 &&
    assessment.availability === 'open'
  const facts = [
    { label: 'Score', value: pending ? '—' : `${attempt.score ?? 0} / ${attempt.maxScore}` },
    { label: 'Percentage', value: pending ? '—' : `${percentage}%` },
    { label: 'Pass mark', value: `${assessment.passingScorePercent}%` },
    { label: 'Attempt', value: `${attempt.attemptNumber} of ${assessment.maxAttempts}` },
  ]
  return (
    <LearnerAppShell>
      <div>
        <PageHeader
          eyebrow="Assessment submission"
          title={assessment.title}
          description={
            pending
              ? 'Your responses were submitted and are awaiting author review.'
              : 'Your assessment has been marked.'
          }
          actions={
            <Badge tone={pending ? 'amber' : passed ? 'green' : 'red'} dot>
              {pending ? 'Pending review' : passed ? 'Passed' : 'Failed'}
            </Badge>
          }
        />
        <dl className="lr-facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        {canRetry ? (
          <section className="lr-begin">
            <p className="lr-begin-note">
              You still have {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'}{' '}
              remaining for this assessment.
            </p>
            <StartAssessmentButton assessmentId={assessment.id} label="Retry assessment" navigate />
          </section>
        ) : null}

        {(attemptHistory?.length ?? 0) > 1 ? (
          <section className="lr-min-section">
            <div className="lr-section-heading">
              <div>
                <h2>Attempt history</h2>
                <p>{attemptHistory.length} attempts recorded for this assessment.</p>
              </div>
            </div>
            <div className="lr-min-rows">
              {attemptHistory.map((item) => (
                <Link
                  className="lr-min-row"
                  href={assessmentAttemptHref(item.id)}
                  data-current={item.id === attempt.id || undefined}
                  key={item.id}
                >
                  <span className="lr-min-row-copy">
                    <strong>Attempt {item.attemptNumber}</strong>
                    <small>
                      {item.score == null ? 'Awaiting score' : `${item.score}/${item.maxScore}`}
                    </small>
                  </span>
                  <Badge
                    tone={
                      item.status === 'pending_review'
                        ? 'amber'
                        : item.passed
                          ? 'green'
                          : item.status === 'graded'
                            ? 'red'
                            : 'blue'
                    }
                  >
                    {item.status === 'pending_review'
                      ? 'pending review'
                      : item.passed
                        ? 'passed'
                        : item.status === 'graded'
                          ? 'failed'
                          : item.status.replace('_', ' ')}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="lr-min-section">
          <div className="lr-section-heading">
            <div>
              <h2>Your responses</h2>
              <p>
                {assessment.questions.length} question{assessment.questions.length === 1 ? '' : 's'}{' '}
                with points shown per question.
              </p>
            </div>
          </div>
          <div className="lr-responses">
            {assessment.questions.map((question, index) => {
              const answer = attempt.answers.find((item) => item.questionId === question.id)
              const correct = !pending && (answer?.awardedPoints ?? 0) >= question.points
              return (
                <article className="lr-response" key={question.id}>
                  <header className="lr-response-head">
                    <span className="lr-response-num">{index + 1}</span>
                    <h3>{question.prompt}</h3>
                    <span className="lr-response-points" data-tone={correct ? 'green' : 'red'}>
                      {correct ? (
                        <CheckCircle2 aria-hidden="true" />
                      ) : (
                        <span className="lr-response-x" aria-hidden="true">
                          ×
                        </span>
                      )}
                      {pending
                        ? question.points
                        : `${answer?.awardedPoints ?? 0}/${question.points}`}
                    </span>
                  </header>
                  {question.type === 'multiple_choice' ? (
                    <ul className="lr-response-options">
                      {question.options.map((option) => {
                        const selected = answer?.selectedOptionIds.includes(option.id)
                        return (
                          <li key={option.id} data-selected={selected || undefined}>
                            <span className="lr-response-mark" aria-hidden="true">
                              {selected ? <CheckCircle2 /> : <span />}
                            </span>
                            {option.label}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="lr-response-text">{answer?.text || 'No written response'}</p>
                  )}
                  {answer?.feedback ? (
                    <div className="lr-min-feedback">
                      <MessageSquareText aria-hidden="true" />
                      <span>
                        <strong>Author feedback</strong>
                        {answer.feedback}
                      </span>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </LearnerAppShell>
  )
}

function CertificateNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <strong className="lr-cert-number">
      {value}
      <button
        type="button"
        aria-label="Copy certificate number"
        title="Copy certificate number"
        onClick={() => void copy()}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
    </strong>
  )
}

export function CertificateView({ certificateNumber }: { certificateNumber: string }) {
  const parsed = certificateNumberSchema.safeParse(certificateNumber)
  if (!parsed.success) notFound()
  const number = parsed.data.toUpperCase()
  const verification = useCertificate(number)
  const [owned, setOwned] = useState<{
    certificate: Certificate | null
    course: NonNullable<StudentEnrollmentSummary['course']> | null
    finalAssessment: Assessment | null
    attempt: Assessment['attempt']
    assessmentHref: string | null
  }>({
    certificate: null,
    course: null,
    finalAssessment: null,
    attempt: null,
    assessmentHref: null,
  })
  useEffect(() => {
    let active = true
    void (async () => {
      const signedIn = await apiFetch<{ student: { id: string } }>('/api/auth/me')
        .then(() => true)
        .catch(() => false)
      if (!signedIn) return
      const [enrollmentsValue, assessmentsValue] = await Promise.all([
        apiFetch<{ enrollments: StudentEnrollmentSummary[] }>('/api/courses').catch(() => null),
        apiFetch<{ assessments: Assessment[] }>('/api/assessments').catch(() => null),
      ])
      if (!active) return
      const ownedItem = (enrollmentsValue?.enrollments ?? []).find(
        (item) => item.certificate?.certificateNumber.toUpperCase() === number,
      )
      if (!ownedItem) return
      const ownedCertificate: Certificate | null = ownedItem.certificate ?? null
      const course = ownedItem.course ?? null
      const finalAssessment = ownedCertificate
        ? ((assessmentsValue?.assessments ?? []).find(
            (item) => item.courseId === ownedCertificate.courseId,
          ) ?? null)
        : null
      const attempt = finalAssessment?.attempt ?? null
      const ownedAssessmentHref =
        attempt && attempt.status !== 'in_progress'
          ? assessmentAttemptHref(attempt.id)
          : finalAssessment
            ? assessmentHref(finalAssessment.id)
            : null
      setOwned({
        certificate: ownedCertificate,
        course,
        finalAssessment,
        attempt,
        assessmentHref: ownedAssessmentHref,
      })
    })()
    return () => {
      active = false
    }
  }, [number])
  if (verification.loading)
    return (
      <LearnerAppShell>
        <LoadingState label="Verifying the certificate…" />
      </LearnerAppShell>
    )
  const recognized = Boolean(verification.data?.recognized)
  const certificate = recognized ? verification.data!.certificate : null
  const pdfPath = `/api/certificate-verification/${encodeURIComponent(number)}/pdf`
  return (
    <LearnerAppShell>
      <div className="lr-certificate-page">
        <PageHeader
          eyebrow="Certificate verification"
          title={recognized ? 'Certificate recognised' : 'Certificate not recognised'}
          description={
            recognized
              ? 'This certificate exists in the DANVIC learning record.'
              : 'No DANVIC certificate matches this certificate number.'
          }
          actions={
            <Link
              href="/verify-certificate"
              className="sb-button sb-button--ghost sb-button--md lr-cert-verify-another"
            >
              Verify another
            </Link>
          }
        />
        {certificate ? (
          <>
            <section className="lr-cert-summary">
              <div>
                <small>Course</small>
                <strong>{certificate.courseName}</strong>
              </div>
              <div>
                <small>Learner</small>
                <strong>{certificate.studentName}</strong>
              </div>
              <div>
                <small>Certificate number</small>
                <CertificateNumber value={certificate.certificateNumber} />
              </div>
              <div>
                <small>Completed</small>
                <strong>
                  {new Date(certificate.completedAt).toLocaleDateString(undefined, {
                    dateStyle: 'long',
                  })}
                </strong>
              </div>
            </section>

            {owned.course ? (
              <Link href={courseHref(owned.course.id)} className="lr-cert-course-link">
                See this certificate’s course <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}

            {owned.finalAssessment && owned.assessmentHref ? (
              <section className="lr-section lr-section--plain">
                <div className="lr-section-heading">
                  <div>
                    <h2>Assessment</h2>
                    <p>The final assessment completed for this course.</p>
                  </div>
                  <Link href={owned.assessmentHref} className="lr-row-action">
                    {owned.attempt && owned.attempt.status !== 'in_progress'
                      ? 'Review submission'
                      : 'Open assessment'}{' '}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
                <div className="sb-course-meta">
                  <span>
                    <Clock3 aria-hidden="true" /> {owned.finalAssessment.durationMinutes} minutes
                  </span>
                  <span>{owned.finalAssessment.passingScorePercent}% pass mark</span>
                  <span>
                    {owned.finalAssessment.retrySupported
                      ? `${owned.finalAssessment.maxAttempts} attempts`
                      : 'one attempt'}
                  </span>
                  {owned.attempt ? (
                    <Badge
                      tone={
                        owned.attempt.passed
                          ? 'green'
                          : owned.attempt.status === 'pending_review'
                            ? 'amber'
                            : 'red'
                      }
                    >
                      {owned.attempt.passed ? 'passed' : owned.attempt.status.replace('_', ' ')}
                    </Badge>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="lr-section lr-section--plain">
              <div className="lr-section-heading">
                <div>
                  <h2>Certificate PDF</h2>
                  <p>The QR code on the document links back to this verified record.</p>
                </div>
              </div>
              {owned.certificate ? (
                <CertificateActions certificate={owned.certificate} />
              ) : (
                <a
                  href={`${pdfPath}?download=1`}
                  download
                  className="sb-button sb-button--primary sb-button--md"
                >
                  <Download aria-hidden="true" /> Download PDF
                </a>
              )}
            </section>
          </>
        ) : (
          <EmptyState
            icon={<ShieldX aria-hidden="true" />}
            title="We could not verify this number"
            description="Check the number carefully or scan the QR code printed on the certificate."
            action={
              <Link
                href="/verify-certificate"
                className="sb-button sb-button--primary sb-button--md"
              >
                <CalendarCheck aria-hidden="true" /> Try again
              </Link>
            }
          />
        )}
      </div>
    </LearnerAppShell>
  )
}

export function CertificateRouteView() {
  const query = useSearchParams()
  const certificateNumber = query.get('number') ?? ''
  if (!certificateNumberSchema.safeParse(certificateNumber).success)
    return (
      <LearnerAppShell>
        <EmptyState
          icon={<ShieldX aria-hidden="true" />}
          title="Certificate not recognised"
          description="No DANVIC certificate matches this certificate number."
          action={
            <Link href="/verify-certificate" className="sb-button sb-button--primary sb-button--md">
              Verify a certificate
            </Link>
          }
        />
      </LearnerAppShell>
    )
  return <CertificateView certificateNumber={certificateNumber} />
}

type SocialNetwork = 'linkedin' | 'x' | 'instagram' | 'facebook' | 'website'

const socialIconClasses: Record<SocialNetwork, string> = {
  linkedin: styles.linkedin!,
  x: styles.x!,
  facebook: styles.facebook!,
  instagram: styles.instagram!,
  website: styles.website!,
}

export function AuthorView({ authorId }: { authorId: string }) {
  const { data, loading, error } = useAuthorProfile(authorId)
  if (loading)
    return (
      <LearnerAppShell>
        <LoadingState label="Loading the author profile…" />
      </LearnerAppShell>
    )
  if (error || !data)
    return (
      <LearnerAppShell>
        <EmptyState
          icon={<BookOpen aria-hidden="true" />}
          title="Author unavailable"
          description={error || 'This author profile could not be found.'}
          action={
            <Link href="/catalog" className="sb-button sb-button--primary sb-button--md">
              Browse courses
            </Link>
          }
        />
      </LearnerAppShell>
    )
  const { author, courses } = data
  const profileLinks = [
    { label: 'LinkedIn', href: author.linkedInUrl, network: 'linkedin' },
    { label: 'X (Twitter)', href: author.xUrl, network: 'x' },
    { label: 'Facebook', href: author.facebookUrl, network: 'facebook' },
    { label: 'Instagram', href: author.instagramUrl, network: 'instagram' },
    { label: 'Personal website', href: author.websiteUrl, network: 'website' },
  ].filter((link): link is { label: string; href: string; network: SocialNetwork } =>
    Boolean(link.href),
  )
  const { rating } = data
  return (
    <LearnerAppShell>
      <div className={`${styles.page} ad-author-detail-page`}>
        <Link className="ad-back-link" href="/catalog">
          <ArrowLeft aria-hidden="true" /> Back to catalog
        </Link>
        <PageHeader
          eyebrow="Author"
          title={
            <>
              {author.firstName} {author.lastName}
              <span
                className={styles.rating}
                title={
                  rating.count
                    ? `${rating.average.toFixed(1)} from ${rating.count} rating${rating.count === 1 ? '' : 's'}`
                    : 'No ratings yet'
                }
              >
                {rating.count ? rating.average.toFixed(1) : '—'}{' '}
                <Star aria-hidden="true" fill="currentColor" />
                <small>{rating.count ? `(${rating.count})` : 'No ratings yet'}</small>
              </span>
            </>
          }
          description={`${courses.length} ${courses.length === 1 ? 'course' : 'courses'} available on DANVIC Energy Learning`}
          actions={
            <Link className="sb-button sb-button--primary sb-button--md" href="/catalog">
              All courses
            </Link>
          }
        />
        <section className="ad-section ad-section--first ad-author-profile">
          <div className="ad-section-heading">
            <div>
              <h2>Author bio</h2>
            </div>
          </div>
          {author.bio ? (
            <p className={styles.bio}>{author.bio}</p>
          ) : (
            <p className="ad-empty-line">This author has not added a bio yet.</p>
          )}
          {profileLinks.length ? (
            <div className={styles.links} aria-label="Author links">
              {profileLinks.map(({ label, href, network }) => (
                <a href={href} key={label} target="_blank" rel="noreferrer">
                  <span
                    className={`${styles.socialIcon} ${socialIconClasses[network]}`}
                    aria-hidden="true"
                  />
                  {label}
                </a>
              ))}
            </div>
          ) : null}
        </section>
        <section className="ad-section ad-section--first">
          <div className="ad-section-heading">
            <div>
              <h2>Author details</h2>
            </div>
          </div>
          <dl className="ad-details">
            <div>
              <dt>Courses created</dt>
              <dd>{courses.length}</dd>
            </div>
            <div>
              <dt>Average rating</dt>
              <dd>{rating.count ? `${rating.average.toFixed(1)} / 5` : 'No ratings yet'}</dd>
            </div>
            <div>
              <dt>Ratings received</dt>
              <dd>{rating.count}</dd>
            </div>
          </dl>
        </section>
        <section className="ad-section">
          <div className="ad-section-heading">
            <div>
              <h2>Courses</h2>
              <p>{courses.length} by this author</p>
            </div>
          </div>
          {courses.length ? (
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Scheduled</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <Link className="ad-table-link" href={courseHref(course.id)}>
                          {course.name}
                        </Link>
                      </td>
                      <td>{course.type === 'live' ? 'Live' : 'Premade'}</td>
                      <td>
                        {course.accessType === 'paid' ? formatNaira(course.priceKobo) : 'Free'}
                      </td>
                      <td>{course.durationMinutes} min</td>
                      <td>
                        {course.scheduledAt
                          ? new Date(course.scheduledAt).toLocaleString('en-NG')
                          : '-'}
                      </td>
                      <td>{new Date(course.createdAt).toLocaleDateString('en-NG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ad-empty-line">This author has no courses.</p>
          )}
        </section>
      </div>
    </LearnerAppShell>
  )
}

export function CourseRouteView() {
  const query = useSearchParams()
  const courseId = query.get('courseId')?.trim() ?? ''
  const view = (query.get('view') ?? 'details') as CoursePageView

  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(courseId)) {
    return (
      <LearnerAppShell>
        <EmptyState
          icon={<BookOpen aria-hidden="true" />}
          title="Course ID required"
          description="Open a course from your enrolled courses or enter its 26-character course ID."
        />
      </LearnerAppShell>
    )
  }

  if (view === 'details') return <CourseView courseId={courseId} />
  if (view === 'study') return <StudyView courseId={courseId} />
  if (view === 'live')
    return (
      <LiveView courseId={courseId} sessionId={query.get('sessionId')?.trim() || undefined} />
    )
  if (view === 'recordings') return <RecordingsView courseId={courseId} />
  if (view === 'recording') {
    const recordingId = query.get('recordingId')?.trim() ?? ''
    if (recordingId) return <PlaybackView courseId={courseId} recordingId={recordingId} />
  }
  if (view === 'attachment') {
    const attachmentId = query.get('attachmentId')?.trim() ?? ''
    if (attachmentId) return <AttachmentView courseId={courseId} attachmentId={attachmentId} />
  }

  return (
    <LearnerAppShell>
      <EmptyState
        icon={<BookOpen aria-hidden="true" />}
        title="Course page not found"
        description="The requested course view is invalid. Return to your enrolled courses and try again."
      />
    </LearnerAppShell>
  )
}

export function CatchAllViews() {
  const pathname = usePathname().replace(/\/+$/, '') || '/'

  const recorder = pathname.match(/^\/live-recorder\/([^/]+)$/)
  if (recorder) return <RecorderView sessionId={recorder[1] ?? ''} />

  const certificate = pathname.match(/^\/certificates\/([^/]+)$/)
  if (certificate) return <CertificateView certificateNumber={certificate[1] ?? ''} />

  const author = pathname.match(/^\/authors\/([^/]+)$/)
  if (author) return <AuthorView authorId={author[1] ?? ''} />

  const assessmentStart = pathname.match(/^\/assessments\/([^/]+)$/)
  if (assessmentStart) return <AssessmentStartView assessmentId={assessmentStart[1] ?? ''} />

  const attempt = pathname.match(/^\/assessment-attempts\/([^/]+)$/)
  if (attempt) return <AssessmentAttemptView attemptId={attempt[1] ?? ''} />

  notFound()
}
