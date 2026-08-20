'use client'

import type { ReactNode } from 'react'
import { AppShell } from '@danvic/ui'
import { apiFetch, type StudentProfile } from '@danvic/api-client'
import { SessionRenewal } from '@/components/session-renewal'
import { useResource } from '@/lib/data'

export function LearnerAppShell({ children }: { children: ReactNode }) {
  const { data } = useResource<{ student: StudentProfile }>('/api/auth/me', false)
  const student = data?.student ?? null
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