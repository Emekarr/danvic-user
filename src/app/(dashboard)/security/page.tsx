'use client'

import { PageHeader } from '@danvic/ui'
import { SecurityForm } from '@/components/security-form'
import { useStudent } from '@/lib/data'
import { LoadingState } from '@/components/loading-state'

export default function SecurityPage() {
  const { student, loading, error } = useStudent()

  if (loading) return <LoadingState label="Loading your security settings…" />
  if (error || !student)
    return <p className="ad-empty-line" data-tone="error">{error || 'Could not load your security settings.'}</p>

  return (
    <div className="ad-settings-page">
      <PageHeader title="Security settings" />
      <SecurityForm student={student} />
    </div>
  )
}
