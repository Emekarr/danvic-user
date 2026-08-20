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
    ]).then(([catalog, learning, signedIn]) => {
      if (!active) return
      setCourses(catalog.courses)
      setEnrolled(learning.enrollments.map((item) => item.enrollment.courseId))
      setCanEnroll(signedIn)
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