'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import type { Attachment, StudentCourseAggregate } from '@danvic/api-client'
import { Button, CustomDropdown } from '@danvic/ui'
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  LockKeyhole,
  Video,
  Volume2,
} from 'lucide-react'
import { CompleteModuleButton } from './course-participation'
import { courseHref } from '@/lib/course-route'

type AttachmentKind = 'image' | 'video' | 'audio' | 'link' | 'file'

function attachmentKind(path: string): AttachmentKind {
  const extension = path.split('?')[0]?.split('.').at(-1)?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension ?? '')) return 'image'
  if (['mp4', 'webm', 'mov'].includes(extension ?? '')) return 'video'
  if (['mp3', 'wav', 'ogg'].includes(extension ?? '')) return 'audio'
  return /^https?:\/\//iu.test(path) ? 'link' : 'file'
}

function resourceLabel(kind: AttachmentKind) {
  return kind === 'image'
    ? 'Image'
    : kind === 'video'
      ? 'Video'
      : kind === 'audio'
        ? 'Audio'
        : kind === 'link'
          ? 'Link'
          : 'Document'
}

function resourceIcon(kind: AttachmentKind) {
  if (kind === 'image') return <ImageIcon aria-hidden="true" />
  if (kind === 'video') return <Video aria-hidden="true" />
  if (kind === 'audio') return <Volume2 aria-hidden="true" />
  if (kind === 'link') return <Link2 aria-hidden="true" />
  return <FileText aria-hidden="true" />
}

function Resources({
  attachments,
  courseId,
  heading,
  emptyCopy,
}: {
  attachments: Attachment[]
  courseId: string
  heading: string
  emptyCopy: string
}) {
  return (
    <section className="lr-module-resources" aria-label={heading}>
      <div className="lr-module-resources-heading">
        <span>{heading}</span>
        {attachments.length ? <small>{attachments.length}</small> : null}
      </div>
      {attachments.length ? (
        <ul>
          {attachments.map((attachment, index) => {
            const kind = attachmentKind(attachment.attachmentPath)
            const external = kind === 'link' || kind === 'file'
            const fileName = attachment.attachmentPath.split('/').at(-1)?.split('?')[0] ?? ''
            const name = attachment.fileName || `${resourceLabel(kind)} material ${index + 1}`
            const href = external
              ? attachment.attachmentPath
              : courseHref(courseId, 'attachment', attachment.id)
            return (
              <li key={attachment.id}>
                {external ? (
                  <a href={href} target="_blank" rel="noreferrer" className="lr-resource-link">
                    <span className="lr-resource-icon" data-kind={kind}>{resourceIcon(kind)}</span>
                    <span className="lr-resource-copy">
                      <strong>{name || fileName}</strong>
                      <small>{resourceLabel(kind)} · Opens in a new tab</small>
                    </span>
                    <ExternalLink aria-hidden="true" />
                  </a>
                ) : (
                  <Link href={href} className="lr-resource-link">
                    <span className="lr-resource-icon" data-kind={kind}>{resourceIcon(kind)}</span>
                    <span className="lr-resource-copy">
                      <strong>{name || fileName}</strong>
                      <small>{resourceLabel(kind)} · View only</small>
                    </span>
                    <ExternalLink aria-hidden="true" />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      ) : <p className="lr-module-resources-empty">{emptyCopy}</p>}
    </section>
  )
}

export function CourseStudyPlayer({ value }: { value: StudentCourseAggregate }) {
  const { course, modules, attachments, completedModuleIds } = value
  const router = useRouter()
  const [completedModuleIdState, setCompletedModuleIdState] = useState(completedModuleIds)
  const completed = new Set(completedModuleIdState)
  const [activeIndex, setActiveIndex] = useState(0)
  const materialsRef = useRef<HTMLElement>(null)
  const active = modules[activeIndex]
  const locked = active ? modules.slice(0, activeIndex).some((module) => !completed.has(module.id)) : false
  const courseAttachments = attachments.filter((attachment) => !attachment.moduleId)
  const moduleAttachments = active
    ? attachments.filter((attachment) => attachment.moduleId === active.id)
    : []

  return (
    <main className="lr-study-player">
      <header className="lr-study-player-head">
        <div className="lr-study-course-heading">
          <Link href={courseHref(course.id)} className="sb-button sb-button--ghost sb-button--sm">
            <ChevronLeft aria-hidden="true" /> Back to course
          </Link>
          <h1>{course.name}</h1>
        </div>
        <div className="lr-study-player-actions">
          <a
            href="#course-materials"
            className="sb-button sb-button--ghost sb-button--sm"
            onClick={(event) => {
              event.preventDefault()
              materialsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            Go to course materials <ArrowDown aria-hidden="true" />
          </a>
          <span>{completed.size}/{modules.length} complete</span>
        </div>
      </header>
      <div className="lr-study-player-body">
        <div className="lr-study-main">
          {modules.length ? (
            <div className="lr-study-module-picker">
              <span>Course outline</span>
              <CustomDropdown<string>
                value={String(activeIndex)}
                onChange={(value) => setActiveIndex(Number(value))}
                options={modules.map((module, index) => {
                  const isComplete = completed.has(module.id)
                  const isLocked = modules.slice(0, index).some((previous) => !completed.has(previous.id))
                  return (
                    {
                      value: String(index),
                      label: `Module ${index + 1}: ${module.title}`,
                      description: isComplete
                        ? 'Completed'
                        : isLocked
                          ? 'Complete earlier modules first'
                          : 'Ready to study',
                      disabled: isLocked,
                    }
                  )
                })}
              />
            </div>
          ) : null}
          <article className="lr-study-lesson">
            {active ? (
              <>
                <p className="lr-course-section-eyebrow">Module {activeIndex + 1} of {modules.length}</p>
                <h2>{active.title}</h2>
                {locked ? (
                  <p className="lr-study-locked"><LockKeyhole aria-hidden="true" /> Complete earlier modules to open this lesson.</p>
                ) : (
                  <>
                    <div className="lr-study-content">{active.content}</div>
                    <CompleteModuleButton
                      courseId={course.id}
                      moduleId={active.id}
                      completed={completed.has(active.id)}
                      locked={false}
                      onCompleted={(courseCompleted) => {
                        setCompletedModuleIdState((current) =>
                          current.includes(active.id) ? current : [...current, active.id],
                        )
                        if (courseCompleted) router.replace(courseHref(course.id))
                      }}
                    />
                  </>
                )}
                <div className="lr-study-pagination">
                  <Button variant="ghost" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => index - 1)}>
                    <ChevronLeft aria-hidden="true" /> Previous
                  </Button>
                  <Button disabled={activeIndex === modules.length - 1 || !completed.has(active.id)} onClick={() => setActiveIndex((index) => index + 1)}>
                    Next <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </>
            ) : null}
            <section className="lr-study-materials" id="course-materials" ref={materialsRef}>
              <div className="lr-study-materials-heading">
                <p className="lr-course-section-eyebrow">Course library</p>
                <h2>Course materials</h2>
                <p>Resources for this course and the current learning module.</p>
              </div>
              <Resources attachments={courseAttachments} courseId={course.id} heading="Course-wide materials" emptyCopy="No course-wide materials were added." />
              {active ? (
                <Resources attachments={moduleAttachments} courseId={course.id} heading={`Module ${activeIndex + 1} materials`} emptyCopy="No supporting material was added to this module." />
              ) : null}
            </section>
          </article>
        </div>
      </div>
    </main>
  )
}
