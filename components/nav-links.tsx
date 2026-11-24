'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type LienNav = { href: string; libelle: string }

export function NavLinks({ liens }: { liens: LienNav[] }) {
  const chemin = usePathname()
  return (
    <nav className="nav">
      {liens.map((l) => (
        <Link key={l.href} href={l.href} className={chemin === l.href || chemin.startsWith(`${l.href}/`) ? 'active' : undefined}>
          {l.libelle}
        </Link>
      ))}
    </nav>
  )
}
