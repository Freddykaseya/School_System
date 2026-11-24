import { ArrowLeft, School, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { FormNouveauCompte, type EcoleChoix } from '@/components/admin/formulaires-compte'
import { OngletsEcole } from '@/components/admin/onglets-ecole'
import type { Compte } from '@/lib/comptes/service'
import { ROLES } from '@/lib/libelles'

/** Espace d'une école (ou des administrateurs) : ajouter, puis la liste. */
export function EspaceComptes({ ecole, comptes }: { ecole: EcoleChoix | null; comptes: Compte[] }) {
  const Icone = ecole ? School : ShieldCheck
  const titre = ecole ? ecole.code : 'Administrateurs'
  const actifs = comptes.filter((c) => c.actif).length
  const inactifs = comptes.length - actifs

  return (
    <>
      <Link href={ecole ? '/choisir' : '/admin/comptes'} className="retour">
        <ArrowLeft size={16} aria-hidden="true" /> {ecole ? 'Choisir une école' : 'Comptes et accès'}
      </Link>
      <header className="heading">
        <div className="entete-espace">
          <div className="tuile-icone"><Icone size={28} aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Comptes et accès</p>
            <h1>{ecole ? `${ecole.code} — ${ecole.nom}` : 'Administrateurs du groupe'}</h1>
            <p className="sub">
              {ecole
                ? 'Ces personnes accèdent uniquement à cette école, selon leur rôle.'
                : 'Les administrateurs voient toutes les écoles et gèrent les comptes.'}
            </p>
          </div>
        </div>
      </header>
      {ecole ? <OngletsEcole code={ecole.code} actif="personnel" admin /> : null}

      <section className="card">
        <div className="card-head">
          <h2>{ecole ? `Ajouter une personne à ${titre}` : 'Ajouter un administrateur'}</h2>
        </div>
        <FormNouveauCompte ecole={ecole} />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{ecole ? `Personnel de ${titre}` : 'Administrateurs'}</h2>
          <p>
            {actifs} actif{actifs > 1 ? 's' : ''} · {inactifs} désactivé{inactifs > 1 ? 's' : ''}
          </p>
        </div>
        {comptes.length === 0 ? (
          <div className="empty">Personne pour l’instant : ajoutez la première personne ci-dessus.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Adresse e-mail</th>
                  <th>Rôle</th>
                  <th>État</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {comptes.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/comptes/${c.id}`}>{c.nom_complet}</Link></td>
                    <td>{c.email}</td>
                    <td><span className={`badge ${c.role === 'ADMIN' ? 'brand' : 'neutral'}`}>{ROLES[c.role]}</span></td>
                    <td>{c.actif ? <span className="badge ok">Actif</span> : <span className="badge bad">Désactivé</span>}</td>
                    <td>{c.cree_le}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
