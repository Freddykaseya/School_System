import { randomInt } from 'node:crypto'

import { enTantQue } from '../db/en-tant-que.ts'
import type { Connexion, Requete } from '../db/types.ts'
import type { Role } from '../types.ts'
import type { Identites } from './identites.ts'

/*
 * Gestion des comptes par l'administrateur. Toutes les écritures passent
 * par enTantQue(admin) : c'est la base qui vérifie que l'auteur est bien
 * administrateur, et qui écrit chaque changement dans le journal.
 */

export const ROLES: Role[] = ['DIRECTION', 'COMPTABLE', 'CAISSIER', 'ADMIN']

/** Erreur à montrer telle quelle à l'administrateur. */
export class ErreurCompte extends Error {}

export type Compte = {
  id: string
  email: string
  nom_complet: string
  role: Role
  ecole_id: string | null
  ecole_code: string | null
  actif: boolean
  cree_le: string
}

export type DonneesCompte = { nomComplet: string; role: Role; ecoleId: string | null }

export async function listerComptes(q: Requete): Promise<Compte[]> {
  return q<Compte>(
    `select p.id::text, p.email, p.nom_complet, p.role::text as role, p.ecole_id::text, e.code as ecole_code,
            p.actif, to_char(p.created_at, 'YYYY-MM-DD') as cree_le
       from profils p left join ecoles e on e.id = p.ecole_id
      order by e.code nulls first, p.actif desc, p.nom_complet`,
  )
}

export async function compteParId(q: Requete, id: string): Promise<Compte | null> {
  const [c] = await q<Compte>(
    `select p.id::text, p.email, p.nom_complet, p.role::text as role, p.ecole_id::text, e.code as ecole_code,
            p.actif, to_char(p.created_at, 'YYYY-MM-DD') as cree_le
       from profils p left join ecoles e on e.id = p.ecole_id
      where p.id = $1`,
    [id],
  )
  return c ?? null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function valider(d: DonneesCompte): DonneesCompte {
  const nomComplet = d.nomComplet.trim().replace(/\s+/g, ' ')
  if (nomComplet.length < 3) throw new ErreurCompte('Indiquez le nom complet de la personne.')
  if (!ROLES.includes(d.role)) throw new ErreurCompte('Rôle inconnu.')
  if (d.role === 'ADMIN') return { nomComplet, role: d.role, ecoleId: null }
  if (!d.ecoleId) throw new ErreurCompte('Choisissez l’école de cette personne.')
  return { nomComplet, role: d.role, ecoleId: d.ecoleId }
}

// Sans caractères faciles à confondre (0/O, 1/l/I) : il sera recopié à la main.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Mot de passe provisoire, ex. « Kx7m-Pq4r-Zt9w ». */
export function motDePasseProvisoire(): string {
  const bloc = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `${bloc()}-${bloc()}-${bloc()}`
}

/** Crée un compte ; renvoie le mot de passe provisoire à transmettre. */
export async function creerCompte(
  connexion: Connexion,
  adminId: string,
  identites: Identites,
  donnees: DonneesCompte & { email: string },
): Promise<{ id: string; motDePasse: string }> {
  const email = donnees.email.trim().toLowerCase()
  if (!EMAIL.test(email)) throw new ErreurCompte('Adresse e-mail invalide.')
  const d = valider(donnees)

  const existe = await enTantQue(connexion, adminId, (q) => q('select 1 from profils where lower(email) = $1', [email]))
  if (existe.length > 0) throw new ErreurCompte('Un compte existe déjà avec cette adresse e-mail.')

  const motDePasse = motDePasseProvisoire()
  const id = await identites.creer(email, motDePasse, (nouvelId) =>
    enTantQue(connexion, adminId, (q) =>
      q('insert into profils (id, email, nom_complet, role, ecole_id) values ($1, $2, $3, $4, $5)', [
        nouvelId,
        email,
        d.nomComplet,
        d.role,
        d.ecoleId,
      ]),
    ).then(() => undefined),
  )
  return { id, motDePasse }
}

/** Change le nom, le rôle, l'école ou l'état d'un compte. */
export async function modifierCompte(
  connexion: Connexion,
  adminId: string,
  id: string,
  donnees: DonneesCompte & { actif: boolean },
): Promise<void> {
  const d = valider(donnees)
  if (id === adminId && (d.role !== 'ADMIN' || !donnees.actif)) {
    throw new ErreurCompte('Vous ne pouvez pas retirer vos propres droits d’administrateur ni désactiver votre compte.')
  }
  const lignes = await enTantQue(connexion, adminId, (q) =>
    q('update profils set nom_complet = $2, role = $3, ecole_id = $4, actif = $5 where id = $1 returning id', [
      id,
      d.nomComplet,
      d.role,
      d.ecoleId,
      donnees.actif,
    ]),
  )
  if (lignes.length === 0) throw new ErreurCompte('Compte introuvable.')
}

/** Nouveau mot de passe provisoire pour un compte existant. */
export async function reinitialiserMotDePasse(
  connexion: Connexion,
  adminId: string,
  identites: Identites,
  id: string,
): Promise<string> {
  const compte = await enTantQue(connexion, adminId, (q) => compteParId(q, id))
  if (!compte) throw new ErreurCompte('Compte introuvable.')
  const motDePasse = motDePasseProvisoire()
  await identites.changerMotDePasse(id, compte.email, motDePasse)
  return motDePasse
}
