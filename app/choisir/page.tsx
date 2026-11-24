import Link from 'next/link'

import { seDeconnecter } from '@/app/login/actions'
import { Logo } from '@/components/logo'
import { MARQUE } from '@/lib/marque'
import { getSession, lireEnTantQueConnecte } from '@/lib/session'

/**
 * Après la connexion, pour tout le monde : choisir une école, ou
 * l'administration. Toutes les écoles sont affichées ; ouvrir une école à
 * laquelle on n'a pas accès mène au message « Votre accès ne vous permet
 * pas d'accéder à ce domaine ».
 */
export default async function ChoisirEcole() {
  const { profil } = await getSession()
  const ecoles = await lireEnTantQueConnecte((q) => q<{ code: string; nom: string }>('select code, nom from ecoles_a_choisir()'))

  return (
    <main className="choix-page">
      <header className="choix-barre">
        <span className="choix-marque"><Logo taille={30} /> {MARQUE.nom}</span>
        <span style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <span className="sub" style={{ margin: 0 }}>{profil.nom_complet}</span>
          <form action={seDeconnecter}>
            <button className="link-button" type="submit">Se déconnecter</button>
          </form>
        </span>
      </header>

      <section className="choix-centre">
        <h1 className="choix-titre">Choisissez votre école</h1>
        <nav className="choix-tuiles" aria-label="Écoles">
          {ecoles.map((e) => (
            <Link key={e.code} href={`/ecoles/${e.code}`} className="choix-tuile" title={e.nom}>
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
