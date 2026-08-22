import { Suspense } from 'react'
import { AuthorRouteView } from '@/components/static-detail-views'
import { LearnerShellLoading } from '@/components/loading-state'

export default function AuthorPage() {
  return (
    <Suspense fallback={<LearnerShellLoading label="Loading the author…" />}>
      <AuthorRouteView />
    </Suspense>
  )
}
