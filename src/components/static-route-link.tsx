import type { AnchorHTMLAttributes, PropsWithChildren } from 'react'

/**
 * ID-based pages are handled by the exported SPA shell. A document navigation
 * lets Cloudflare Pages serve index.html and avoids Next requesting an RSC file
 * that cannot exist for an ID that was created after the static build.
 */
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
