import type { Metadata } from 'next'
import '@danvic/ui/styles.css'
import './learner.css'

export const metadata: Metadata = { title: { default: 'DANVIC Energy Learning', template: '%s · DANVIC' }, description: 'Practical energy learning through live sessions and focused on-demand courses.' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html> }
