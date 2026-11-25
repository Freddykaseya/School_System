import { cleClasse, cleNom, comparerCles, libelleCle, normaliser } from './classes.ts'
import { COLONNES, LIBELLES_COLONNES, type Colonne } from './colonnes.ts'
import type { RestantDu } from './excel-restant-du.ts'
import type { TableauDeBord } from './pdf-tableau-de-bord.ts'

/*
 * Analyse comptable d'un établissement à partir de ses fichiers :
 *   - PDF « Tableau de bord » : ce que chaque élève a PAYÉ, mois par mois ;
 *   - Excel « Restant dû » : ce qu'il DOIT ENCORE.
 * On rapproche les élèves des deux sources, on calcule les encaissements,
 * le recouvrement et la situation de chaque élève à une date donnée
 * (« période »), et on liste les incohérences à corriger.
 */

/** Mois du minerval, dans l'ordre de l'année scolaire (juin à part). */
export const MOIS_MINERVAL: Colonne[] = ['SPBR', 'OCTB', 'NVBR', 'DCBR', 'JANV', 'FVR', 'MARS', 'AVR', 'MAI']
export const PERIODES: Colonne[] = [...MOIS_MINERVAL, 'JUIN']

export type Montants = Record<Colonne, number>
const zero = (): Montants => Object.fromEntries(COLONNES.map((c) => [c, 0])) as Montants

export type CategorieAnomalie =
  | 'double_compte'
  | 'total_faux'
  | 'texte_dans_montant'
  | 'synthese_differente'
  | 'classe_differente'
  | 'nom_different'
  | 'absent_excel'
  | 'absent_pdf'
  | 'paiement_juin'
  | 'inscription_tardive'
  | 'fichier_en_double'
  | 'classe_un_seul_fichier'
  | 'formule_sans_resultat'
  | 'classe_inconnue'
  | 'pas_de_total'
  | 'ligne_illisible'

export const CATEGORIES: Record<CategorieAnomalie, { titre: string; gravite: 'haute' | 'moyenne' | 'basse' }> = {
  double_compte: { titre: 'Paiements comptés deux fois (payés dans le PDF, encore dus dans l’Excel)', gravite: 'haute' },
  total_faux: { titre: 'Totaux écrits à la main et faux', gravite: 'haute' },
  texte_dans_montant: { titre: 'Texte à la place d’un montant', gravite: 'haute' },
  synthese_differente: { titre: 'Synthèses différentes du détail', gravite: 'haute' },
  classe_differente: { titre: 'Élève dans une classe différente selon le fichier', gravite: 'moyenne' },
  absent_excel: { titre: 'Élèves présents dans les PDF seulement', gravite: 'moyenne' },
  absent_pdf: { titre: 'Élèves présents dans l’Excel seulement', gravite: 'moyenne' },
  paiement_juin: { titre: 'Paiement en juin alors que des mois restent dus', gravite: 'moyenne' },
  inscription_tardive: { titre: 'Mois réclamé avant le mois d’inscription', gravite: 'moyenne' },
  fichier_en_double: { titre: 'Plusieurs fichiers pour la même classe', gravite: 'moyenne' },
  nom_different: { titre: 'Nom écrit différemment selon le fichier (élèves rapprochés)', gravite: 'basse' },
  classe_un_seul_fichier: { titre: 'Classes présentes dans un seul des deux fichiers', gravite: 'basse' },
  formule_sans_resultat: { titre: 'Formules Excel sans résultat enregistré', gravite: 'basse' },
  classe_inconnue: { titre: 'Classe non reconnue', gravite: 'basse' },
  pas_de_total: { titre: 'Fichier sans ligne TOTAL (contrôle impossible)', gravite: 'basse' },
  ligne_illisible: { titre: 'Lignes illisibles', gravite: 'basse' },
}

export type AnomalieRapport = { categorie: CategorieAnomalie; message: string; classe?: string; eleve?: string }

export type StatutEleve = 'en_ordre' | 'non_en_ordre' | 'pris_en_charge' | 'inconnu'

export type EleveRapport = {
  id: string
  nom: string
  classe: string
  moisInscription: string | null
  paye: Montants
  restant: Montants
  totalPaye: number
  /** Minerval encore dû de septembre jusqu'à la période. */
  restantPeriode: number
  statut: StatutEleve
  mention: string | null
  sources: ('pdf' | 'excel')[]
}

