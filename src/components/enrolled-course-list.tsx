'use client'

import { useMemo, useState } from 'react'
import type { StudentEnrollmentSummary } from '@danvic/api-client'
import { Badge, Input } from '@danvic/ui'
import { ArrowRight, Clock3, Search } from 'lucide-react'
import { CourseCover } from './course-cover-display'
import Link from 'next/link'
import { courseHref } from '@/lib/course-route'

export function EnrolledCourseList({ items }: { items: StudentEnrollmentSummary[] }) {
  const [query, setQuery] = useState('')
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return items
    return items.filter((item) =>
      `${item.course?.name ?? ''} ${item.authorName ?? ''}`.toLocaleLowerCase().includes(normalized),
    )
  }, [items, query])

  return (
    <>
      <label className="lr-course-search" aria-label="Search enrolled courses">
        <Search aria-hidden="true" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by course or author" />
      </label>
      {visibleItems.length ? (
        <div className="lr-course-cards">
          {visibleItems.map((item) =>
            item.course ? (
              <article className="lr-course-card" key={item.enrollment.id}>
                <CourseCover course={item.course} className="lr-course-card-media" showFallback />
                <div className="lr-course-card-body">
                  <div className="lr-course-card-head">
                    <div>
                      <h2>{item.course.name}</h2>
                      <p className="lr-course-card-meta">
                        <Clock3 aria-hidden="true" /> {item.course.durationMinutes} minutes · {item.course.type === 'live' ? 'Live course' : 'Premade course'} · By {item.authorName ?? 'DANVIC author'}
                      </p>
                    </div>
                    <div className="lr-course-card-badges">
                      <Badge tone={item.course.type === 'live' ? 'violet' : 'blue'}>{item.course.type}</Badge>
                      <Badge tone={item.enrollment.completedAt ? 'green' : 'blue'}>{item.enrollment.completedAt ? 'Completed' : 'In progress'}</Badge>
                    </div>
                  </div>
                  <div className="lr-course-card-progress">
                    <span>{item.completedModules.length}/{item.moduleCount} modules complete</span>
                    <div className="lr-progress" aria-label="Course progress">
                      <i style={{ width: `${item.moduleCount ? Math.round((item.completedModules.length / item.moduleCount) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div className="lr-course-card-foot">
                    <span className="lr-course-card-access">
                      {item.course.accessType === 'paid' ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(item.course.priceKobo / 100) : 'Free'}
                    </span>
                    <Link className="lr-row-action" href={courseHref(item.course.id)} aria-label={`${item.enrollment.completedAt ? 'Review' : 'Continue'} ${item.course.name}`}>
                      {item.enrollment.completedAt ? 'Review' : 'Continue'} <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ) : null,
          )}
        </div>
      ) : <p className="lr-course-search-empty">No enrolled courses match “{query}”.</p>}
    </>
  )
}
