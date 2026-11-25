import { ArrowLeft, Calculator, LayoutDashboard, ReceiptText, School, Users } from 'lucide-react'
import Link from 'next/link'

import { ecoleAccessible, peutFaireComptabilite } from '@/lib/acces'
import { ROLES } from '@/lib/libelles'

/** Accueil d'une école : une tuile par espace de travail. */
export default async function AccueilEcole({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { profil, ecoleOuverte: ecole } = await ecoleAccessible(code)
  const admin = profil.role === 'ADMIN'

  const tuiles = [
    {
      href: `/ecoles/${ecole.code}/tableau-de-bord`, Icone: LayoutDashboard, titre: 'Tableau de bord',
      texte: 'Effectifs et paiements par classe, taux de recouvrement.',
    },
    {
      href: `/ecoles/${ecole.code}/frais`, Icone: ReceiptText, titre: 'Frais scolaires',
      texte: admin ? 'Fixer le minerval, les tranches, le bulletin et les autres frais de chaque classe.' : 'Minerval, tranches, bulletin et autres frais de chaque classe.',
    },
    {
      href: `/ecoles/${ecole.code}/comptabilite`, Icone: Calculator, titre: 'Comptabilité',
      texte: peutFaireComptabilite(profil, ecole.id)
        ? 'Analyse des fichiers, paiements encaissés, élèves en ordre et rapports.'
        : 'Réservé à la direction et à la comptabilité.',
    },
    ...(admin
      ? [{ href: `/admin/comptes/ecole/${ecole.code}`, Icone: Users, titre: 'Personnel', texte: 'Comptes de l’école et rôles de chacun.' }]
      : []),
  ]

  return (
    <>
      <Link href="/choisir" className="retour"><ArrowLeft size={16} aria-hidden="true" /> Choisir une école</Link>
      <header className="heading">
        <div className="entete-espace">
          <div className="tuile-icone"><School size={28} aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">{ecole.code} · {ROLES[profil.role]}</p>
            <h1>{ecole.nom}</h1>
            <p className="sub">Que voulez-vous faire ?</p>
          </div>
        </div>
      </header>
      <section className="tuiles" aria-label={`Espaces de ${ecole.code}`}>
        {tuiles.map(({ href, Icone, titre, texte }) => (
          <Link key={titre} href={href} className="tuile">
            <div className="tuile-icone"><Icone size={26} aria-hidden="true" /></div>
            <div className="tuile-titre">
              <strong>{titre}</strong>
              <span>{texte}</span>
            </div>
          </Link>
        ))}
      </section>
    </>
  )
}
