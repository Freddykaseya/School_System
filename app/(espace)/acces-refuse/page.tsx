import { Lock } from 'lucide-react'
import Link from 'next/link'

const DETAILS: Record<string, string> = {
  ecole: 'Votre compte est rattaché à une autre école.',
  comptabilite: 'La comptabilité est réservée à la direction, à la comptabilité de l’école et à l’administrateur.',
  admin: 'Cet espace est réservé à l’administrateur du groupe scolaire.',
}

export default async function AccesRefuse({ searchParams }: { searchParams: Promise<{ domaine?: string; ecole?: string }> }) {
  const { domaine, ecole } = await searchParams
  return (
    <section className="refus" role="alert">
      <div className="tuile-icone"><Lock size={30} aria-hidden="true" /></div>
      <h1>Votre accès ne vous permet pas d’accéder à ce domaine.</h1>
      <p className="sub">
        {DETAILS[domaine ?? ''] ?? ''}
        {ecole && domaine === 'ecole' ? ` (${ecole})` : ''} Si vous pensez que c’est une erreur, contactez l’administrateur.
      </p>
      <Link href="/choisir" className="primary compact" style={{ display: 'inline-grid', placeItems: 'center', textDecoration: 'none' }}>
        Revenir au choix de l’école
      </Link>
    </section>
  )
}
