import { randomUUID } from 'node:crypto'

import type { PGlite } from '@electric-sql/pglite'
import { createClient } from '@supabase/supabase-js'

import { enregistrerIdentifiant } from '../poste/comptes.ts'

/**
 * Où vivent les identités (adresse e-mail + mot de passe) :
 *   - Supabase Auth, pour la vraie base centrale ;
 *   - la base locale, pour le centre de démonstration.
 * Le profil (nom, rôle, école) est toujours écrit dans la table profils.
 */
export type Identites = {
  /** Crée l'identité puis le profil (via `insererProfil`) ; annule tout si le profil échoue. */
  creer(email: string, motDePasse: string, insererProfil: (id: string) => Promise<void>): Promise<string>
  changerMotDePasse(id: string, email: string, motDePasse: string): Promise<void>
}

export function identitesLocales(db: PGlite): Identites {
  return {
    async creer(email, motDePasse, insererProfil) {
      const id = randomUUID()
      await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email])
      try {
        await insererProfil(id)
      } catch (e) {
        await db.query('delete from auth.users where id = $1', [id])
        throw e
      }
      await enregistrerIdentifiant(db, id, email, motDePasse)
      return id
    },
    async changerMotDePasse(id, email, motDePasse) {
      await enregistrerIdentifiant(db, id, email, motDePasse)
    },
  }
}

/** Clé « service role » : uniquement sur le serveur du centre. */
export function identitesSupabase(url: string, cleService: string): Identites {
  const admin = createClient(url, cleService, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin
  return {
    async creer(email, motDePasse, insererProfil) {
      const { data, error } = await admin.createUser({ email, password: motDePasse, email_confirm: true })
      if (error) throw new Error(`Création du compte impossible : ${error.message}`)
      try {
        await insererProfil(data.user.id)
      } catch (e) {
        await admin.deleteUser(data.user.id)
        throw e
      }
      return data.user.id
    },
    async changerMotDePasse(id, _email, motDePasse) {
      const { error } = await admin.updateUserById(id, { password: motDePasse })
      if (error) throw new Error(`Changement du mot de passe impossible : ${error.message}`)
    },
  }
}
