import fs from 'node:fs'

import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { signerJeton, verifierJeton } from '@/lib/auth/jeton'
import { empreinte, verifierMotDePasse } from '@/lib/auth/mot-de-passe'
import { enTantQue } from '@/lib/db/en-tant-que'
import { connexionPGlite, ouvrirBaseLocale } from '@/lib/db/local'
import { appliquerMigrations, fichiersMigrations } from '@/lib/db/migrations'
import type { Connexion } from '@/lib/db/types'
import { classesEtTotaux, ecolesEtTotaux } from '@/lib/donnees'
import { enregistrerIdentifiant, verifierIdentifiant } from '@/lib/poste/comptes'
import { appliquerReception, ErreurPoste, type LotReception } from '@/lib/poste/reception'

/*
 * « centre » joue la base centrale (données de départ + frais CSGO2) ;
 * « pc » est le PC de CSGO2, vide au départ, qui reçoit sa configuration
 * comme à une première connexion, puis travaille hors ligne.
 */
let centre: PGlite
let pc: PGlite
let base: Connexion
let csgo2: string
let annee: string
let mat1: string

const DIRECTION = '00000000-0000-0000-0000-0000000000d2'
const CAISSIER = '00000000-0000-0000-0000-0000000000c2'
const DIRECTION_CSGO1 = '00000000-0000-0000-0000-0000000000d1'

async function lignes(db: PGlite, sql: string, params: unknown[] = []) {
  return (await db.query<{ l: Record<string, unknown> }>(`select to_jsonb(t) as l from (${sql}) t`, params)).rows.map((r) => r.l)
}

async function lotPour(profil: Record<string, unknown>): Promise<LotReception> {
  const ecoleId = profil.ecole_id
  return {
    profil,
    ecole: (await lignes(centre, 'select * from ecoles where id = $1', [ecoleId]))[0],
    annees: await lignes(centre, 'select * from annees_scolaires'),
    options: await lignes(centre, 'select * from options_humanites'),
    classes: await lignes(centre, 'select * from classes where ecole_id = $1', [ecoleId]),
    echeances: await lignes(centre, 'select * from echeances where ecole_id = $1', [ecoleId]),
  }
}

const profil = (id: string, role: string, ecoleId: string | null, email: string) => ({
  id, email, nom_complet: `${role} test`, role, ecole_id: ecoleId, actif: true, created_at: new Date().toISOString(),
})

beforeAll(async () => {
  centre = await ouvrirBaseLocale()
  await centre.exec(fs.readFileSync('supabase/seeds/0001_referentiel.sql', 'utf8'))
  await centre.exec(fs.readFileSync('supabase/seeds/0002_frais_csgo2_A_CONFIRMER.sql', 'utf8'))
  csgo2 = (await centre.query<{ id: string }>(`select id from ecoles where code = 'CSGO2'`)).rows[0].id

  pc = await ouvrirBaseLocale()
  base = connexionPGlite(pc)
  await appliquerReception(pc, await lotPour(profil(DIRECTION, 'DIRECTION', csgo2, 'direction@csgo2.cd')))
  await appliquerReception(pc, await lotPour(profil(CAISSIER, 'CAISSIER', csgo2, 'caisse@csgo2.cd')))
  annee = (await pc.query<{ id: string }>('select id from annees_scolaires where active')).rows[0].id
  mat1 = (await pc.query<{ id: string }>(`select id from classes where ecole_id = $1 and cycle = 'MATERNELLE' and niveau = 1`, [csgo2])).rows[0].id
}, 120_000)

describe('base du PC', () => {
  it('applique chaque migration une seule fois, dans l’ordre', async () => {
    expect(await appliquerMigrations(pc)).toEqual([])
    const faites = (await pc.query<{ nom: string }>('select nom from local.migrations order by appliquee_le, nom')).rows.map((r) => r.nom)
    expect(faites.sort()).toEqual([...fichiersMigrations()].sort())
    expect(fichiersMigrations()[0]).toBe('db/local/0000_auth.sql')
  })
})

