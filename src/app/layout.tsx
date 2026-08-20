import type { Metadata } from 'next'
import '@danvic/ui/styles.css'
import './learner.css'
import ReactDomLegacy from '../lib/react-dom-legacy'

export const metadata: Metadata = { title: { default: 'DANVIC Energy Learning', template: '%s · DANVIC' }, description: 'Practical energy learning through live sessions and focused on-demand courses.', robots: { index: false, follow: false } }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ReactDomLegacy />{children}</body></html>
}
