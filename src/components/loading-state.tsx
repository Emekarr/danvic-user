import { LoaderCircle } from 'lucide-react'

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
    <main className="lr-shell-loading" role="status" aria-live="polite">
      <div className="lr-shell-loading-brand" aria-hidden="true">
        <span className="sb-brand-mark" />
        <strong>DANVIC</strong>
      </div>
      <LoadingState label={label} />
    </main>
  )
}
