import Link from 'next/link'

import { OngletsEcole } from '@/components/admin/onglets-ecole'
import { EspaceComptabilite } from '@/components/comptabilite/espace-comptabilite'
import { ecoleAccessible } from '@/lib/acces'
import type { Colonne } from '@/lib/comptabilite/colonnes'

// Mois de l'année scolaire correspondant à un mois du calendrier (0 = janvier).
const PAR_MOIS: Colonne[] = ['JANV', 'FVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIN', 'JUIN', 'SPBR', 'OCTB', 'NVBR', 'DCBR']

export default async function Comptabilite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { profil, ecoleOuverte: ecole } = await ecoleAccessible(code, 'comptabilite')
  return (
    <>
      <header className="heading ecran-seulement">
        <div>
          <p className="eyebrow"><Link href="/choisir">Choisir une école</Link> · <Link href={`/ecoles/${ecole.code}`}>{ecole.code}</Link></p>
          <h1>Comptabilité</h1>
          <p className="sub">Analyse des fichiers de l’école, paiements encaissés, élèves en ordre et rapport.</p>
        </div>
      </header>
      <OngletsEcole code={ecole.code} actif="comptabilite" admin={profil.role === 'ADMIN'} />
      <EspaceComptabilite ecole={{ code: ecole.code, nom: ecole.nom }} periodeDefaut={PAR_MOIS[new Date().getMonth()]} />
    </>
  )
}
