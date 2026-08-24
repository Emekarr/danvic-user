export type CoursePageView =
  'details' | 'study' | 'live' | 'recordings' | 'recording' | 'attachment'

export function courseHref(
  courseId: string,
  view: CoursePageView = 'details',
  resourceId?: string,
) {
  const params = new URLSearchParams({ courseId })
  if (view !== 'details') params.set('view', view)
  if (view === 'live' && resourceId) params.set('sessionId', resourceId)
  if (view === 'recording' && resourceId) params.set('recordingId', resourceId)
  if (view === 'attachment' && resourceId) params.set('attachmentId', resourceId)
  return `/course?${params.toString()}`
}

export function assessmentHref(assessmentId: string) {
  return `/assessment?assessmentId=${encodeURIComponent(assessmentId)}`
}

export function assessmentAttemptHref(attemptId: string) {
  return `/assessment-attempt?attemptId=${encodeURIComponent(attemptId)}`
}

export function certificateHref(certificateNumber: string) {
  return `/certificate?number=${encodeURIComponent(certificateNumber)}`
}

export function authorHref(authorId: string) {
  return `/author?authorId=${encodeURIComponent(authorId)}`
}
