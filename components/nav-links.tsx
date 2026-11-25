'use client'

import { Building2, LayoutGrid, School, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICONES = { choisir: LayoutGrid, ecole: School, ecoles: Building2, comptes: Users } satisfies Record<string, LucideIcon>

/** `prefixes` : sous-pages qui rendent le lien actif (par défaut, tout ce qui commence par href). */
export type LienNav = { href: string; libelle: string; icone: keyof typeof ICONES; prefixes?: string[] }

export function NavLinks({ liens }: { liens: LienNav[] }) {
  const chemin = usePathname()
  return (
    <nav className="nav" aria-label="Menu principal">
      {liens.map((l) => {
        const actif = chemin === l.href || (l.prefixes ?? [l.href]).some((p) => chemin.startsWith(`${p}/`))
        const Icone = ICONES[l.icone]
        return (
          <Link key={l.href} href={l.href} className={actif ? 'active' : undefined} aria-current={actif ? 'page' : undefined}>
            <Icone size={18} aria-hidden="true" />
            {l.libelle}
          </Link>
        )
      })}
    </nav>
  )
}
