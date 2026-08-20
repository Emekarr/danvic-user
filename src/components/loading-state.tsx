import { LoaderCircle } from 'lucide-react'
import { AppShell } from '@danvic/ui'

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="lr-loading-state" role="status" aria-live="polite">
      <LoaderCircle className="lr-loading-spinner" aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>Please wait a moment.</span>
      </div>
    </div>
  )
}

export function LearnerShellLoading({ label }: { label: string }) {
  return (
    <div className="lr-loading-shell" aria-busy="true">
      <AppShell
        kind="learner"
        displayName="DANVIC learner"
        email=""
        authenticated={false}
      >
        <LoadingState label={label} />
      </AppShell>
    </div>
  )
}
