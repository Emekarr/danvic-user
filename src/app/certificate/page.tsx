import { Suspense } from 'react'
import { CertificateRouteView } from '@/components/dynamic-views'
import { LearnerShellLoading } from '@/components/loading-state'

export default function CertificateDetailPage() {
  return (
    <Suspense fallback={<LearnerShellLoading label="Loading the certificate…" />}>
      <CertificateRouteView />
    </Suspense>
  )
}
