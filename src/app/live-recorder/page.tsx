import { Suspense } from 'react'
import { RecorderRouteView } from '@/components/static-detail-views'
import { LearnerShellLoading } from '@/components/loading-state'

export default function LiveRecorderPage() {
  return (
    <Suspense fallback={<LearnerShellLoading label="Preparing the recorder…" />}>
      <RecorderRouteView />
    </Suspense>
  )
}
