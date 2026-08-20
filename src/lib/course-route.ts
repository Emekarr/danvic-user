export type CoursePageView =
  | 'details'
  | 'study'
  | 'live'
  | 'recordings'
  | 'recording'
  | 'attachment'

export function courseHref(
  courseId: string,
  view: CoursePageView = 'details',
  resourceId?: string,
) {
  const params = new URLSearchParams({ courseId })
  if (view !== 'details') params.set('view', view)
  if (view === 'recording' && resourceId) params.set('recordingId', resourceId)
  if (view === 'attachment' && resourceId) params.set('attachmentId', resourceId)
  return `/course?${params.toString()}`
}
