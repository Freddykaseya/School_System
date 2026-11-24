'use client'

import { Calculator, Crown, ShieldCheck, UserPlus, Wallet } from 'lucide-react'
import { useActionState, useEffect, useState } from 'react'

import {
  creerCompteAction,
  modifierCompteAction,
  reinitialiserAction,
  type EtatFormulaire,
} from '@/app/(espace)/admin/comptes/actions'
import { ROLES, ROLES_DROITS } from '@/lib/libelles'
import type { Role } from '@/lib/types'

export type EcoleChoix = { id: string; code: string; nom: string }

const INITIAL: EtatFormulaire = { erreur: null, succes: null, motDePasse: null, fois: 0 }
const ORDRE_ROLES: Role[] = ['DIRECTION', 'COMPTABLE', 'CAISSIER', 'ADMIN']

function Message({ etat }: { etat: EtatFormulaire }) {
  if (etat.erreur) return <div className="error form-message" role="alert">{etat.erreur}</div>
  if (!etat.succes) return null
  return (
    <div className="success form-message" role="status">
      {etat.succes}
      {etat.motDePasse ? (
        <>
          {' '}Mot de passe provisoire à transmettre à la personne :
          <br />
          <span className="secret">{etat.motDePasse}</span>
          <br />
          Il ne sera plus affiché. La première connexion sur le PC de l’école doit se faire avec internet.
        </>
      ) : null}
    </div>
  )
}

/** Rôle et école : l'école est inutile (et désactivée) pour un administrateur. */
function ChampsRoleEcole({
  role, setRole, ecoleId, setEcoleId, ecoles, verrouille,
}: {
  role: Role
  setRole: (r: Role) => void
  ecoleId: string
  setEcoleId: (id: string) => void
  ecoles: EcoleChoix[]
  verrouille?: boolean
}) {
  const admin = role === 'ADMIN'
  return (
    <>
      <label className="field">
        Rôle
        <select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={verrouille}>
          {ORDRE_ROLES.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
        </select>
        {verrouille ? <input type="hidden" name="role" value={role} /> : null}
      </label>
      <label className="field">
        École
        <select name="ecole_id" value={admin ? '' : ecoleId} onChange={(e) => setEcoleId(e.target.value)} disabled={admin} required={!admin}>
          <option value="">{admin ? 'Toutes les écoles' : 'Choisir l’école…'}</option>
          {ecoles.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.nom}</option>)}
        </select>
      </label>
    </>
  )
}

export function AideRoles() {
  return (
    <div className="roles-aide">
      {ORDRE_ROLES.map((r) => <div key={r}><b>{ROLES[r]}</b> : {ROLES_DROITS[r]}.</div>)}
    </div>
  )
}

const ICONES_ROLES = { DIRECTION: Crown, COMPTABLE: Calculator, CAISSIER: Wallet, ADMIN: ShieldCheck } as const
const ROLES_ECOLE: Role[] = ['DIRECTION', 'COMPTABLE', 'CAISSIER']

