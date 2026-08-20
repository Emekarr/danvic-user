'use client'

import { usePathname } from 'next/navigation'
import { HomeLanding } from '@/components/home-landing'
import { CatchAllViews } from '@/components/dynamic-views'

export function CatchAllDispatcher() {
  const pathname = usePathname()
  if (pathname === '/') return <HomeLanding />
  return <CatchAllViews />
}