export type Agregat = {
  effectif: number
  paye: Montants
  restant: Montants
  totalPaye: number
  totalRestant: number
  payePeriode: number
  restantPeriode: number
  /** Recouvrement du minerval jusqu'à la période, en %, calculé sur les
   * élèves présents dans les deux sources (payé ET restant connus). */
  taux: number | null
  baseTaux: number
  enOrdre: number
  nonEnOrdre: number
  prisEnCharge: number
}

export type ClasseRapport = Agregat & { cle: string; libelle: string }

export type Rapport = {
  etablissement: string | null
  titreExcel: string | null
  periode: Colonne
  fichiers: { pdf: string[]; excel: string | null }
  sources: { pdf: boolean; excel: boolean }
  classes: ClasseRapport[]
  total: Agregat
  eleves: EleveRapport[]
  anomalies: AnomalieRapport[]
  resume: { categorie: CategorieAnomalie; titre: string; gravite: 'haute' | 'moyenne' | 'basse'; nombre: number }[]
}

// Mentions qui signalent une prise en charge (« PR <personne> », « BONUS », « PROF »...).
const MENTION = /\b(PR|BONUS|PROF|TRAV)\b.*$/

type Fiche = {
  id: string
  nom: string
  classe: string
  moisInscription: string | null
  paye: Montants
  restant: Montants
  pdf: boolean
  excel: boolean
}

const somme = (m: Montants, colonnes: Colonne[]) => colonnes.reduce((s, c) => s + m[c], 0)
const formater = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

/** Valeur la plus fréquente parmi les nombres strictement positifs. */
function mode(valeurs: number[]): number | null {
  const freq = new Map<number, number>()
  for (const v of valeurs) if (v > 0) freq.set(v, (freq.get(v) ?? 0) + 1)
  // À égalité, la plus petite : un mois compté deux fois gonfle la somme.
  return [...freq].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null
}

