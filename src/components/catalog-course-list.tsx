'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CatalogCourse } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Badge, Input } from '@danvic/ui'
import { CalendarClock, CheckCircle2, Clock3, Search, UserRound } from 'lucide-react'
import { CourseCover } from './course-cover-display'
import { EnrollButton, PaidEnrollButton } from './course-participation'

export function CatalogCourseList({
  initialCourses,
  enrolledCourseIds,
  canEnroll,
}: {
  initialCourses: CatalogCourse[]
  enrolledCourseIds: string[]
  canEnroll: boolean
}) {
  const [query, setQuery] = useState('')
  const [courses, setCourses] = useState(initialCourses)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const enrolled = new Set(enrolledCourseIds)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setError('')
      try {
        const result = await apiFetch<{ courses: CatalogCourse[] }>(
          `/api/catalog?query=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        )
        setCourses(result.courses)
      } catch (cause) {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Courses could not be searched')
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <>
      <label className="lr-course-search" aria-label="Search the course catalog" aria-busy={searching || undefined}>
        <Search aria-hidden="true" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by course or author"
        />
      </label>
      {error ? <p className="sb-form-message">{error}</p> : null}
      {courses.length ? (
        <div className="lr-catalog-list">
          {courses.map((course) => (
            <article className="lr-catalog-row" key={course.id}>
              <CourseCover course={course} className="lr-catalog-media" showFallback />
              <div className="lr-catalog-head">
                <h3>{course.name}</h3>
                <Badge tone={course.type === 'live' ? 'violet' : 'blue'}>{course.type}</Badge>
              </div>
              <p>
                {course.type === 'live'
                  ? 'Scheduled live learning session.'
                  : 'Premade learning available at your pace.'}
              </p>
              <div className="sb-course-meta">
                <span><Clock3 aria-hidden="true" /> {course.durationMinutes} min</span>
                <span><CalendarClock aria-hidden="true" /> {course.scheduledAt ? new Date(course.scheduledAt).toLocaleString('en-NG') : '-'}</span>
                <span>{course.accessType === 'paid' ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(course.priceKobo / 100) : 'Free'}</span>
              </div>
              <div className="lr-catalog-actions">
                <Link href={`/authors/${course.createdByAuthorId}`} className="lr-author-link">
                  <UserRound aria-hidden="true" /> {course.authorName}
                </Link>
                <Link href={`/courses/${course.id}`} className="sb-button sb-button--secondary sb-button--md">View course</Link>
                {enrolled.has(course.id) ? (
                  <span className="lr-enrolled-badge"><CheckCircle2 aria-hidden="true" /> Enrolled</span>
                ) : canEnroll ? (
                  course.accessType === 'paid' ? <PaidEnrollButton courseId={course.id} priceKobo={course.priceKobo} /> : <EnrollButton courseId={course.id} />
                ) : (
                  <Link href={`/login?next=${encodeURIComponent(`/courses/${course.id}`)}`} className="sb-button sb-button--primary sb-button--md">Enroll</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="lr-course-search-empty">No courses match “{query}”.</p>
      )}
    </>
  )
}
