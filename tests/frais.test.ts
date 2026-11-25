import fs from 'node:fs'

import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { enTantQue } from '@/lib/db/en-tant-que'
import { connexionPGlite, ouvrirBaseLocale } from '@/lib/db/local'
import type { Connexion } from '@/lib/db/types'
import { enregistrerFrais, ErreurFrais, lireGrille, moisDeLAnnee, totalAnnuel, type FraisClasse } from '@/lib/frais/service'

let db: PGlite
let base: Connexion
let csgo2: string
let annee: string
let mat1: string
let mat2: string
let classeNova: string
const ADMIN = '00000000-0000-0000-0000-00000000000a'
const DIRECTION = '00000000-0000-0000-0000-0000000000d2'

const MOIS = ['2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01', '2027-05-01']
const GRILLE: FraisClasse = {
  minerval: { montant: 84000, devise: 'CDF', mois: MOIS },
  tranches: [
    { libelle: 'Tranche 1', montant: 9000, devise: 'CDF', mois: '2026-10-01' },
    { libelle: 'Tranche 2', montant: 9000, devise: 'CDF', mois: '2027-01-01' },
  ],
  bulletin: { libelle: 'Bulletin', montant: 2500, devise: 'CDF', mois: '2026-12-01' },
  autres: [{ libelle: 'Uniforme', montant: 15, devise: 'USD', mois: '2026-09-01' }],
}

beforeAll(async () => {
  db = await ouvrirBaseLocale()
  await db.exec(fs.readFileSync('supabase/seeds/0001_referentiel.sql', 'utf8'))
  const un = async (sql: string, p: unknown[] = []) => (await db.query<{ id: string }>(sql, p)).rows[0].id
  csgo2 = await un(`select id from ecoles where code = 'CSGO2'`)
  annee = await un(`select id from annees_scolaires where active`)
  mat1 = await un(`select id from classes where ecole_id = $1 and cycle = 'MATERNELLE' and niveau = 1`, [csgo2])
  mat2 = await un(`select id from classes where ecole_id = $1 and cycle = 'MATERNELLE' and niveau = 2`, [csgo2])
  classeNova = await un(`select id from classes where ecole_id = (select id from ecoles where code = 'NOVA') limit 1`)
  const comptes: [string, string, string | null][] = [[ADMIN, 'ADMIN', null], [DIRECTION, 'DIRECTION', csgo2]]
  for (const [id, role, ecole] of comptes) {
    await db.query('insert into auth.users (id) values ($1)', [id])
    await db.query(`insert into profils (id, email, nom_complet, role, ecole_id) values ($1, $2, 'X', $3, $4)`, [id, `${role}@x.cd`, role, ecole])
  }
  base = connexionPGlite(db)
}, 60_000)

describe('mois de l’année scolaire', () => {
  it('va du mois de début au mois de fin', () => {
    const m = moisDeLAnnee('2026-09-01', '2027-07-02')
    expect(m.map((x) => x.cle)).toEqual([...MOIS, '2027-06-01', '2027-07-01'])
    expect(m[0]).toMatchObject({ nom: 'septembre', court: 'sept.' })
  })
})