/** Ajout d'une personne dans une école (choix du rôle) ou d'un administrateur. */
export function FormNouveauCompte({ ecole }: { ecole: EcoleChoix | null }) {
  const [etat, action, enCours] = useActionState(creerCompteAction, INITIAL)
  const [email, setEmail] = useState('')
  const [nom, setNom] = useState('')
  const [role, setRole] = useState<Role>(ecole ? 'CAISSIER' : 'ADMIN')

  // Compte créé : on vide le formulaire pour la personne suivante.
  useEffect(() => {
    if (etat.succes) {
      setEmail('')
      setNom('')
    }
  }, [etat.fois, etat.succes])

  return (
    <form action={action}>
      {ecole ? <input type="hidden" name="ecole_id" value={ecole.id} /> : null}
      <div className="form-grid">
        <label className="field">
          Nom complet
          <input name="nom_complet" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Marie Kabila" required autoFocus />
        </label>
        <label className="field">
          Adresse e-mail
          <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={ecole ? `ex. caisse@${ecole.code.toLowerCase()}.cd` : 'ex. admin@groupe.cd'} required />
        </label>
      </div>
      {ecole ? (
        <>
          <div className="section-titre">Rôle dans l’école</div>
          <div className="roles-choix" role="radiogroup" aria-label="Rôle">
            {ROLES_ECOLE.map((r) => {
              const Icone = ICONES_ROLES[r]
              return (
                <label key={r} className="role-carte">
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                  <strong><Icone size={16} aria-hidden="true" /> {ROLES[r]}</strong>
                  <span>{ROLES_DROITS[r].replace(/^voit son école ; /, '')}</span>
                </label>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="role" value="ADMIN" />
          <p className="sub" style={{ margin: '0 18px' }}>Un administrateur {ROLES_DROITS.ADMIN}.</p>
        </>
      )}
      <div className="form-actions" style={{ paddingTop: 16 }}>
        <button className="primary compact" type="submit" disabled={enCours}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={16} aria-hidden="true" />
            {enCours ? 'Création…' : ecole ? `Ajouter à ${ecole.code}` : 'Ajouter l’administrateur'}
          </span>
        </button>
        <span className="sub" style={{ margin: 0 }}>Un mot de passe provisoire est créé automatiquement.</span>
      </div>
      <Message etat={etat} />
    </form>
  )
}

export function FormModifierCompte({
  compte, ecoles, estMoi,
}: {
  compte: { id: string; nom_complet: string; role: Role; ecole_id: string | null; actif: boolean }
  ecoles: EcoleChoix[]
  estMoi: boolean
}) {
  const [etat, action, enCours] = useActionState(modifierCompteAction, INITIAL)
  const [nom, setNom] = useState(compte.nom_complet)
  const [role, setRole] = useState<Role>(compte.role)
  const [ecoleId, setEcoleId] = useState(compte.ecole_id ?? '')
  const [actif, setActif] = useState(compte.actif)

  return (
    <form action={action}>
      <input type="hidden" name="id" value={compte.id} />
      <div className="form-grid">
        <label className="field">
          Nom complet
          <input name="nom_complet" value={nom} onChange={(e) => setNom(e.target.value)} required />
        </label>
        <ChampsRoleEcole role={role} setRole={setRole} ecoleId={ecoleId} setEcoleId={setEcoleId} ecoles={ecoles} verrouille={estMoi} />
        <label className="check">
          <input type="checkbox" name="actif" checked={actif} onChange={(e) => setActif(e.target.checked)} disabled={estMoi} />
          {actif ? 'Compte actif' : 'Compte désactivé (ne peut plus se connecter)'}
          {estMoi ? <input type="hidden" name="actif" value="on" /> : null}
        </label>
      </div>
      {estMoi ? (
        <p className="sub" style={{ margin: '0 18px 14px' }}>C’est votre compte : vous ne pouvez ni changer votre rôle ni le désactiver.</p>
      ) : null}
      <div className="form-actions">
        <button className="primary compact" type="submit" disabled={enCours}>{enCours ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
      <Message etat={etat} />
    </form>
  )
}

export function FormReinitialiser({ id, nom }: { id: string; nom: string }) {
  const [etat, action, enCours] = useActionState(reinitialiserAction, INITIAL)
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Créer un nouveau mot de passe pour ${nom} ? L’ancien ne fonctionnera plus au centre.`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <div className="form-actions" style={{ paddingTop: 18 }}>
        <button className="secondary" type="submit" disabled={enCours}>{enCours ? 'Création…' : 'Créer un nouveau mot de passe'}</button>
        <span className="sub" style={{ margin: 0 }}>Pour une personne qui a oublié le sien.</span>
      </div>
      <Message etat={etat} />
    </form>
  )
}
