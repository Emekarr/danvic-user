'use client'

import type { ReactNode } from 'react'
import { LearnerAppShell } from '@/components/learner-app-shell'
import { LearnerShellLoading } from '@/components/loading-state'
import { useStudent } from '@/lib/data'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { student, loading, error } = useStudent()
  if (loading)
    return <LearnerShellLoading label="Loading your learning space…" />
  if (error || !student)
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message" data-tone="error">
          {error || 'Could not load your learning space.'}
        </p>
      </main>
    )
  return <LearnerAppShell student={student}>{children}</LearnerAppShell>
}
