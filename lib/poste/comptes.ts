import { randomBytes } from 'node:crypto'

import { empreinte, verifierMotDePasse } from '../auth/mot-de-passe.ts'
import type { ExecuteurSql } from '../db/types.ts'

/** Réglage du poste (école rattachée, secret de session...). */
export async function parametre(db: ExecuteurSql, cle: string): Promise<string | null> {
  const { rows } = await db.query<{ valeur: string }>('select valeur from local.parametres where cle = $1', [cle])
  return rows[0]?.valeur ?? null
}

export async function definirParametre(db: ExecuteurSql, cle: string, valeur: string): Promise<void> {
  await db.query(
    'insert into local.parametres (cle, valeur) values ($1, $2) on conflict (cle) do update set valeur = excluded.valeur',
    [cle, valeur],
  )
}

/** Secret qui signe les sessions du PC, créé à la première utilisation. */
export async function secretSession(db: ExecuteurSql): Promise<string> {
  const existant = await parametre(db, 'secret_session')
  if (existant) return existant
  await db.query('insert into local.parametres (cle, valeur) values ($1, $2) on conflict (cle) do nothing', [
    'secret_session',
    randomBytes(32).toString('hex'),
  ])
  return (await parametre(db, 'secret_session'))!
}

const normaliser = (email: string) => email.trim().toLowerCase()

/** Garde l'empreinte du mot de passe pour les connexions sans internet. */
export async function enregistrerIdentifiant(db: ExecuteurSql, userId: string, email: string, motDePasse: string): Promise<void> {
  await db.query(
    `insert into local.identifiants (user_id, email, empreinte) values ($1, $2, $3)
     on conflict (user_id) do update set email = excluded.email, empreinte = excluded.empreinte, maj_le = now()`,
    [userId, normaliser(email), await empreinte(motDePasse)],
  )
}

/** Connexion sans internet : l'utilisateur si le mot de passe est bon et le
 * compte actif sur ce PC, sinon null. */
export async function verifierIdentifiant(db: ExecuteurSql, email: string, motDePasse: string): Promise<string | null> {
  const { rows } = await db.query<{ user_id: string; empreinte: string; actif: boolean }>(
    `select i.user_id, i.empreinte, p.actif
       from local.identifiants i join public.profils p on p.id = i.user_id
      where i.email = $1`,
    [normaliser(email)],
  )
  const compte = rows[0]
  if (!compte || !compte.actif) return null
  return (await verifierMotDePasse(motDePasse, compte.empreinte)) ? compte.user_id : null
}
