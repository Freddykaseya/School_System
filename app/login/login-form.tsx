'use client'

import { useActionState } from 'react'

import { Logo } from '@/components/logo'
import { MARQUE } from '@/lib/marque'

import { seConnecter, type EtatConnexion } from './actions'

const initial: EtatConnexion = { erreur: null }

export function LoginForm({ messageInitial }: { messageInitial: string | null }) {
  const [etat, action, enCours] = useActionState(seConnecter, initial)
  const erreur = etat.erreur ?? messageInitial

  return (
    <form action={action} className="login-card">
      <div className="brand">
        <Logo taille={40} />
        <div>
          <strong>{MARQUE.complet}</strong>
          <span>{MARQUE.slogan}</span>
        </div>
      </div>
      <div>
        <h1>Connexion</h1>
        <p className="sub">Connectez-vous, puis choisissez votre école.</p>
      </div>
      {erreur ? <div className="error" role="alert">{erreur}</div> : null}
      <label className="field">
        Adresse e-mail
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Mot de passe
        <input name="mot_de_passe" type="password" autoComplete="current-password" required />
      </label>
      <button className="primary" type="submit" disabled={enCours}>
        {enCours ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
