'use client'

import { PageHeader } from '@danvic/ui'
import { SecurityForm } from '@/components/security-form'
import { useStudent } from '@/lib/data'
import { LoadingState } from '@/components/loading-state'

export default function SecurityPage() {
  const { student, loading, error } = useStudent()

  return (
    <div className="ad-settings-page">
      <PageHeader title="Security settings" />
      {loading ? (
        <LoadingState label="Loading your security settings…" />
      ) : error || !student ? (
        <p className="ad-empty-line" data-tone="error">
          {error || 'Could not load your security settings.'}
        </p>
      ) : (
        <SecurityForm student={student} />
      )}
    </div>
  )
}
