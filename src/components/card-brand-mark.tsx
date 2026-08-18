import { CreditCard } from 'lucide-react'

export function CardBrandMark({
  brand,
  compact = false,
  large = false,
}: {
  brand: string
  compact?: boolean
  large?: boolean
}) {
  const normalized = brand.toLowerCase().replace(/[^a-z]/g, '')
  const width = compact ? 42 : large ? 72 : 54
  const height = compact ? 26 : large ? 45 : 34
  const className = `lr-card-brand-mark${compact ? ' lr-card-brand-mark--compact' : ''}${large ? ' lr-card-brand-mark--large' : ''}`

  if (normalized.includes('master'))
    return (
      <svg className={className} width={width} height={height} viewBox="0 0 54 34" role="img" aria-label="Mastercard">
        <rect width="54" height="34" rx="7" fill="#fff" />
        <circle cx="22" cy="16" r="10" fill="#eb001b" />
        <circle cx="32" cy="16" r="10" fill="#f79e1b" fillOpacity=".92" />
      </svg>
    )

  if (normalized.includes('visa'))
    return (
      <svg className={className} width={width} height={height} viewBox="0 0 54 34" role="img" aria-label="Visa">
        <text x="6" y="24" fill="#1434cb" fontSize="20" fontWeight="800" fontStyle="italic">
          VISA
        </text>
      </svg>
    )

  if (normalized.includes('verve'))
    return (
      <svg className={className} width={width} height={height} viewBox="0 0 54 34" role="img" aria-label="Verve">
        <rect width="54" height="34" rx="7" fill="#fff" />
        <text x="5" y="22" fill="#e31b23" fontSize="14" fontWeight="800">
          Verve
        </text>
        <path d="M6 26h39" stroke="#239b56" strokeWidth="2" />
      </svg>
    )

  if (normalized.includes('amex') || normalized.includes('americanexpress'))
    return (
      <svg
        className={className}
        width={width}
        height={height}
        viewBox="0 0 54 34"
        role="img"
        aria-label="American Express"
      >
        <rect width="54" height="34" rx="7" fill="#1478bd" />
        <text x="5" y="21" fill="#fff" fontSize="12" fontWeight="800">
          AMEX
        </text>
      </svg>
    )

  return (
    <span
      aria-label={brand || 'Payment card'}
      className={className}
      style={{ width, height, display: 'grid', placeItems: 'center' }}
    >
      <CreditCard aria-hidden="true" />
    </span>
  )
}
