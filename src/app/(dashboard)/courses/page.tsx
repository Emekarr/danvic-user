'use client'

import Link from 'next/link'
import { EnrolledCourseList } from '@/components/enrolled-course-list'
import { useEnrollments } from '@/lib/data'
import { LoadingState } from '@/components/loading-state'

export default function CoursesPage() {
  const { data, loading, error } = useEnrollments()

  if (loading) return <LoadingState label="Loading your enrolled courses…" />
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  const items = data ?? []
  return (
    <div>
      <header className="sb-page-header">
        <div>
          <p className="sb-page-eyebrow">Learning</p>
          <h1>Enrolled courses</h1>
          <p>Courses available in your learning space and the progress you have made.</p>
        </div>
        <div className="sb-page-actions">
          <Link href="/catalog" className="sb-button sb-button--primary sb-button--md">
            Browse catalog
          </Link>
        </div>
      </header>
      <section className="lr-section lr-section--plain">
        <div className="lr-section-heading">
          <div>
            <h2>All courses</h2>
            <p>
              {items.length} enrolled · {items.filter((item) => item.enrollment.completedAt).length}{' '}
              complete
            </p>
          </div>
        </div>
        <EnrolledCourseList items={items} />
      </section>
    </div>
  )
}
