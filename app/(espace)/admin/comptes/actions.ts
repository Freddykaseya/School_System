'use server'

import { revalidatePath } from 'next/cache'

import { identites } from '@/lib/comptes/serveur'
import { creerCompte, ErreurCompte, modifierCompte, reinitialiserMotDePasse } from '@/lib/comptes/service'
import { connexion } from '@/lib/db/serveur'
import { requireAdmin } from '@/lib/session'
import type { Role } from '@/lib/types'

export type EtatFormulaire = { erreur: string | null; succes: string | null; motDePasse: string | null; fois: number }

const texte = (fd: FormData, cle: string) => String(fd.get(cle) ?? '').trim()

function echec(e: unknown, precedent: EtatFormulaire): EtatFormulaire {
  if (e instanceof ErreurCompte) return { erreur: e.message, succes: null, motDePasse: null, fois: precedent.fois + 1 }
  console.error('comptes :', e)
  return { erreur: 'L’opération n’a pas abouti. Réessayez ; si cela continue, vérifiez la configuration du centre.', succes: null, motDePasse: null, fois: precedent.fois + 1 }
}

export async function creerCompteAction(precedent: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const { profil } = await requireAdmin()
  const email = texte(fd, 'email')
  try {
    const { motDePasse } = await creerCompte(await connexion(), profil.id, await identites(), {
      email,
      nomComplet: texte(fd, 'nom_complet'),
      role: texte(fd, 'role') as Role,
      ecoleId: texte(fd, 'ecole_id') || null,
    })
    revalidatePath('/admin/comptes', 'layout')
    return { erreur: null, succes: `Compte créé pour ${email.toLowerCase()}.`, motDePasse, fois: precedent.fois + 1 }
  } catch (e) {
    return echec(e, precedent)
  }
}

export async function modifierCompteAction(precedent: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const { profil } = await requireAdmin()
  const id = texte(fd, 'id')
  try {
    await modifierCompte(await connexion(), profil.id, id, {
      nomComplet: texte(fd, 'nom_complet'),
      role: texte(fd, 'role') as Role,
      ecoleId: texte(fd, 'ecole_id') || null,
      actif: fd.get('actif') === 'on',
    })
    revalidatePath('/admin/comptes', 'layout')
    revalidatePath(`/admin/comptes/${id}`)
    return { erreur: null, succes: 'Modifications enregistrées.', motDePasse: null, fois: precedent.fois + 1 }
  } catch (e) {
    return echec(e, precedent)
  }
}

export async function reinitialiserAction(precedent: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const { profil } = await requireAdmin()
  try {
    const motDePasse = await reinitialiserMotDePasse(await connexion(), profil.id, await identites(), texte(fd, 'id'))
    return { erreur: null, succes: 'Nouveau mot de passe provisoire :', motDePasse, fois: precedent.fois + 1 }
  } catch (e) {
    return echec(e, precedent)
  }
}