describe('réception de la configuration (première connexion)', () => {
  it('recopie l’école, ses 39 classes et ses 507 échéances', async () => {
    const r = (await pc.query<{ e: number; c: number; ech: number }>(
      `select (select count(*)::int from ecoles) e, (select count(*)::int from classes) c, (select count(*)::int from echeances) ech`,
    )).rows[0]
    expect(r).toEqual({ e: 1, c: 39, ech: 507 })
  })

  it('rattache le PC à son école et refuse un compte d’une autre école', async () => {
    const csgo1 = (await centre.query<{ id: string }>(`select id from ecoles where code = 'CSGO1'`)).rows[0].id
    await expect(appliquerReception(pc, await lotPour(profil(DIRECTION_CSGO1, 'DIRECTION', csgo1, 'dir@csgo1.cd')))).rejects.toThrow(
      /appartient à l’école CSGO2/,
    )
  })

  it('refuse le compte administrateur sur un PC d’école', async () => {
    const lot = await lotPour(profil(DIRECTION, 'DIRECTION', csgo2, 'x'))
    await expect(appliquerReception(pc, { ...lot, profil: profil(DIRECTION, 'ADMIN', null, 'admin@x') })).rejects.toBeInstanceOf(ErreurPoste)
  })

  it('peut être refaite sans doublon et ne crée rien à renvoyer au centre', async () => {
    await appliquerReception(pc, await lotPour(profil(DIRECTION, 'DIRECTION', csgo2, 'direction@csgo2.cd')))
    const r = (await pc.query<{ c: number; n: number }>(
      `select (select count(*)::int from classes) c, (select count(*)::int from local.a_envoyer) n`,
    )).rows[0]
    expect(r).toEqual({ c: 39, n: 0 })
  })
})

describe('connexion sans internet', () => {
  it('reconnaît le mot de passe enregistré, refuse un mauvais', async () => {
    await enregistrerIdentifiant(pc, DIRECTION, 'Direction@CSGO2.cd', 'MotDePasse!2026')
    expect(await verifierIdentifiant(pc, 'direction@csgo2.cd', 'MotDePasse!2026')).toBe(DIRECTION)
    expect(await verifierIdentifiant(pc, 'direction@csgo2.cd', 'mauvais-mot')).toBeNull()
    expect(await verifierIdentifiant(pc, 'inconnu@csgo2.cd', 'MotDePasse!2026')).toBeNull()
  })

  it('refuse un compte désactivé', async () => {
    await enregistrerIdentifiant(pc, CAISSIER, 'caisse@csgo2.cd', 'Caisse!2026xx')
    await pc.query('update profils set actif = false where id = $1', [CAISSIER])
    expect(await verifierIdentifiant(pc, 'caisse@csgo2.cd', 'Caisse!2026xx')).toBeNull()
    await pc.query('update profils set actif = true where id = $1', [CAISSIER])
  })

  it('ne garde que l’empreinte du mot de passe', async () => {
    const e = await empreinte('MotDePasse!2026')
    expect(e).not.toContain('MotDePasse')
    expect(await verifierMotDePasse('MotDePasse!2026', e)).toBe(true)
    expect(await verifierMotDePasse('motdepasse!2026', e)).toBe(false)
  })

  it('les utilisateurs ne peuvent pas lire les identifiants du PC', async () => {
    await expect(enTantQue(base, CAISSIER, (q) => q('select * from local.identifiants'))).rejects.toThrow(/permission/)
  })
})

describe('jeton de session', () => {
  const secret = 'secret-de-test'
  it('est valide, puis expire', () => {
    const j = signerJeton(DIRECTION, secret, 60, 1_000_000)
    expect(verifierJeton(j, secret, 1_000_000)).toBe(DIRECTION)
    expect(verifierJeton(j, secret, 1_000_000 + 61_000)).toBeNull()
  })
  it('est refusé s’il est modifié ou signé avec un autre secret', () => {
    const j = signerJeton(DIRECTION, secret, 60)
    expect(verifierJeton(j.replace(DIRECTION, CAISSIER), secret)).toBeNull()
    expect(verifierJeton(j, 'autre-secret')).toBeNull()
    expect(verifierJeton(undefined, secret)).toBeNull()
  })
})

