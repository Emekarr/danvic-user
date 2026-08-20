import { Suspense } from 'react'
import { CatchAllDispatcher } from './catch-all-client'

type CatalogResponse = {
  success: boolean
  data: {
    courses: Array<{ id: string; createdByAuthorId: string }>
  } | null
}

export async function generateStaticParams() {
  const routes: Array<{ slug: string[] }> = [{ slug: [] }]
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, '')
  if (!backendUrl) return routes

  try {
    const response = await fetch(`${backendUrl}/api/student/catalog`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    const payload = (await response.json()) as CatalogResponse
    if (!response.ok || !payload.success || !payload.data) return routes

    const seen = new Set<string>()
    for (const course of payload.data.courses) {
      if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(course.id)) continue
      for (const slug of [
        ['courses', course.id],
        ['courses', course.id, 'study'],
        ['courses', course.id, 'live'],
        ['courses', course.id, 'recordings'],
      ]) {
        const key = slug.join('/')
        if (!seen.has(key)) routes.push({ slug })
        seen.add(key)
      }
      if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(course.createdByAuthorId)) {
        const slug = ['authors', course.createdByAuthorId]
        const key = slug.join('/')
        if (!seen.has(key)) routes.push({ slug })
        seen.add(key)
      }
    }
  } catch {
    // The SPA shell still builds when the backend is temporarily unavailable.
    // Cloudflare's fallback handles routes created after this deployment.
  }

  return routes
}

export default function CatchAllPage() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading…</p>
        </main>
      }
    >
      <CatchAllDispatcher />
    </Suspense>
  )
}
