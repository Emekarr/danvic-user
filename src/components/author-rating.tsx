'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@danvic/api-client'
import { FormMessage } from '@danvic/ui'
import { Star } from 'lucide-react'

export function AuthorRating({ courseId, initialRating }: { courseId: string; initialRating: number | null }) {
  const router = useRouter()
  const [rating, setRating] = useState(initialRating)
  const [hovered, setHovered] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shown = hovered ?? rating ?? 0

  return (
    <section className="lr-author-rating" aria-labelledby={`author-rating-${courseId}`}>
      <div className="lr-author-rating-copy">
        <p className="lr-course-section-eyebrow">Course feedback</p>
        <h2 id={`author-rating-${courseId}`}>Rate your author</h2>
        <p>Your rating helps other learners choose a course.</p>
      </div>
      <div className="lr-author-rating-stars" role="radiogroup" aria-label="Rate this author from 1 to 5 stars">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            key={value}
            disabled={busy}
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
            aria-checked={rating === value}
            role="radio"
            data-active={value <= shown || undefined}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(value)}
            onBlur={() => setHovered(null)}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                const result = await apiFetch<{ rating: number }>(`/api/courses/${courseId}/author-rating`, {
                  method: 'POST',
                  body: JSON.stringify({ rating: value }),
                })
                setRating(result.rating)
                router.refresh()
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Your rating could not be saved')
              } finally {
                setBusy(false)
              }
            }}
          >
            <Star aria-hidden="true" fill="currentColor" />
          </button>
        ))}
      </div>
      <p className="lr-author-rating-note">
        {rating ? `You rated this author ${rating} out of 5.` : 'Select a star to leave your rating.'}
      </p>
      <FormMessage>{error}</FormMessage>
    </section>
  )
}
