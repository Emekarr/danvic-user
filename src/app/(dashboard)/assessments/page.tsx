'use client'

import Link from 'next/link'
import { Badge, EmptyState, PageHeader } from '@danvic/ui'
import { CalendarClock, ClipboardCheck, Clock3 } from 'lucide-react'
import { useAssessments } from '@/lib/data'
import { LoadingState } from '@/components/loading-state'

export default function AssessmentsPage() {
  const { data, loading, error } = useAssessments()

  const assessments = data ?? []
  return (
    <>
      <PageHeader
        eyebrow="Assessment"
        title="Your assessments"
        description="Take standalone assessments or complete the final step in an enrolled course."
      />
      {loading ? (
        <LoadingState label="Loading your assessments…" />
      ) : error ? (
        <p className="ad-empty-line" data-tone="error">{error}</p>
      ) : assessments.length ? (
        <div className="lr-assessment-list">
          {assessments.map((assessment) => {
            const status = assessment.attempt?.status ?? assessment.availability ?? 'scheduled'
            const gradedStatus =
              status === 'graded' ? (assessment.attempt?.passed ? 'passed' : 'failed') : status
            const href =
              assessment.attempt && assessment.attempt.status !== 'in_progress'
                ? `/assessment-attempts/${assessment.attempt.id}`
                : `/assessments/${assessment.id}`
            return (
              <article className="lr-assessment-row" key={assessment.id}>
                <div className="lr-assessment-copy">
                  <div className="lr-assessment-head">
                    <h2>{assessment.title}</h2>
                    <Badge
                      tone={
                        gradedStatus === 'passed'
                          ? 'green'
                          : gradedStatus === 'failed'
                            ? 'red'
                            : status === 'pending_review'
                              ? 'amber'
                              : status === 'open' || status === 'in_progress'
                                ? 'blue'
                                : 'neutral'
                      }
                    >
                      {gradedStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p>{assessment.description}</p>
                  <div className="sb-course-meta">
                    <span>
                      <Clock3 aria-hidden="true" /> {assessment.durationMinutes} minutes
                    </span>
                    <span>
                      <CalendarClock aria-hidden="true" />{' '}
                      {new Date(assessment.opensAt).toLocaleString()} –{' '}
                      {new Date(assessment.closesAt).toLocaleString()}
                    </span>
                    <span>{assessment.courseId ? 'Course final' : 'Standalone'}</span>
                    <span>
                      {assessment.passingScorePercent}% pass mark ·{' '}
                      {assessment.retrySupported
                        ? `${assessment.maxAttempts} attempts`
                        : 'one attempt'}
                    </span>
                  </div>
                </div>
                {status === 'scheduled' || status === 'closed' ? (
                  <span className="sb-button sb-button--soft sb-button--sm" aria-disabled="true">
                    {status === 'scheduled' ? 'Not open yet' : 'Closed'}
                  </span>
                ) : (
                  <Link href={href} className="sb-button sb-button--primary sb-button--sm">
                    {status === 'graded' || status === 'pending_review'
                      ? 'View submission'
                      : status === 'in_progress'
                        ? 'Continue'
                        : 'Open'}
                  </Link>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<ClipboardCheck aria-hidden="true" />}
          title="No assessments available"
          description="Standalone assessments and course finals will appear here."
        />
      )}
    </>
  )
}
