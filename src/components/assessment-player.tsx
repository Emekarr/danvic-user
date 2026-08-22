'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Assessment, AssessmentAttempt } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Button, FormMessage, Textarea } from '@danvic/ui'
import { CheckCircle2, Clock3, PlayCircle } from 'lucide-react'
import { assessmentAttemptHref, assessmentHref } from '@/lib/course-route'

export function StartAssessmentButton({
  assessmentId,
  label = 'Start timed assessment',
  navigate = false,
}: {
  assessmentId: string
  label?: string
  navigate?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div>
      <Button
        busy={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            await apiFetch(`/api/assessments/${assessmentId}/start`, { method: 'POST', body: '{}' })
            if (navigate) router.push(assessmentHref(assessmentId))
            else router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Assessment could not be started')
          } finally {
            setBusy(false)
          }
        }}
      >
        <PlayCircle aria-hidden="true" /> {label}
      </Button>
      <FormMessage>{error}</FormMessage>
    </div>
  )
}

type DraftAnswer = { selectedOptionIds: string[]; text: string }

export function AssessmentPlayer({
  assessment,
  attempt,
}: {
  assessment: Assessment
  attempt: AssessmentAttempt
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({})
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000)),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const answered = useMemo(
    () =>
      Object.values(answers).filter(
        (answer) => answer.text.trim() || answer.selectedOptionIds.length,
      ).length,
    [answers],
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(
        Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000)),
      )
    }, 1000)
    return () => window.clearInterval(timer)
  }, [attempt.expiresAt])

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await apiFetch(`/api/assessment-attempts/${attempt.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: assessment.questions.map((question) => ({
            questionId: question.id,
            selectedOptionIds: answers[question.id]?.selectedOptionIds ?? [],
            text: answers[question.id]?.text || null,
          })),
        }),
      })
      router.push(assessmentAttemptHref(attempt.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Assessment could not be submitted')
    } finally {
      setBusy(false)
    }
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return (
    <div className="lr-player-layout">
      <div className="lr-player-main">
        {assessment.questions.map((question, index) => {
          const answer = answers[question.id] ?? { selectedOptionIds: [], text: '' }
          return (
            <section className="lr-question" key={question.id}>
              <header className="lr-question-head">
                <span className="lr-question-num">{index + 1}</span>
                <h3>{question.prompt}</h3>
                <span className="lr-question-points">
                  {question.points} {question.points === 1 ? 'point' : 'points'}
                </span>
              </header>
              {question.mediaType === 'image' && question.mediaUrl ? (
                <div className="lr-question-media">
                  <Image
                    src={question.mediaUrl}
                    alt={`Diagram for question ${index + 1}`}
                    width={1200}
                    height={675}
                    unoptimized
                  />
                </div>
              ) : null}
              {question.mediaType === 'video' && question.mediaUrl ? (
                <video
                  className="lr-question-media"
                  src={question.mediaUrl}
                  controls
                  preload="metadata"
                >
                  Your browser cannot play this video.
                </video>
              ) : null}
              {question.mediaType === 'audio' && question.mediaUrl ? (
                <audio
                  className="lr-question-audio"
                  src={question.mediaUrl}
                  controls
                  preload="metadata"
                >
                  Your browser cannot play this audio.
                </audio>
              ) : null}
              {question.type === 'multiple_choice' ? (
                <fieldset className="lr-choice-list">
                  <legend>Select all answers that apply</legend>
                  {question.options.map((option) => (
                    <label className="lr-choice" key={option.id}>
                      <input
                        type="checkbox"
                        checked={answer.selectedOptionIds.includes(option.id)}
                        onChange={(event) => {
                          const selectedOptionIds = event.target.checked
                            ? [...answer.selectedOptionIds, option.id]
                            : answer.selectedOptionIds.filter((id) => id !== option.id)
                          setAnswers((items) => ({
                            ...items,
                            [question.id]: { ...answer, selectedOptionIds },
                          }))
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <Textarea
                  className="lr-written-answer"
                  value={answer.text}
                  maxLength={50000}
                  placeholder="Write your answer here…"
                  onChange={(event) =>
                    setAnswers((items) => ({
                      ...items,
                      [question.id]: { ...answer, text: event.target.value },
                    }))
                  }
                />
              )}
            </section>
          )
        })}
      </div>
      <aside className="lr-player-sidebar">
        <section className="lr-player-card lr-timer" data-urgent={remaining < 300 || undefined}>
          <Clock3 aria-hidden="true" />
          <div>
            <small>Time remaining</small>
            <strong>
              {minutes}:{String(seconds).padStart(2, '0')}
            </strong>
          </div>
        </section>
        <section className="lr-player-card">
          <div className="lr-player-card-head">
            <span>Attempt</span>
            <strong>
              {attempt.attemptNumber} of {assessment.maxAttempts}
            </strong>
          </div>
          <p>{assessment.passingScorePercent}% is required to pass.</p>
        </section>
        <section className="lr-player-card">
          <div className="lr-player-card-head">
            <span>Answered</span>
            <strong>
              {answered} of {assessment.questions.length}
            </strong>
          </div>
          <p>You can submit with unanswered questions. Submission is final.</p>
          <FormMessage>{error}</FormMessage>
          <Button busy={busy} disabled={remaining === 0} onClick={() => void submit()}>
            <CheckCircle2 aria-hidden="true" /> Submit assessment
          </Button>
        </section>
      </aside>
    </div>
  )
}
