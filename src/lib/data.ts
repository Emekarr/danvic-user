'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  apiFetch,
  type Assessment,
  type AssessmentAttempt,
  type AssessmentAttemptSummary,
  type Certificate,
  type CoursePreview,
  type LiveRecording,
  type LiveSession,
  type PublicAuthorProfile,
  type StudentCourseAggregate,
  type StudentEnrollmentSummary,
  type StudentPayments,
  type StudentProfile,
} from '@danvic/api-client'

export interface ResourceState<T> {
  data: T | null
  loading: boolean
  error: string
  code: string
  reload: () => void
}

export function useResource<T>(path: string, gate = false): ResourceState<T> {
  const router = useRouter()
  const [tick, setTick] = useState(0)
  const [state, setState] = useState<{
    data: T | null
    loading: boolean
    error: string
    code: string
  }>({ data: null, loading: true, error: '', code: '' })
  useEffect(() => {
    let active = true
    apiFetch<T>(path)
      .then((data) => {
        if (active) setState({ data, loading: false, error: '', code: '' })
      })
      .catch((cause: unknown) => {
        if (!active) return
        setState({
          data: null,
          loading: false,
          error: cause instanceof Error ? cause.message : 'Could not load data.',
          code: cause instanceof Error ? (cause as Error & { code?: string }).code ?? '' : '',
        })
        if (gate) router.replace('/login')
      })
    return () => {
      active = false
    }
  }, [path, router, gate, tick])
  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true, error: '', code: '' }))
    setTick((value) => value + 1)
  }, [])
  return { ...state, reload }
}

export function useStudent(): { student: StudentProfile | null } & ResourceState<{
  student: StudentProfile
}> {
  const state = useResource<{ student: StudentProfile }>('/api/auth/me', true)
  return { student: state.data?.student ?? null, ...state }
}

export function useEnrollments(): ResourceState<StudentEnrollmentSummary[]> {
  const state = useResource<{ enrollments: StudentEnrollmentSummary[] }>('/api/courses', true)
  return { ...state, data: state.data?.enrollments ?? null }
}

export function useAssessments(): ResourceState<Assessment[]> {
  const state = useResource<{ assessments: Assessment[] }>('/api/assessments', true)
  return { ...state, data: state.data?.assessments ?? null }
}

export function usePayments(): ResourceState<StudentPayments> {
  return useResource<StudentPayments>('/api/payments', true)
}

export function useAssessment(assessmentId: string): ResourceState<Assessment> {
  return useResource<Assessment>(`/api/assessments/${encodeURIComponent(assessmentId)}`, true)
}

export function useAssessmentAttempt(
  attemptId: string,
): ResourceState<{
  assessment: Assessment
  attempt: AssessmentAttempt
  attemptHistory: AssessmentAttemptSummary[]
  attemptsRemaining: number
}> {
  return useResource(`/api/assessment-attempts/${encodeURIComponent(attemptId)}`, true)
}

export function useCourseAggregate(courseId: string): ResourceState<StudentCourseAggregate> {
  return useResource<StudentCourseAggregate>(`/api/courses/${encodeURIComponent(courseId)}`)
}

export function useLiveSession(courseId: string): ResourceState<{ session: LiveSession | null }> {
  return useResource(`/api/live/courses/${encodeURIComponent(courseId)}/live-session`)
}

export function useRecordings(courseId: string): ResourceState<LiveRecording[]> {
  const state = useResource<{ recordings: LiveRecording[] }>(
    `/api/live/courses/${encodeURIComponent(courseId)}/recordings`,
  )
  return { ...state, data: state.data?.recordings ?? null }
}

export function useCoursePreview(courseId: string): ResourceState<CoursePreview> {
  return useResource<CoursePreview>(`/api/catalog/courses/${encodeURIComponent(courseId)}`)
}

export function useAuthorProfile(authorId: string): ResourceState<PublicAuthorProfile> {
  return useResource<PublicAuthorProfile>(`/api/authors/${encodeURIComponent(authorId)}`)
}

export function useCertificate(
  certificateNumber: string,
): ResourceState<{
  recognized: boolean
  valid: boolean
  certificate: Certificate | null
}> {
  return useResource(
    `/api/certificate-verification/${encodeURIComponent(certificateNumber)}`,
  )
}