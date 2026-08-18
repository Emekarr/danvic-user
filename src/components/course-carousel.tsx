'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CourseCarousel({
  images,
  alt,
  className,
}: {
  images: string[]
  alt: string
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const count = images.length

  const prev = useCallback(() => setIndex((current) => (current - 1 + count) % count), [count])
  const next = useCallback(() => setIndex((current) => (current + 1) % count), [count])

  useEffect(() => {
    if (count < 2) return
    const timer = window.setInterval(next, 5000)
    return () => window.clearInterval(timer)
  }, [count, next])

  if (!count) return null
  return (
    <div className={className ? `lr-carousel ${className}` : 'lr-carousel'} data-count={count}>
      <div
        className="lr-carousel-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
        aria-live="polite"
      >
        {images.map((src, slideIndex) => (
          <div className="lr-carousel-slide" key={src}>
            <Image
              src={src}
              alt={slideIndex === 0 ? alt : `${alt} — preview ${slideIndex + 1}`}
              fill
              sizes="(min-width: 900px) 520px, 100vw"
              unoptimized
            />
          </div>
        ))}
      </div>
      {count > 1 ? (
        <>
          <div className="lr-carousel-controls">
            <button
              type="button"
              className="lr-carousel-arrow"
              aria-label="Previous image"
              onClick={prev}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <div className="lr-carousel-dots" aria-label="Image selection">
              {images.map((_, dotIndex) => (
                <button
                  type="button"
                  className="lr-carousel-dot"
                  data-active={dotIndex === index || undefined}
                  aria-label={`Show image ${dotIndex + 1}`}
                  aria-current={dotIndex === index ? 'true' : undefined}
                  onClick={() => setIndex(dotIndex)}
                  key={dotIndex}
                />
              ))}
            </div>
            <button
              type="button"
              className="lr-carousel-arrow"
              aria-label="Next image"
              onClick={next}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
          <span className="lr-carousel-count" aria-hidden="true">
            {index + 1} / {count}
          </span>
        </>
      ) : null}
    </div>
  )
}