export function analyser({
  tableaux,
  restant,
  periode,
}: {
  tableaux: TableauDeBord[]
  restant: RestantDu | null
  periode: Colonne
}): Rapport {
  const anomalies: AnomalieRapport[] = []
  const fiches = new Map<string, Fiche>()
  const moisPeriode = PERIODES.slice(0, PERIODES.indexOf(periode) + 1).filter((c) => c !== 'JUIN')

  const fiche = (classe: string, nom: string): Fiche => {
    const id = `${classe}|${cleNom(nom)}`
    let f = fiches.get(id)
    if (!f) {
      f = { id, nom, classe, moisInscription: null, paye: zero(), restant: zero(), pdf: false, excel: false }
      fiches.set(id, f)
    }
    return f
  }
  const cleOuInconnue = (libelle: string, source: string) => {
    const cle = cleClasse(libelle)
    if (cle) return cle
    anomalies.push({ categorie: 'classe_inconnue', message: `« ${libelle} » (${source}) : classe non reconnue, gardée telle quelle.` })
    return `?-${normaliser(libelle)}`
  }

  // --- PDF : payé ---------------------------------------------------------
  const fichiersParClasse = new Map<string, string[]>()
  for (const t of tableaux) {
    for (const a of t.anomalies) {
      if (a.type === 'classe_multiple') continue
      anomalies.push({ categorie: a.type === 'ligne_illisible' ? 'ligne_illisible' : a.type === 'pas_de_total' ? 'pas_de_total' : a.type === 'total_faux' ? 'total_faux' : 'texte_dans_montant', message: `${t.fichier} : ${a.message}`, eleve: a.eleve })
    }
    const cleFichier = cleOuInconnue(t.classe, t.fichier)
    fichiersParClasse.set(cleFichier, [...(fichiersParClasse.get(cleFichier) ?? []), t.fichier])
    for (const e of t.eleves) {
      const cle = cleClasse(e.classe) ?? cleFichier
      const f = fiche(cle, e.nom)
      // Même élève dans deux fichiers de la même classe : on ne double pas.
      for (const c of COLONNES) f.paye[c] = f.pdf ? Math.max(f.paye[c], e.montants[c].valeur ?? 0) : (e.montants[c].valeur ?? 0)
      f.pdf = true
      f.moisInscription ??= e.moisInscription
    }
  }
  for (const [cle, fichiers] of fichiersParClasse) {
    if (fichiers.length > 1) {
      anomalies.push({ categorie: 'fichier_en_double', classe: cle, message: `${libelleCle(cle)} : ${fichiers.length} fichiers (${fichiers.join(', ')}). Les montants d’un élève présent dans les deux ne sont comptés qu’une fois.` })
    }
  }

  // --- Excel : restant dû -------------------------------------------------
  const effectifsExcel = new Map<string, number>()
  const restantsExcel = new Map<string, Montants>()
  if (restant) {
    const formules = new Map<string, number>()
    for (const a of restant.anomalies) {
      if (a.type === 'formule_sans_resultat') formules.set(a.feuille ?? '?', (formules.get(a.feuille ?? '?') ?? 0) + 1)
      else anomalies.push({ categorie: a.type === 'total_faux' ? 'total_faux' : 'texte_dans_montant', message: a.message, eleve: a.eleve })
    }
    for (const [feuille, n] of formules) {
      anomalies.push({ categorie: 'formule_sans_resultat', message: `Feuille « ${feuille} » : ${n} formule${n > 1 ? 's' : ''} sans résultat enregistré (ouvrir et enregistrer le fichier dans Excel les recalcule).` })
    }
    for (const s of restant.sections) {
      for (const e of s.eleves) {
        const cle = cleOuInconnue(e.classe || s.classe, `feuille « ${s.feuille} »`)
        const f = fiche(cle, e.nom)
        for (const c of COLONNES) f.restant[c] += e.montants[c].valeur ?? 0
        f.excel = true
        f.moisInscription ??= e.moisInscription
        effectifsExcel.set(cle, (effectifsExcel.get(cle) ?? 0) + 1)
        const t = restantsExcel.get(cle) ?? zero()
        for (const c of COLONNES) t[c] += e.montants[c].valeur ?? 0
        restantsExcel.set(cle, t)
      }
    }

    // Synthèses comparées au détail.
    for (const syn of restant.syntheses) {
      for (const l of syn.lignes) {
        const cle = cleClasse(l.classe)
        if (!cle) continue
        const ecarts: string[] = []
        const effectif = effectifsExcel.get(cle) ?? 0
        if (l.effectif !== null && l.effectif !== effectif) ecarts.push(`effectif ${l.effectif} en synthèse, ${effectif} dans le détail`)
        const detail = restantsExcel.get(cle) ?? zero()
        for (const c of COLONNES) {
          const v = l.montants[c]
          if (v !== undefined && v !== detail[c]) ecarts.push(`${LIBELLES_COLONNES[c]} ${formater(v)} contre ${formater(detail[c])}`)
        }
        if (ecarts.length) {
          anomalies.push({ categorie: 'synthese_differente', classe: cle, message: `${libelleCle(cle)} (synthèse « ${syn.feuille} ») : ${ecarts.slice(0, 4).join(' ; ')}${ecarts.length > 4 ? ` ; et ${ecarts.length - 4} autre(s) écart(s)` : ''}.` })
        }
      }
    }
  }

  // --- Rapprochement des deux sources -------------------------------------
  const deuxSources = tableaux.length > 0 && restant !== null
  if (deuxSources) {
    // Une classe sans PDF (ou sans feuille Excel) n'est pas une erreur
    // élève par élève : on la signale une fois.
    const classesPdf = new Set([...fiches.values()].filter((f) => f.pdf).map((f) => f.classe))
    const classesExcel = new Set([...fiches.values()].filter((f) => f.excel).map((f) => f.classe))
    for (const cle of [...new Set([...classesPdf, ...classesExcel])].sort(comparerCles)) {
      if (classesPdf.has(cle) && classesExcel.has(cle)) continue
      const n = [...fiches.values()].filter((f) => f.classe === cle).length
      anomalies.push({
        categorie: 'classe_un_seul_fichier', classe: cle,
        message: classesPdf.has(cle)
          ? `${libelleCle(cle)} : ${n} élève${n > 1 ? 's' : ''} dans les PDF, aucune feuille dans l’Excel (restant dû inconnu).`
          : `${libelleCle(cle)} : ${n} élève${n > 1 ? 's' : ''} dans l’Excel, aucun PDF (montants payés inconnus).`,
      })
    }
    const deuxCotes = (f: Fiche) => classesPdf.has(f.classe) && classesExcel.has(f.classe)
    const seulPdf = [...fiches.values()].filter((f) => f.pdf && !f.excel && deuxCotes(f))
    const seulExcel = [...fiches.values()].filter((f) => f.excel && !f.pdf && deuxCotes(f))
    const excelParNom = new Map<string, Fiche[]>()
    for (const f of seulExcel) excelParNom.set(cleNom(f.nom), [...(excelParNom.get(cleNom(f.nom)) ?? []), f])
    const rapproches = new Set<Fiche>()
    // Même élève, nom identique, autre classe.
    for (const f of seulPdf) {
      const autre = excelParNom.get(cleNom(f.nom))?.find((x) => !rapproches.has(x))
      if (autre) {
        rapproches.add(f)
        rapproches.add(autre)
        anomalies.push({ categorie: 'classe_differente', eleve: f.nom, message: `${f.nom} : ${libelleCle(f.classe)} dans les PDF, ${libelleCle(autre.classe)} dans l’Excel.` })
      }
    }
    // Même élève, nom raccourci dans un fichier (« KANDONA MUKAZ » et
    // « KANDONA MUKAZ TACIANA ») : tous les mots du nom court (2 au moins)
    // se retrouvent dans le nom long, et il n'y a qu'un seul candidat.
    const mots = (nom: string) => cleNom(nom).split(' ').filter((m) => m && !/^(PR|BONUS|PROF|TRAV|A|REVOIR)$/.test(m))
    const inclus = (court: string[], long: string[]) => court.length >= 2 && court.every((m) => long.includes(m))
    const proches = (a: Fiche, b: Fiche) => {
      const [ma, mb] = [mots(a.nom), mots(b.nom)]
      return ma.length <= mb.length ? inclus(ma, mb) : inclus(mb, ma)
    }
    for (const f of seulPdf) {
      if (rapproches.has(f)) continue
      const candidats = seulExcel.filter((x) => !rapproches.has(x) && proches(f, x))
      if (candidats.length !== 1) continue
      const autre = candidats[0]
      rapproches.add(f)
      rapproches.add(autre)
      if (autre.classe === f.classe) {
        // Fusion : une seule fiche, payé (PDF) et restant (Excel).
        f.restant = autre.restant
        f.excel = true
        f.moisInscription ??= autre.moisInscription
        fiches.delete(autre.id)
        anomalies.push({ categorie: 'nom_different', eleve: f.nom, classe: f.classe, message: `${libelleCle(f.classe)} : « ${f.nom} » dans les PDF, « ${autre.nom} » dans l’Excel (rapprochés).` })
      } else {
        anomalies.push({ categorie: 'classe_differente', eleve: f.nom, message: `« ${f.nom} » (${libelleCle(f.classe)}) dans les PDF et « ${autre.nom} » (${libelleCle(autre.classe)}) dans l’Excel : même élève, classe différente ?` })
      }
    }
    for (const f of seulPdf) if (!rapproches.has(f)) anomalies.push({ categorie: 'absent_excel', eleve: f.nom, classe: f.classe, message: `${f.nom} (${libelleCle(f.classe)}) : dans les PDF, absent de l’Excel.` })
    for (const f of seulExcel) if (!rapproches.has(f)) anomalies.push({ categorie: 'absent_pdf', eleve: f.nom, classe: f.classe, message: `${f.nom} (${libelleCle(f.classe)}) : dans l’Excel, absent des PDF.` })

    for (const f of fiches.values()) {
      if (!f.pdf || !f.excel) continue
      // Mensualité de l'élève : ce qui revient le plus souvent (payé + restant).
      const mensualite = mode(MOIS_MINERVAL.map((c) => f.paye[c] + f.restant[c]))
      for (const c of MOIS_MINERVAL) {
        const p = f.paye[c]
        const r = f.restant[c]
        if (p > 0 && r > 0 && mensualite !== null && p + r > mensualite) {
          anomalies.push({ categorie: 'double_compte', eleve: f.nom, classe: f.classe, message: `${f.nom} (${libelleCle(f.classe)}) — ${LIBELLES_COLONNES[c]} : ${formater(p)} payés et ${formater(r)} encore dus (mensualité ${formater(mensualite)}).` })
        }
      }
      if (f.paye.JUIN > 0 && somme(f.restant, MOIS_MINERVAL) > 0) {
        anomalies.push({ categorie: 'paiement_juin', eleve: f.nom, classe: f.classe, message: `${f.nom} (${libelleCle(f.classe)}) : ${formater(f.paye.JUIN)} inscrits en juin alors que ${formater(somme(f.restant, MOIS_MINERVAL))} restent dus de septembre à mai.` })
      }
    }
  }
  if (restant) {
    for (const f of fiches.values()) {
      if (/^OCTOBRE/i.test(f.moisInscription ?? '') && f.restant.SPBR > 0) {
        anomalies.push({ categorie: 'inscription_tardive', eleve: f.nom, classe: f.classe, message: `${f.nom} (${libelleCle(f.classe)}) : inscrit en octobre, ${formater(f.restant.SPBR)} réclamés pour septembre.` })
      }
    }
  }

  // --- Situation des élèves et agrégats ------------------------------------
  const eleves: EleveRapport[] = [...fiches.values()].map((f) => {
    const mention = normaliser(f.nom).match(MENTION)?.[0] ?? null
    const restantPeriode = somme(f.restant, moisPeriode)
    const statut: StatutEleve = mention
      ? 'pris_en_charge'
      : !f.excel
        ? 'inconnu'
        : restantPeriode === 0
          ? 'en_ordre'
          : 'non_en_ordre'
    return {
      id: f.id,
      nom: f.nom,
      classe: f.classe,
      moisInscription: f.moisInscription,
      paye: f.paye,
      restant: f.restant,
      totalPaye: somme(f.paye, COLONNES as unknown as Colonne[]),
      restantPeriode,
      statut,
      mention,
      sources: [...(f.pdf ? ['pdf' as const] : []), ...(f.excel ? ['excel' as const] : [])],
    }
  })
  eleves.sort((a, b) => comparerCles(a.classe, b.classe) || a.nom.localeCompare(b.nom))

  const agreger = (liste: EleveRapport[]): Agregat => {
    const paye = zero()
    const rest = zero()
    for (const e of liste) for (const c of COLONNES) {
      paye[c] += e.paye[c]
      rest[c] += e.restant[c]
    }
    const payePeriode = somme(paye, moisPeriode)
    const restantPeriode = somme(rest, moisPeriode)
    // Recouvrement : seulement là où payé et restant sont tous deux connus.
    const base = liste.filter((e) => e.sources.length === 2)
    const payeBase = base.reduce((s, e) => s + somme(e.paye, moisPeriode), 0)
    const du = payeBase + base.reduce((s, e) => s + somme(e.restant, moisPeriode), 0)
    return {
      effectif: liste.length,
      paye,
      restant: rest,
      totalPaye: somme(paye, COLONNES as unknown as Colonne[]),
      totalRestant: somme(rest, COLONNES as unknown as Colonne[]),
      payePeriode,
      restantPeriode,
      taux: du > 0 ? Math.round((payeBase / du) * 1000) / 10 : null,
      baseTaux: base.length,
      enOrdre: liste.filter((e) => e.statut === 'en_ordre').length,
      nonEnOrdre: liste.filter((e) => e.statut === 'non_en_ordre').length,
      prisEnCharge: liste.filter((e) => e.statut === 'pris_en_charge').length,
    }
  }

  const cles = [...new Set(eleves.map((e) => e.classe))].sort(comparerCles)
  const classes = cles.map((cle) => ({
    cle,
    libelle: cle.startsWith('?-') ? cle.slice(2) : libelleCle(cle),
    ...agreger(eleves.filter((e) => e.classe === cle)),
  }))

  const ordre = Object.keys(CATEGORIES) as CategorieAnomalie[]
  anomalies.sort((a, b) => ordre.indexOf(a.categorie) - ordre.indexOf(b.categorie))
  const resume = ordre
    .map((categorie) => ({ categorie, ...CATEGORIES[categorie], nombre: anomalies.filter((a) => a.categorie === categorie).length }))
    .filter((r) => r.nombre > 0)

  return {
    etablissement: tableaux.find((t) => t.etablissement)?.etablissement ?? null,
    titreExcel: restant?.titre ?? null,
    periode,
    fichiers: { pdf: tableaux.map((t) => t.fichier), excel: restant?.fichier ?? null },
    sources: { pdf: tableaux.length > 0, excel: restant !== null },
    classes,
    total: agreger(eleves),
    eleves,
    anomalies,
    resume,
  }
}
