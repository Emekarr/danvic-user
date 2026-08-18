'use client'

import { useState } from 'react'
import { apiFetch, type StudentProfile } from '@danvic/api-client'
import { Button, Field, FormMessage, Textarea } from '@danvic/ui'

type ProfileValues = Pick<
  StudentProfile,
  'bio' | 'linkedInUrl' | 'xUrl' | 'facebookUrl' | 'instagramUrl' | 'youtubeUrl' | 'websiteUrl'
>

const links: Array<{ key: Exclude<keyof ProfileValues, 'bio'>; label: string }> = [
  { key: 'linkedInUrl', label: 'LinkedIn' },
  { key: 'xUrl', label: 'X' },
  { key: 'facebookUrl', label: 'Facebook' },
  { key: 'instagramUrl', label: 'Instagram' },
  { key: 'youtubeUrl', label: 'YouTube' },
  { key: 'websiteUrl', label: 'Personal website' },
]

export function StudentProfileForm({ student }: { student: StudentProfile }) {
  const [values, setValues] = useState<ProfileValues>(() => ({
    bio: student.bio,
    linkedInUrl: student.linkedInUrl,
    xUrl: student.xUrl,
    facebookUrl: student.facebookUrl,
    instagramUrl: student.instagramUrl,
    youtubeUrl: student.youtubeUrl,
    websiteUrl: student.websiteUrl,
  }))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  return (
    <form
      className="lr-profile-form"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setMessage('')
        setError('')
        try {
          const result = await apiFetch<{ student: StudentProfile }>('/api/profile', {
            method: 'PUT',
            body: JSON.stringify({
              bio: values.bio.trim(),
              ...Object.fromEntries(links.map(({ key }) => [key, values[key]?.trim() || null])),
            }),
          })
          setValues((current) => ({ ...current, ...result.student }))
          setMessage('Your profile has been saved.')
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Your profile could not be saved')
        } finally {
          setBusy(false)
        }
      }}
    >
      <Field label="Bio" hint="Tell other learners a little about yourself.">
        <Textarea
          name="bio"
          rows={5}
          maxLength={2000}
          value={values.bio}
          onChange={(event) =>
            setValues((current) => ({ ...current, bio: event.currentTarget.value }))
          }
        />
      </Field>
      <div className="lr-profile-form-links">
        {links.map(({ key, label }) => (
          <Field key={key} label={label} hint="Optional. Use a complete http(s) URL.">
            <input
              className="sb-input"
              name={key}
              type="url"
              inputMode="url"
              maxLength={500}
              placeholder="https://"
              value={values[key] ?? ''}
              onChange={(event) =>
                setValues((current) => ({ ...current, [key]: event.currentTarget.value || null }))
              }
            />
          </Field>
        ))}
      </div>
      <Button busy={busy}>Save profile</Button>
      <FormMessage tone="success">{message}</FormMessage>
      <FormMessage>{error}</FormMessage>
    </form>
  )
}
