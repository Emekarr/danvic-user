'use client'

import { useEffect, useState } from 'react'
import { apiFetch, type CatalogCourse, type StudentEnrollmentSummary } from '@danvic/api-client'
import { EmptyState, PageHeader } from '@danvic/ui'
import { BookOpen } from 'lucide-react'
import { LearnerAppShell } from '@/components/learner-app-shell'
import { CatalogCourseList } from '@/components/catalog-course-list'

export default function CatalogPage() {
  const [courses, setCourses] = useState<CatalogCourse[] | null>(null)
  const [enrolled, setEnrolled] = useState<string[]>([])
  const [bookmarked, setBookmarked] = useState<string[]>([])
  const [upcomingLive, setUpcomingLive] = useState<string[]>([])
  const [canEnroll, setCanEnroll] = useState(false)
  useEffect(() => {
    let active = true
    void Promise.all([
      apiFetch<{ courses: CatalogCourse[] }>('/api/catalog'),
      apiFetch<{ enrollments: StudentEnrollmentSummary[] }>('/api/courses').catch(
        () => ({ enrollments: [] }),
      ),
      apiFetch<{ student: { id: string } }>('/api/auth/me')
        .then(() => true)
        .catch(() => false),
      apiFetch<{ bookmarks: Array<{ courseId: string; enabled: boolean }> }>(
        '/api/course-bookmarks',
      ).catch(() => ({ bookmarks: [] })),
    ]).then(([catalog, learning, signedIn, saved]) => {
      if (!active) return
      setCourses(catalog.courses)
      const now = Date.now()
      setUpcomingLive(
        catalog.courses
          .filter(
            (course) =>
              course.type === 'live' &&
              Boolean(course.scheduledAt) &&
              new Date(course.scheduledAt!).getTime() > now,
          )
          .map((course) => course.id),
      )
      setEnrolled(learning.enrollments.map((item) => item.enrollment.courseId))
      setCanEnroll(signedIn)
      setBookmarked(saved.bookmarks.filter((item) => item.enabled).map((item) => item.courseId))
    })
    return () => {
      active = false
    }
  }, [])
  return (
    <LearnerAppShell>
      <div className="lr-catalog-page">
        <PageHeader
          eyebrow="Learning catalog"
          title="Available DANVIC courses"
          description="Browse free and paid courses. Paid access is activated after Paystack verifies your payment."
        />
        {courses && courses.length ? (
          <CatalogCourseList
            initialCourses={courses}
            enrolledCourseIds={enrolled}
            bookmarkedCourseIds={bookmarked}
            upcomingLiveCourseIds={upcomingLive}
            canEnroll={canEnroll}
          />
        ) : (
          <EmptyState
            icon={<BookOpen aria-hidden="true" />}
            title="No courses are available yet"
            description="Scheduled courses will appear here automatically when their availability begins."
          />
        )}
      </div>
    </LearnerAppShell>
  )
}
