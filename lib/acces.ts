import 'server-only'

import { notFound, redirect } from 'next/navigation'

import { ecoleParCode } from '@/lib/donnees'
import { getSession, lireEnTantQueConnecte, type Session } from '@/lib/session'
import type { Ecole, Profil, Role } from '@/lib/types'

/*
 * Qui peut entrer où. Ces contrôles décident de l'affichage ; la base
 * applique de toute façon ses propres règles (une école ne lit que ses
 * données), même si une page était oubliée ici.
 */

export type Domaine = 'ecole' | 'comptabilite' | 'admin'

/** Rôles qui ont accès à la comptabilité de leur école (et l'administrateur). */
const ROLES_COMPTABILITE: Role[] = ['DIRECTION', 'COMPTABLE']

export const peutVoirEcole = (profil: Profil, ecoleId: string) => profil.role === 'ADMIN' || profil.ecole_id === ecoleId

export const peutFaireComptabilite = (profil: Profil, ecoleId: string) =>
  profil.role === 'ADMIN' || (profil.ecole_id === ecoleId && ROLES_COMPTABILITE.includes(profil.role))

/** Page « Votre accès ne vous permet pas d'accéder à ce domaine ». */
export function refuser(domaine: Domaine, code?: string): never {
  redirect(`/acces-refuse?domaine=${domaine}${code ? `&ecole=${encodeURIComponent(code)}` : ''}`)
}

/** L'école demandée, si le compte connecté y a accès ; sinon refus (ou 404). */
export async function ecoleAccessible(code: string, domaine: 'ecole' | 'comptabilite' = 'ecole'): Promise<Session & { ecoleOuverte: Ecole }> {
  const session = await getSession()
  const codeNet = code.toUpperCase()
  const ecole = await lireEnTantQueConnecte((q) => ecoleParCode(q, codeNet))
  if (!ecole) {
    // La base cache les autres écoles : on distingue « refusé » d'« inexistant ».
    const existe = await lireEnTantQueConnecte((q) => q('select 1 from ecoles_a_choisir() where code = $1', [codeNet]))
    if (existe.length === 0) notFound()
    refuser(domaine, codeNet)
  }
  if (!peutVoirEcole(session.profil, ecole.id)) refuser(domaine, codeNet)
  if (domaine === 'comptabilite' && !peutFaireComptabilite(session.profil, ecole.id)) refuser(domaine, codeNet)
  return { ...session, ecoleOuverte: ecole }
}
