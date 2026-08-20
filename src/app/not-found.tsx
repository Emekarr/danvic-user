import Link from 'next/link'
import { Brand } from '@danvic/ui'

export default function NotFound() {
  return (
    <main className="sb-login-form-wrap" style={{ minHeight: '100vh' }}>
      <div className="sb-login-form">
        <Brand href="/" />
        <p className="sb-page-eyebrow" style={{ marginTop: 42 }}>
          404
        </p>
        <h2>Page not found</h2>
        <p>Check the address or return to the current catalog.</p>
        <div className="sb-login-fields">
          <Link href="/catalog" className="sb-button sb-button--primary sb-button--lg">
            Browse courses
          </Link>
        </div>
      </div>
    </main>
  )
}