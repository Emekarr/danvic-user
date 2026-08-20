'use client'

import type { ReactNode } from 'react'
import { LearnerAppShell } from '@/components/learner-app-shell'
import { useStudent } from '@/lib/data'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { student, loading, error } = useStudent()
  if (loading)
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message">Loading your learning space…</p>
      </main>
    )
  if (error || !student)
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message" data-tone="error">
          {error || 'Could not load your learning space.'}
        </p>
      </main>
    )
  return <LearnerAppShell>{children}</LearnerAppShell>
}