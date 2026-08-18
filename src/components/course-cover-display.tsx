import type { Course } from '@danvic/api-client'
import { CourseCarousel } from './course-carousel'

export function CourseCover({
  course,
  className,
  showFallback = false,
}: {
  course: Course
  className?: string
  showFallback?: boolean
}) {
  if (course.imageUrls?.length) {
    return className ? (
      <CourseCarousel images={course.imageUrls} alt={course.name} className={className} />
    ) : (
      <CourseCarousel images={course.imageUrls} alt={course.name} />
    )
  }
  if (!showFallback) return null
  return (
    <div
      className={className ? `${className} lr-course-placeholder` : 'lr-course-placeholder'}
      aria-label={`${course.name} preview`}
    >
      <span className="lr-course-placeholder-name" aria-hidden="true">
        DANVIC
      </span>
    </div>
  )
}
