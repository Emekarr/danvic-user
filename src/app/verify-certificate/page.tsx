'use client'

import { PageHeader } from '@danvic/ui'
import { LearnerAppShell } from '@/components/learner-app-shell'
import { CertificateVerifier } from '@/components/certificate-verifier'

export default function VerifyCertificatePage() {
  return (
    <LearnerAppShell>
      <div className="lr-certificate-page">
        <PageHeader
          eyebrow="Certificate verification"
          title="Verify a DANVIC certificate"
          description="Use the certificate ID or QR code printed on any DANVIC certificate to confirm it is genuine."
        />
        <CertificateVerifier />
      </div>
    </LearnerAppShell>
  )
}