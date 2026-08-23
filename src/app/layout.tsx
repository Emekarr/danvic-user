import type { Metadata } from 'next'
import { Montserrat, Open_Sans } from 'next/font/google'
import '@danvic/ui/styles.css'
import './brand.css'
import './learner.css'
import './live-classroom.css'
import ReactDomLegacy from '../lib/react-dom-legacy'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'DANVIC Energy Learning', template: '%s · DANVIC' },
  description: 'Practical energy learning through live sessions and focused on-demand courses.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body>
        <ReactDomLegacy />
        {children}
      </body>
    </html>
  )
}
