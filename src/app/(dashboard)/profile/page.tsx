'use client'

import Link from 'next/link'
import { Badge, PageHeader } from '@danvic/ui'
import { useEnrollments, useStudent } from '@/lib/data'
import { StudentProfileForm } from '@/components/student-profile-form'

export default function ProfilePage() {
  const studentState = useStudent()
  const enrollmentsState = useEnrollments()

  if (studentState.loading || enrollmentsState.loading)
    return <p className="ad-empty-line">Loading your profile…</p>
  if (studentState.error || enrollmentsState.error || !studentState.student)
    return (
      <p className="ad-empty-line" data-tone="error">
        {studentState.error || enrollmentsState.error || 'Could not load your profile.'}
      </p>
    )

  const student = studentState.student
  const enrollments = enrollmentsState.data ?? []
  const completed = enrollments.filter((item) => item.enrollment.completedAt).length
  const certificates = enrollments.filter(
    (item) => item.certificate && !item.certificate.revokedAt,
  ).length
  const firstName = student.firstName.trim() || 'This learner'
  const socialLinks = [
    { label: 'LinkedIn', href: student.linkedInUrl },
    { label: 'Facebook', href: student.facebookUrl },
    { label: 'X (Twitter)', href: student.xUrl },
    { label: 'YouTube', href: student.youtubeUrl },
    { label: 'Personal website', href: student.websiteUrl },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href))
  const learningBio =
    enrollments.length === 0
      ? `${firstName} is ready to begin learning. Browse the course catalog to find a course to enrol in.`
      : `${firstName} is enrolled in ${enrollments.length} course${enrollments.length === 1 ? '' : 's'} and has completed ${completed} so far. Keep learning, track your progress, and return here to see the record grow.`
  return (
    <div className="lr-profile-page">
      <PageHeader
        eyebrow="Learner"
        title={`${student.firstName} ${student.lastName}`}
        description={student.email}
      />
      <section className="lr-section lr-profile-bio" aria-labelledby="learning-bio-title">
        <div className="lr-section-heading">
          <div>
            <h2 id="learning-bio-title">Learning bio</h2>
            <p>A short view of your learning journey at DANVIC.</p>
          </div>
        </div>
        <p>{learningBio}</p>
        {socialLinks.length ? (
          <ul className="lr-profile-bio-social">
            {socialLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="lr-section" aria-labelledby="profile-details-title">
        <div className="lr-section-heading">
          <div>
            <h2 id="profile-details-title">Profile details</h2>
            <p>Your account, learning, and security status.</p>
          </div>
          <Badge tone={student.twoFactorEnabled ? 'green' : 'amber'} dot>
            {student.twoFactorEnabled ? 'Two-factor protected' : 'Security setup needed'}
          </Badge>
        </div>
        <dl className="lr-profile-details">
          <div>
            <dt>Enrolled courses</dt>
            <dd>{enrollments.length}</dd>
            <Link href="/courses">View my courses</Link>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{completed}</dd>
            <Link href="/courses">See learning record</Link>
          </div>
          <div>
            <dt>Certificates</dt>
            <dd>{certificates}</dd>
            <Link href="/certificates">View certificates</Link>
          </div>
        </dl>
      </section>
      <section className="lr-section" aria-labelledby="profile-editor-title">
        <div className="lr-section-heading">
          <div>
            <h2 id="profile-editor-title">Edit profile</h2>
            <p>Update your public bio and optional social links.</p>
          </div>
        </div>
        <StudentProfileForm student={student} />
      </section>
    </div>
  )
}