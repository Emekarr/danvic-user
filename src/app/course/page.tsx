import { Suspense } from 'react'
import { CourseRouteView } from '@/components/dynamic-views'
import { LearnerShellLoading } from '@/components/loading-state'

export default function CoursePage() {
  return (
    <Suspense fallback={<LearnerShellLoading label="Loading the course…" />}>
      <CourseRouteView />
    </Suspense>
  )
}
