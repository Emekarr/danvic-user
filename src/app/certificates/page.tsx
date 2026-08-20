'use client'

import type { Certificate, Course } from '@danvic/api-client'
import { Badge, EmptyState, PageHeader } from '@danvic/ui'
import { ArrowRight, Award } from 'lucide-react'
import { LearnerAppShell } from '@/components/learner-app-shell'
import { useEnrollments } from '@/lib/data'
import { StaticRouteLink } from '@/components/static-route-link'
import { LoadingState } from '@/components/loading-state'

export default function CertificatesPage() {
  const { data, loading, error } = useEnrollments()
  const enrollments = data ?? []
  const certificates = enrollments
    .map((item) => ({ certificate: item.certificate, course: item.course }))
    .filter(
      (entry): entry is { certificate: Certificate; course: Course | null } =>
        Boolean(entry.certificate),
    )
  return (
    <LearnerAppShell>
      <div className="lr-certificates-page">
        <PageHeader
          eyebrow="Learning record"
          title="Your certificates"
          description="Verified certificates issued for the DANVIC courses you have completed."
        />
        {loading ? (
          <LoadingState label="Loading your certificates…" />
        ) : error ? (
          <p className="ad-empty-line" data-tone="error">{error}</p>
        ) : certificates.length ? (
          <div className="lr-cert-list">
            {certificates.map(({ certificate, course }) => (
              <StaticRouteLink
                className="lr-cert-row"
                href={`/certificates/${encodeURIComponent(certificate.certificateNumber)}`}
                key={certificate.id}
              >
                <span className="lr-cert-row-icon">
                  <Award aria-hidden="true" />
                </span>
                <span className="lr-cert-row-copy">
                  <strong>{certificate.courseName}</strong>
                  <small>{certificate.certificateNumber}</small>
                  <span>
                    Issued{' '}
                    {new Date(certificate.issuedAt).toLocaleDateString(undefined, {
                      dateStyle: 'long',
                    })}
                    {course
                      ? ` · ${course.type === 'live' ? 'Live course' : 'Premade course'}`
                      : ''}
                  </span>
                </span>
                <span className="lr-cert-row-end">
                  <Badge tone={certificate.revokedAt ? 'red' : 'green'} dot>
                    {certificate.revokedAt ? 'Revoked' : 'Valid'}
                  </Badge>
                  <ArrowRight aria-hidden="true" className="lr-cert-row-chevron" />
                </span>
              </StaticRouteLink>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Award aria-hidden="true" />}
            title="No certificates yet"
            description="Complete a course and its final assessment to earn a verified certificate."
          />
        )}
      </div>
    </LearnerAppShell>
  )
}
