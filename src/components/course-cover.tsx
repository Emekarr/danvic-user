import type { Course } from '@danvic/api-client'
import { BookOpen } from 'lucide-react'
import { CourseCarousel } from './course-carousel'

export function CourseCover({
  course,
  className,
}: {
  course: Course
  className?: string
}) {
  if (course.imageUrls?.length) {
    return className ? (
      <CourseCarousel images={course.imageUrls} alt={course.name} className={className} />
    ) : (
      <CourseCarousel images={course.imageUrls} alt={course.name} />
    )
  }
  const initials = course.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className={className ? `${className} lr-course-placeholder` : 'lr-course-placeholder'}
      data-course-name={initials}
      aria-label={`${course.name} preview`}
    >
      <span className="lr-course-placeholder-icon" aria-hidden="true">
        <BookOpen />
      </span>
      <span className="lr-course-placeholder-name" aria-hidden="true">
        {initials}
      </span>
    </div>
  )
}