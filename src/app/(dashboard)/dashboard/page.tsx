'use client'

import Link from 'next/link'
import { Badge } from '@danvic/ui'
import { ArrowRight } from 'lucide-react'
import { useAssessments, useEnrollments } from '@/lib/data'
import { LoadingState } from '@/components/loading-state'
import { courseHref } from '@/lib/course-route'

export default function DashboardPage() {
  const enrollmentsState = useEnrollments()
  const assessmentsState = useAssessments()

  const loading = enrollmentsState.loading || assessmentsState.loading
  const error = enrollmentsState.error || assessmentsState.error
  const enrollments = enrollmentsState.data ?? []
  const assessments = assessmentsState.data ?? []
  const completed = enrollments.filter((item) => item.enrollment.completedAt).length
  const inProgress = enrollments.length - completed
  const directory = [
    {
      label: 'My courses',
      value: enrollments.length,
      note: `${inProgress} in progress`,
      href: '/courses',
    },
    { label: 'Completed', value: completed, note: 'Learning records ready', href: '/courses' },
    {
      label: 'Assessments',
      value: assessments.length,
      note: `${assessments.filter((assessment) => assessment.availability === 'open').length} ready to take`,
      href: '/assessments',
    },
    {
      label: 'Certificates',
      value: completed,
      note: 'Verified achievements',
      href: '/verify-certificate',
    },
  ]
  const nextCourse = enrollments.find((item) => !item.enrollment.completedAt)
  return (
    <div>
      <header className="sb-page-header">
        <div>
          <p className="sb-page-eyebrow">Learning</p>
          <h1>Overview</h1>
          <p>A clear view of your progress and the next learning step.</p>
        </div>
        <div className="sb-page-actions">
          <Link href="/catalog" className="sb-button sb-button--primary sb-button--md">
            Browse catalog
          </Link>
        </div>
      </header>
      {loading ? (
        <LoadingState label="Loading your learning overview…" />
      ) : error ? (
        <p className="ad-empty-line" data-tone="error">{error}</p>
      ) : (
        <>
          <section className="lr-directory" aria-label="Learning overview">
            <div className="lr-directory-grid">
              {directory.map((entry) => (
                <Link className="lr-directory-card" href={entry.href} key={entry.label}>
                  <span className="lr-directory-card-label">{entry.label}</span>
                  <strong>{entry.value}</strong>
                  <span className="lr-directory-card-note">{entry.note}</span>
                </Link>
              ))}
            </div>
          </section>
          <div className="lr-overview-split">
            <section className="lr-section lr-section--plain">
              <div className="lr-section-heading">
                <div>
                  <h2>Continue learning</h2>
                  <p>Pick up where you left off.</p>
                </div>
                <Link className="lr-row-action" href="/courses">
                  View all <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              {enrollments.map((item) =>
                item.course ? (
                  <Link
                    className="lr-overview-row"
                    href={courseHref(item.course.id)}
                    key={item.enrollment.id}
                  >
                    <span className="lr-overview-copy">
                      <strong>{item.course.name}</strong>
                      <small>
                        {item.completedModules.length}/{item.moduleCount} modules complete ·{' '}
                        {item.course.durationMinutes} min
                      </small>
                    </span>
                    <Badge tone={item.enrollment.completedAt ? 'green' : 'blue'}>
                      {item.enrollment.completedAt ? 'Completed' : 'Continue'}
                    </Badge>
                  </Link>
                ) : null,
              )}
            </section>
            <section className="lr-section lr-section--plain">
              <div className="lr-section-heading">
                <div>
                  <h2>Quick actions</h2>
                  <p>Common learner tasks.</p>
                </div>
              </div>
              <div className="lr-action-list">
                {nextCourse?.course ? (
                  <Link href={courseHref(nextCourse.course.id)}>
                    Resume current course <ArrowRight aria-hidden="true" />
                  </Link>
                ) : (
                  <Link href="/courses">
                    Resume current course <ArrowRight aria-hidden="true" />
                  </Link>
                )}
                <Link href="/assessments">
                  Review assessments <ArrowRight aria-hidden="true" />
                </Link>
                <Link href="/payments">
                  View payment history <ArrowRight aria-hidden="true" />
                </Link>
                <Link href="/profile">
                  View your profile <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
