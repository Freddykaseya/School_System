import Link from 'next/link'
import { redirect } from 'next/navigation'

import { seDeconnecter } from '@/app/login/actions'
import { Logo } from '@/components/logo'
import { MARQUE } from '@/lib/marque'
import { getSession, lireEnTantQueConnecte } from '@/lib/session'

/** Après la connexion de l'administrateur : choisir une école, ou l'administration. */
export default async function ChoisirEcole() {
  const { profil } = await getSession()
  if (profil.role !== 'ADMIN') redirect('/ecole')

  const ecoles = await lireEnTantQueConnecte((q) =>
    q<{ code: string; nom: string }>('select code, nom from ecoles where actif order by code'),
  )

  return (
    <main className="choix-page">
      <header className="choix-barre">
        <span className="choix-marque"><Logo taille={30} /> {MARQUE.nom}</span>
        <form action={seDeconnecter}>
          <button className="link-button" type="submit">Se déconnecter</button>
        </form>
      </header>

      <section className="choix-centre">
        <h1 className="choix-titre">Choisissez votre école</h1>
        <nav className="choix-tuiles" aria-label="Écoles">
          {ecoles.map((e) => (
            <Link key={e.code} href={`/admin/ecoles/${e.code}`} className="choix-tuile" title={e.nom}>
              {e.code}
            </Link>
          ))}
          <Link href="/admin" className="choix-tuile admin" title="Administration du groupe : toutes les écoles et les comptes">
            Admin
          </Link>
        </nav>
      </section>
    </main>
  )
}
