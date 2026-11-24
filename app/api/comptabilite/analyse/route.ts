import { NextResponse } from 'next/server'

import { analyser, PERIODES } from '@/lib/comptabilite/analyse'
import { lireRestantDu, type RestantDu } from '@/lib/comptabilite/excel-restant-du'
import { lireTableauDeBord, type Colonne, type TableauDeBord } from '@/lib/comptabilite/pdf-tableau-de-bord'
import { peutFaireComptabilite } from '@/lib/acces'
import { ecoleParCode } from '@/lib/donnees'
import { getSession, lireEnTantQueConnecte } from '@/lib/session'

const TAILLE_MAX = 45 * 1024 * 1024

/**
 * Analyse des fichiers d'un établissement (PDF « Tableau de bord » et Excel
 * « Restant dû »). Les fichiers sont lus en mémoire puis oubliés : rien
 * n'est enregistré, rien ne part sur internet.
 */
export async function POST(requete: Request) {
  const { profil } = await getSession()
  const donnees = await requete.formData()
  const code = String(donnees.get('ecole') ?? '').toUpperCase()
  const ecole = await lireEnTantQueConnecte((q) => ecoleParCode(q, code))
  if (!ecole || !peutFaireComptabilite(profil, ecole.id)) {
    return NextResponse.json({ erreur: 'Votre accès ne vous permet pas d’accéder à ce domaine.' }, { status: 403 })
  }

  const periode = String(donnees.get('periode') ?? '') as Colonne
  if (!PERIODES.includes(periode)) return NextResponse.json({ erreur: 'Période inconnue.' }, { status: 400 })
  const fichiers = donnees.getAll('fichiers').filter((f): f is File => f instanceof File && f.size > 0)
  if (fichiers.length === 0) return NextResponse.json({ erreur: 'Ajoutez au moins un fichier.' }, { status: 400 })
  if (fichiers.reduce((s, f) => s + f.size, 0) > TAILLE_MAX) {
    return NextResponse.json({ erreur: 'Fichiers trop volumineux (45 Mo au total au maximum).' }, { status: 413 })
  }

  const tableaux: TableauDeBord[] = []
  let restant: RestantDu | null = null
  const avertissements: string[] = []
  for (const f of fichiers) {
    const nom = f.name
    try {
      if (/\.pdf$/i.test(nom)) {
        const t = await lireTableauDeBord(nom, new Uint8Array(await f.arrayBuffer()))
        if (t.eleves.length === 0) avertissements.push(`${nom} : aucun tableau d’élèves reconnu, fichier ignoré.`)
        else tableaux.push(t)
      } else if (/\.xlsx$/i.test(nom)) {
        if (restant) avertissements.push(`${nom} : un seul fichier Excel est pris en compte (${restant.fichier}).`)
        else {
          restant = await lireRestantDu(nom, await f.arrayBuffer())
          if (restant.sections.length === 0) avertissements.push(`${nom} : aucune feuille d’élèves reconnue.`)
        }
      } else {
        avertissements.push(`${nom} : format non pris en charge (PDF ou Excel .xlsx uniquement).`)
      }
    } catch (e) {
      console.error('comptabilité : lecture impossible', nom, e)
      avertissements.push(`${nom} : fichier illisible ou abîmé.`)
    }
  }

  if (tableaux.length === 0 && (!restant || restant.sections.length === 0)) {
    return NextResponse.json({ erreur: 'Aucun fichier exploitable.', avertissements }, { status: 422 })
  }
  return NextResponse.json({ rapport: analyser({ tableaux, restant, periode }), avertissements })
}
