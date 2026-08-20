'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, type CatalogCourse } from '@danvic/api-client'
import { Badge, Brand, Card } from '@danvic/ui'
import { BookOpen, CalendarClock, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import { CourseSearch } from '@/components/course-search'
import { CourseCover } from '@/components/course-cover-display'
import { courseHref } from '@/lib/course-route'

export function HomeLanding() {
  const [courses, setCourses] = useState<CatalogCourse[]>([])
  useEffect(() => {
    let active = true
    apiFetch<{ courses: CatalogCourse[] }>('/api/catalog')
      .then((value) => {
        if (active) setCourses(value.courses)
      })
      .catch(() => {
        if (active) setCourses([])
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <>
      <section className="sb-hero">
        <div className="sb-hero-inner">
          <nav className="sb-hero-nav">
            <Brand href="/" light />
            <div className="sb-hero-actions">
              <Link className="sb-button sb-button--ghost sb-button--md" href="/verify-certificate">
                Verify certificate
              </Link>
              <Link className="sb-button sb-button--soft sb-button--md" href="/catalog">
                Browse catalog
              </Link>
            </div>
          </nav>
          <div className="sb-hero-copy">
            <p className="sb-page-eyebrow">DANVIC Energy Learning</p>
            <h1>Practical knowledge for the work ahead.</h1>
            <p>
              Join scheduled live learning or move through focused premade courses, built by DANVIC
              subject-matter authors.
            </p>
            <div className="sb-hero-actions">
              <Link className="sb-button sb-button--primary sb-button--lg" href="/catalog">
                Explore available courses
              </Link>
            </div>
          </div>
        </div>
      </section>
      <main className="sb-public">
        <header className="sb-page-header">
          <div>
            <p className="sb-page-eyebrow">Direct course access</p>
            <h1>Continue with a course ID</h1>
            <p>Scheduled courses stay locked until their author-defined availability date.</p>
          </div>
        </header>
        <CourseSearch />
        <div className="sb-grid-3" style={{ marginTop: 64 }}>
          <Card className="sb-card-body">
            <span className="sb-empty-icon">
              <CalendarClock aria-hidden="true" />
            </span>
            <h2>Schedule-aware</h2>
            <p>Live learning becomes available at the exact scheduled time.</p>
          </Card>
          <Card className="sb-card-body">
            <span className="sb-empty-icon">
              <BookOpen aria-hidden="true" />
            </span>
            <h2>Clear modules</h2>
            <p>Course content is organized into focused, readable sections.</p>
          </Card>
          <Card className="sb-card-body">
            <span className="sb-empty-icon">
              <ShieldCheck aria-hidden="true" />
            </span>
            <h2>Secure materials</h2>
            <p>Private course files use short-lived download links.</p>
          </Card>
        </div>
        {courses.length ? (
          <section style={{ marginTop: 72 }}>
            <header className="sb-page-header">
              <div>
                <p className="sb-page-eyebrow">Available now</p>
                <h1>Recently published</h1>
                <p>Courses whose scheduled availability has already begun.</p>
              </div>
              <Link href="/catalog" className="sb-button sb-button--ghost sb-button--md">
                View full catalog
              </Link>
            </header>
            <div className="sb-course-grid">
              {courses.slice(0, 3).map((course) => (
                <Card className="sb-course-card" key={course.id}>
                  <div className="lr-home-course-cover">
                    <CourseCover course={course} className="lr-home-course-cover-media" />
                    <Badge tone={course.type === 'live' ? 'violet' : 'blue'}>{course.type}</Badge>
                  </div>
                  <div className="sb-course-body">
                    <h3>{course.name}</h3>
                    <p>Focused DANVIC energy learning.</p>
                    <div className="sb-course-meta">
                      <span>
                        <Clock3 aria-hidden="true" /> {course.durationMinutes} min
                      </span>
                      <span>
                        <CheckCircle2 aria-hidden="true" /> Available
                      </span>
                    </div>
                    <Link
                      href={courseHref(course.id)}
                      className="sb-button sb-button--secondary sb-button--sm"
                      style={{ width: '100%', marginTop: 16 }}
                    >
                      Open course
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  )
}
