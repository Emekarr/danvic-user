import { Suspense } from 'react'
import { CourseRouteView } from '@/components/dynamic-views'

export default function CoursePage() {
  return (
    <Suspense fallback={<p className="ad-empty-line">Loading the course…</p>}>
      <CourseRouteView />
    </Suspense>
  )
}
