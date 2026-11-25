'use server'

import { revalidatePath } from 'next/cache'

import { connexion } from '@/lib/db/serveur'
import { ecoleParCode } from '@/lib/donnees'
import { enregistrerFrais, ErreurFrais, type FraisClasse } from '@/lib/frais/service'
import { lireEnTantQueConnecte, requireAdmin } from '@/lib/session'

export type EtatFrais = { erreur: string | null; succes: string | null; fois: number }

export async function enregistrerFraisAction(precedent: EtatFrais, fd: FormData): Promise<EtatFrais> {
  const { profil } = await requireAdmin()
  const suivant = (e: Omit<EtatFrais, 'fois'>): EtatFrais => ({ ...e, fois: precedent.fois + 1 })
  try {
    const code = String(fd.get('ecole') ?? '')
    const ecole = await lireEnTantQueConnecte((q) => ecoleParCode(q, code))
    if (!ecole) return suivant({ erreur: 'École introuvable.', succes: null })
    const classeIds = fd.getAll('classes').map(String)
    const frais = JSON.parse(String(fd.get('frais') ?? 'null')) as FraisClasse
    const n = await enregistrerFrais(await connexion(), profil.id, {
      ecoleId: ecole.id,
      anneeId: String(fd.get('annee') ?? ''),
      classeIds,
      frais,
    })
    revalidatePath(`/ecoles/${ecole.code}/frais`, 'layout')
    return suivant({ erreur: null, succes: `Frais enregistrés pour ${n} classe${n > 1 ? 's' : ''}.` })
  } catch (e) {
    if (e instanceof ErreurFrais) return suivant({ erreur: e.message, succes: null })
    console.error('frais :', e)
    return suivant({ erreur: 'L’enregistrement n’a pas abouti. Réessayez.', succes: null })
  }
}
