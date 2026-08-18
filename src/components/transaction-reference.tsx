'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function TransactionReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference)
    } catch {
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span className="lr-ref">
      <strong>{reference}</strong>
      <button
        type="button"
        className="lr-ref-copy"
        data-copied={copied || undefined}
        onClick={() => void copy()}
        aria-label={copied ? 'Reference copied' : `Copy reference ${reference}`}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
    </span>
  )
}