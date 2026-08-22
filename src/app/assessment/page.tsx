import { Suspense } from 'react'
import { AssessmentRouteView } from '@/components/static-detail-views'
import { LearnerShellLoading } from '@/components/loading-state'

export default function AssessmentPage() {
  return (
    <Suspense fallback={<LearnerShellLoading label="Loading the assessment…" />}>
      <AssessmentRouteView />
    </Suspense>
  )
}
