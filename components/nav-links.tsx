'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** `prefixes` : sous-pages qui rendent le lien actif (par défaut, tout ce qui commence par href). */
export type LienNav = { href: string; libelle: string; prefixes?: string[] }

export function NavLinks({ liens }: { liens: LienNav[] }) {
  const chemin = usePathname()
  return (
    <nav className="nav">
      {liens.map((l) => (
        <Link key={l.href} href={l.href} className={chemin === l.href || (l.prefixes ?? [l.href]).some((p) => chemin.startsWith(`${p}/`)) ? 'active' : undefined}>
          {l.libelle}
        </Link>
      ))}
    </nav>
  )
}
