import { Suspense } from 'react'
import { AssessmentAttemptRouteView } from '@/components/static-detail-views'
import { LearnerShellLoading } from '@/components/loading-state'

export default function AssessmentAttemptPage() {
  return (
    <Suspense fallback={<LearnerShellLoading label="Loading your submission…" />}>
      <AssessmentAttemptRouteView />
    </Suspense>
  )
}
