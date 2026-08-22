import type { AnchorHTMLAttributes, PropsWithChildren } from 'react'

/** Uses a document navigation for query-driven pages in the static export. */
export function StaticRouteLink({
  href,
  children,
  ...props
}: PropsWithChildren<Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string }>) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
}