describe('grille de frais', () => {
  it('l’administrateur fixe les frais de plusieurs classes d’un coup', async () => {
    expect(await enregistrerFrais(base, ADMIN, { ecoleId: csgo2, anneeId: annee, classeIds: [mat1, mat2], frais: GRILLE })).toBe(2)
    const grille = await enTantQue(base, ADMIN, (q) => lireGrille(q, csgo2, annee))
    expect(grille.get(mat1)).toEqual(GRILLE)
    expect(grille.get(mat2)).toEqual(GRILLE)
    expect(totalAnnuel(GRILLE)).toEqual({ CDF: 84000 * 9 + 9000 * 2 + 2500, USD: 15 })
  })

  it('modifier : le montant change, un frais retiré disparaît', async () => {
    const nouvelle = { ...GRILLE, minerval: { ...GRILLE.minerval!, montant: 90000 }, autres: [] }
    await enregistrerFrais(base, ADMIN, { ecoleId: csgo2, anneeId: annee, classeIds: [mat1], frais: nouvelle })
    const g = (await enTantQue(base, ADMIN, (q) => lireGrille(q, csgo2, annee))).get(mat1)!
    expect(g.minerval?.montant).toBe(90000)
    expect(g.autres).toEqual([])
    const n = (await db.query<{ n: number }>('select count(*)::int n from echeances where classe_id = $1', [mat1])).rows[0].n
    expect(n).toBe(9 + 2 + 1)
  })

  it('refuse des montants ou des mois incohérents', async () => {
    const essai = (f: Partial<FraisClasse>) =>
      enregistrerFrais(base, ADMIN, { ecoleId: csgo2, anneeId: annee, classeIds: [mat1], frais: { ...GRILLE, ...f } })
    await expect(essai({ minerval: { montant: 84000.5, devise: 'CDF', mois: MOIS } })).rejects.toThrow(/centimes/)
    await expect(essai({ minerval: { montant: 84000, devise: 'CDF', mois: [] } })).rejects.toThrow(/au moins un mois/)
    await expect(essai({ bulletin: { libelle: 'Bulletin', montant: 2500, devise: 'CDF', mois: '2028-01-01' } })).rejects.toThrow(/mois/)
    await expect(essai({ tranches: [GRILLE.tranches[0], GRILLE.tranches[0]] })).rejects.toThrow(/même nom/)
    await expect(essai({ autres: [{ libelle: 'Transport', montant: 12.345, devise: 'USD', mois: MOIS[0] }] })).rejects.toBeInstanceOf(ErreurFrais)
  })

  it('refuse une classe d’une autre école', async () => {
    await expect(enregistrerFrais(base, ADMIN, { ecoleId: csgo2, anneeId: annee, classeIds: [classeNova], frais: GRILLE })).rejects.toThrow(/appartient/)
  })

  it('seul l’administrateur peut fixer les frais (contrôlé par la base)', async () => {
    await expect(enregistrerFrais(base, DIRECTION, { ecoleId: csgo2, anneeId: annee, classeIds: [mat2], frais: GRILLE })).rejects.toThrow()
  })
})

describe('situation d’un élève, par monnaie et à une date', () => {
  it('le minerval est dû mois par mois ; FC et dollars restent séparés', async () => {
    // Élève de 2e maternelle (grille : 84 000 FC par mois, uniforme 15 $).
    const situation = await enTantQue(base, ADMIN, async (q) => {
      const [e] = await q<{ id: string }>(`insert into eleves (ecole_id, matricule, nom) values ($1, 'S-1', 'ESSAI') returning id`, [csgo2])
      const [i] = await q<{ id: string }>(
        `insert into inscriptions (ecole_id, eleve_id, annee_id, classe_id, premier_mois_du)
         values ($1, $2, $3, $4, '2026-09-01') returning id`,
        [csgo2, e.id, annee, mat2],
      )
      await q(`insert into paiements (ecole_id, inscription_id, montant, devise, recu_par, date_paiement) values ($1, $2, 168000, 'CDF', $3, '2026-10-05')`, [csgo2, i.id, ADMIN])
      await q(`insert into paiements (ecole_id, inscription_id, montant, devise, recu_par, date_paiement) values ($1, $2, 15, 'USD', $3, '2026-09-02')`, [csgo2, i.id, ADMIN])
      return q<{ devise: string; du_echu: number; paye: number; reste_echu: number; reste_annee: number }>(
        `select devise::text as devise, du_echu::float8 as du_echu, paye::float8 as paye,
                reste_echu::float8 as reste_echu, reste_annee::float8 as reste_annee
           from situation_au('2026-11-24') where inscription_id = $1 order by devise`,
        [i.id],
      )
    })
    // À fin novembre : septembre, octobre, novembre (3 × 84 000) + tranche 1 (octobre) = 261 000 FC échus.
    expect(situation).toEqual([
      { devise: 'CDF', du_echu: 261000, paye: 168000, reste_echu: 93000, reste_annee: 84000 * 9 + 18000 + 2500 - 168000 },
      { devise: 'USD', du_echu: 15, paye: 15, reste_echu: 0, reste_annee: 0 },
    ])
  })
})