describe('travail hors ligne', () => {
  let paiement: string

  it('inscrire et encaisser avec les règles d’accès de la base', async () => {
    const inscription = await enTantQue(base, DIRECTION, async (q) => {
      const [eleve] = await q<{ id: string }>(
        `insert into eleves (ecole_id, matricule, nom) values ($1, 'M-001', 'KABEYA') returning id`, [csgo2])
      const [i] = await q<{ id: string }>(
        `insert into inscriptions (ecole_id, eleve_id, annee_id, classe_id, premier_mois_du)
         values ($1, $2, $3, $4, '2026-09-01') returning id`, [csgo2, eleve.id, annee, mat1])
      return i.id
    })
    paiement = await enTantQue(base, CAISSIER, async (q) => {
      const [p] = await q<{ id: string; numero_recu: number; recu_par: string }>(
        `insert into paiements (ecole_id, inscription_id, montant, recu_par, numero_recu)
         values ($1, $2, 84000, $3, 999) returning id, numero_recu, recu_par`, [csgo2, inscription, DIRECTION])
      // L'encaisseur et le numéro sont imposés par la base, pas par l'appelant.
      expect(p.recu_par).toBe(CAISSIER)
      expect(Number(p.numero_recu)).toBe(1)
      return p.id
    })
  })

  it('un caissier ne peut pas inscrire', async () => {
    await expect(enTantQue(base, CAISSIER, (q) =>
      q(`insert into eleves (ecole_id, matricule, nom) values ($1, 'M-002', 'X')`, [csgo2]))).rejects.toThrow()
  })

  it('note chaque opération à envoyer au centre', async () => {
    const { rows } = await pc.query<{ table_nom: string }>('select table_nom from local.a_envoyer where envoye_le is null order by id')
    const tables = new Set(rows.map((r) => r.table_nom))
    expect(tables).toEqual(new Set(['eleves', 'inscriptions', 'paiements', 'journal_audit']))
  })

  it('calcule les totaux de l’école par la base', async () => {
    const { classes, total } = await enTantQue(base, DIRECTION, (q) => classesEtTotaux(q, csgo2))
    const m1 = classes.find((c) => c.id === mat1)!
    expect(classes).toHaveLength(39)
    expect(m1).toMatchObject({ effectif: 1, du: 785_500, paye: 84_000, reste: 701_500 })
    expect(total).toEqual({ effectif: 1, du: 785_500, paye: 84_000, reste: 701_500 })
    const { ecoles } = await enTantQue(base, DIRECTION, (q) => ecolesEtTotaux(q))
    expect(ecoles.map((e) => e.code)).toEqual(['CSGO2'])
    expect(ecoles[0]).toMatchObject({ nbClasses: 39, effectif: 1, paye: 84_000 })
  })

  it('au centre : garde le numéro de reçu de l’école et accepte un envoi refait', async () => {
    // Copie du paiement, annulée sur le PC, telle que le centre la recevra.
    await enTantQue(base, DIRECTION, (q) =>
      q(`update paiements set annule = true, motif_annulation = 'Erreur de classe' where id = $1`, [paiement]))
    const [copie] = await lignes(pc, 'select * from paiements where id = $1', [paiement])
    const recopier = () => pc.query(
      `insert into paiements select * from jsonb_populate_record(null::paiements, $1::jsonb)
       on conflict (id) do update set annule = excluded.annule, annule_par = excluded.annule_par,
         annule_le = excluded.annule_le, motif_annulation = excluded.motif_annulation`,
      [JSON.stringify({ ...copie, id: '00000000-0000-0000-0000-00000000aaaa', numero_recu: 500 })])
    await recopier()
    await recopier() // envoi interrompu puis refait : pas d'erreur
    const r = (await pc.query<{ numero_recu: number; annule_le: string }>(
      `select numero_recu, annule_le::text from paiements where id = '00000000-0000-0000-0000-00000000aaaa'`)).rows[0]
    expect(Number(r.numero_recu)).toBe(500)
    expect(r.annule_le).not.toBeNull()
    // Le compteur suit : le reçu suivant d'un utilisateur est le 501.
    const n = await enTantQue(base, CAISSIER, async (q) => {
      const [i] = await q<{ inscription_id: string }>('select inscription_id from paiements limit 1')
      const [p] = await q<{ numero_recu: number }>(
        'insert into paiements (ecole_id, inscription_id, montant, recu_par) values ($1, $2, 1000, $3) returning numero_recu',
        [csgo2, i.inscription_id, CAISSIER])
      return Number(p.numero_recu)
    })
    expect(n).toBe(501)
  })
})
