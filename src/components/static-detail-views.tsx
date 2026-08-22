'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { EmptyState } from '@danvic/ui'
import { BookOpen, ClipboardCheck, UserRound, Video } from 'lucide-react'
import {
  AssessmentAttemptView,
  AssessmentStartView,
  AuthorView,
  RecorderView,
} from '@/components/dynamic-views'
import { LearnerAppShell } from '@/components/learner-app-shell'

const idPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/

export function AssessmentRouteView() {
  const id = useSearchParams().get('assessmentId')?.trim() ?? ''
  if (idPattern.test(id)) return <AssessmentStartView assessmentId={id} />
  return (
    <MissingDetail
      icon={<ClipboardCheck />}
      title="Assessment not found"
      description="Open an assessment from your assessments list or from an enrolled course."
    />
  )
}

export function AssessmentAttemptRouteView() {
  const id = useSearchParams().get('attemptId')?.trim() ?? ''
  if (idPattern.test(id)) return <AssessmentAttemptView attemptId={id} />
  return (
    <MissingDetail
      icon={<BookOpen />}
      title="Submission not found"
      description="Open a submission from your assessment history."
    />
  )
}

export function AuthorRouteView() {
  const id = useSearchParams().get('authorId')?.trim() ?? ''
  if (idPattern.test(id)) return <AuthorView authorId={id} />
  return (
    <MissingDetail
      icon={<UserRound />}
      title="Author not found"
      description="Open an author profile from a course or the catalog."
    />
  )
}

export function RecorderRouteView() {
  const query = useSearchParams()
  const id = query.get('sessionId')?.trim() ?? ''
  if (idPattern.test(id) && query.get('token')) return <RecorderView sessionId={id} />
  return (
    <MissingDetail
      icon={<Video />}
      title="Recorder link invalid"
      description="Open the recorder from an active DANVIC live class."
    />
  )
}

function MissingDetail({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <LearnerAppShell>
      <EmptyState icon={icon} title={title} description={description} />
    </LearnerAppShell>
  )
}
