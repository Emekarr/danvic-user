'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { apiFetch, type Assessment, type CatalogCourse, type StudentEnrollmentSummary, type StudentPayments, type StudentProfile } from '@danvic/api-client'
import { AppShell, Badge, PageHeader } from '@danvic/ui'
import { CatalogCourseList } from '@/components/catalog-course-list'
import { CertificateVerifier } from '@/components/certificate-verifier'
import { EnrolledCourseList } from '@/components/enrolled-course-list'
import { SavedCards } from '@/components/payment-center'
import { SecurityForm } from '@/components/security-form'
import { SessionRenewal } from '@/components/session-renewal'
import { ForgotPasswordForm, LoginForm, ResetPasswordForm, TwoFactorForm, AcceptExistingInvitation, AcceptInvitationForm } from '@/components/student-auth'
import { StudentProfileForm } from '@/components/student-profile-form'

type Workspace = { student: StudentProfile; enrollments: StudentEnrollmentSummary[]; assessments: Assessment[]; payments: StudentPayments }
const blank: Workspace = { student: {} as StudentProfile, enrollments: [], assessments: [], payments: { paymentMethods: [], transactions: [], cardSetupAmountKobo: 5000 } }
export default function LearnerPage() {
  return <Suspense fallback={<main className="lr-page"><p className="sb-form-message">Loading your learning space…</p></main>}><LearnerApp /></Suspense>
}

function LearnerApp() {
  const pathname = usePathname(); const router = useRouter(); const query = useSearchParams(); const [data, setData] = useState<Workspace>(blank); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const publicPage = ['/login', '/forgot-password', '/reset-password', '/two-factor', '/two-factor/setup', '/invitations/accept', '/catalog', '/verify-certificate'].includes(pathname)
  useEffect(() => { if (publicPage) { setLoading(false); return }; let active = true; void Promise.all([apiFetch<{ student: StudentProfile }>('/api/auth/me'), apiFetch<{ enrollments: StudentEnrollmentSummary[] }>('/api/courses'), apiFetch<{ assessments: Assessment[] }>('/api/assessments'), apiFetch<StudentPayments>('/api/payments')]).then(([student, enrollments, assessments, payments]) => { if (active) setData({ student: student.student, enrollments: enrollments.enrollments, assessments: assessments.assessments, payments }) }).catch((cause: unknown) => { if (active) { setError(cause instanceof Error ? cause.message : 'Could not load your learning space.'); router.replace('/login') } }).finally(() => active && setLoading(false)); return () => { active = false } }, [publicPage, router])
  if (pathname === '/login') return <LoginForm returnTo={query.get('next') ?? undefined} />
  if (pathname === '/forgot-password') return <ForgotPasswordForm />
  if (pathname === '/reset-password') return <ResetPasswordForm />
  if (pathname === '/two-factor' || pathname === '/two-factor/setup') return <TwoFactorForm setup={pathname.endsWith('/setup')} />
  if (pathname === '/invitations/accept') return query.get('existing') === 'true' ? <AcceptExistingInvitation token={query.get('token') ?? ''} /> : <AcceptInvitationForm token={query.get('token') ?? ''} />
  if (pathname === '/verify-certificate') return <CertificateVerifier />
  if (pathname === '/catalog') return <PublicCatalog />
  if (loading) return <main className="lr-page"><p className="sb-form-message">Loading your learning space…</p></main>
  if (error) return <main className="lr-page"><p className="sb-form-message" data-tone="error">{error}</p></main>
  return <AppShell kind="learner" displayName={`${data.student.firstName} ${data.student.lastName}`} email={data.student.email} onLogout={async () => { await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' }) }}><SessionRenewal /><div className="lr-page"><View pathname={pathname} data={data} /></div></AppShell>
}
function View({ pathname, data }: { pathname: string; data: Workspace }) { if (pathname === '/courses') return <Courses items={data.enrollments} />; if (pathname === '/profile') return <><PageHeader title={`${data.student.firstName} ${data.student.lastName}`} description={data.student.email} /><section className="lr-section"><StudentProfileForm student={data.student} /></section></>; if (pathname === '/security') return <><PageHeader title="Security settings" /><SecurityForm student={data.student} /></>; if (pathname === '/payments') return <><PageHeader title="Payments" description="Manage reusable cards and review your transaction history." /><SavedCards methods={data.payments.paymentMethods} setupAmountKobo={data.payments.cardSetupAmountKobo} /></>; if (pathname === '/assessments') return <Assessments items={data.assessments} />; return <Overview data={data} /> }
function Overview({ data }: { data: Workspace }) { const complete = data.enrollments.filter((item) => item.enrollment.completedAt).length; return <div><PageHeader eyebrow="Learning" title="Overview" description="A clear view of your progress and the next learning step." actions={<Link href="/catalog" className="sb-button sb-button--primary sb-button--md">Browse catalog</Link>} /><section className="lr-directory"><div className="lr-directory-grid">{[['My courses', data.enrollments.length, '/courses'], ['Completed', complete, '/courses'], ['Assessments', data.assessments.length, '/assessments'], ['Certificates', complete, '/verify-certificate']].map(([label, value, href]) => <Link className="lr-directory-card" href={String(href)} key={String(label)}><span className="lr-directory-card-label">{label}</span><strong>{value}</strong><span className="lr-directory-card-note">View {String(label).toLowerCase()}</span></Link>)}</div></section></div> }
function Courses({ items }: { items: StudentEnrollmentSummary[] }) { return <div><PageHeader eyebrow="Learning" title="Enrolled courses" description="Courses available in your learning space and the progress you have made." actions={<Link href="/catalog" className="sb-button sb-button--primary sb-button--md">Browse catalog</Link>} /><section className="lr-section lr-section--plain"><EnrolledCourseList items={items} /></section></div> }
function Assessments({ items }: { items: Assessment[] }) { return <div><PageHeader eyebrow="Assessment" title="Your assessments" description="Take standalone assessments or complete the final step in an enrolled course." />{items.map((item) => <article className="lr-assessment-row" key={item.id}><div><h2>{item.title}</h2><p>{item.description}</p></div><Badge>{item.attempt?.status ?? item.availability ?? 'scheduled'}</Badge></article>)}</div> }
function PublicCatalog() { const [courses, setCourses] = useState<CatalogCourse[] | null>(null); const [enrolled, setEnrolled] = useState<string[]>([]); const [canEnroll, setCanEnroll] = useState(false); useEffect(() => { void Promise.all([apiFetch<{ courses: CatalogCourse[] }>('/api/catalog'), apiFetch<{ enrollments: StudentEnrollmentSummary[] }>('/api/courses').catch(() => ({ enrollments: [] })), apiFetch<{ student: StudentProfile }>('/api/auth/me').then(() => true).catch(() => false)]).then(([catalog, learning, signedIn]) => { setCourses(catalog.courses); setEnrolled(learning.enrollments.map((item) => item.enrollment.courseId)); setCanEnroll(signedIn) }).catch(() => setCourses([])) }, []); return <main className="lr-page"><PageHeader eyebrow="DANVIC learning" title="Course catalog" description={courses === null ? 'Loading available courses…' : `${courses.length} courses available`} />{courses ? <CatalogCourseList initialCourses={courses} enrolledCourseIds={enrolled} canEnroll={canEnroll} /> : null}{!canEnroll ? <Link href="/login" className="sb-button sb-button--primary">Sign in to learn</Link> : null}</main> }
