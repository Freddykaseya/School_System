'use client'

import { useActionState } from 'react'

import { seConnecter, type EtatConnexion } from './actions'

const initial: EtatConnexion = { erreur: null }

export function LoginForm({ messageInitial }: { messageInitial: string | null }) {
  const [etat, action, enCours] = useActionState(seConnecter, initial)
  const erreur = etat.erreur ?? messageInitial

  return (
    <form action={action} className="login-card">
      <div className="brand" style={{ padding: 0 }}>
        <div className="brand-mark">ERP</div>
        <div>
          <strong>ERP Écoles</strong>
          <span>Nova · CSGO1 · CSGO2 · CSGO3</span>
        </div>
      </div>
      <div>
        <h1 style={{ fontSize: 20 }}>Connexion</h1>
        <p className="sub">Vous arriverez directement dans votre école.</p>
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
