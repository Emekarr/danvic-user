'use client'

import { useRouter } from 'next/navigation'
import { Button, Input } from '@danvic/ui'
import { ArrowRight } from 'lucide-react'

export function CourseSearch() {
  const router = useRouter()
  return (
    <form
      className="sb-course-search"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        router.push(`/courses/${encodeURIComponent(String(data.get('courseId') ?? '').trim())}`)
      }}
    >
      <Input
        name="courseId"
        aria-label="Course ID"
        placeholder="Enter a 26-character course ID"
        pattern="[0-9A-HJKMNP-TV-Z]{26}"
        required
      />
      <Button>
        Open course <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  )
}
