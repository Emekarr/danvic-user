'use client'

import type { ReactNode } from 'react'
import { AppShell } from '@danvic/ui'
import { apiFetch, type StudentProfile } from '@danvic/api-client'
import { SessionRenewal } from '@/components/session-renewal'
import { useResource } from '@/lib/data'
import { LearnerShellLoading } from '@/components/loading-state'

export function LearnerAppShell({
  children,
  student: resolvedStudent,
}: {
  children: ReactNode
  student?: StudentProfile | null
}) {
  const { data, loading } = useResource<{ student: StudentProfile }>(
    '/api/auth/me',
    false,
    resolvedStudent === undefined,
  )
  const student = resolvedStudent === undefined ? data?.student ?? null : resolvedStudent
  if (resolvedStudent === undefined && loading) {
    return <LearnerShellLoading label="Loading your learning space…" />
  }
  if (student) {
    return (
      <AppShell
        kind="learner"
        displayName={`${student.firstName} ${student.lastName}`}
        email={student.email}
        onLogout={async () => {
          await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' })
        }}
      >
        <SessionRenewal />
        {children}
      </AppShell>
    )
  }
  return <main className="lr-page">{children}</main>
}
