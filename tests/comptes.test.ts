import fs from 'node:fs'

import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { identitesLocales, type Identites } from '@/lib/comptes/identites'
import {
  creerCompte,
  ErreurCompte,
  listerComptes,
  modifierCompte,
  motDePasseProvisoire,
  reinitialiserMotDePasse,
} from '@/lib/comptes/service'
import { enTantQue } from '@/lib/db/en-tant-que'
import { connexionPGlite, ouvrirBaseLocale } from '@/lib/db/local'
import type { Connexion } from '@/lib/db/types'
import { verifierIdentifiant } from '@/lib/poste/comptes'

// Centre de démonstration : base locale, identités locales.
let db: PGlite
let base: Connexion
let identites: Identites
let csgo1: string
let csgo2: string
const ADMIN = '00000000-0000-0000-0000-00000000000a'

beforeAll(async () => {
  db = await ouvrirBaseLocale()
  await db.exec(fs.readFileSync('supabase/seeds/0001_referentiel.sql', 'utf8'))
  await db.query(`insert into auth.users (id, email) values ($1, 'admin@groupe.cd')`, [ADMIN])
  await db.query(`insert into profils (id, email, nom_complet, role) values ($1, 'admin@groupe.cd', 'Administrateur', 'ADMIN')`, [ADMIN])
  base = connexionPGlite(db)
  identites = identitesLocales(db)
  const id = async (code: string) => (await db.query<{ id: string }>('select id from ecoles where code = $1', [code])).rows[0].id
  csgo1 = await id('CSGO1')
  csgo2 = await id('CSGO2')
}, 60_000)

describe('mot de passe provisoire', () => {
  it('est long, lisible et différent à chaque fois', () => {
    const a = motDePasseProvisoire()
    expect(a).toMatch(/^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/)
    expect(a).not.toMatch(/[01lIoO]/)
    expect(motDePasseProvisoire()).not.toBe(a)
  })
})

describe('créer un compte', () => {
  let caissier: string

  it('crée la personne avec son rôle et son école, prête à se connecter', async () => {
    const { id, motDePasse } = await creerCompte(base, ADMIN, identites, {
      email: ' Caisse@CSGO2.cd ', nomComplet: 'Marie  Kabila', role: 'CAISSIER', ecoleId: csgo2,
    })
    caissier = id
    const comptes = await enTantQue(base, ADMIN, listerComptes)
    expect(comptes.find((c) => c.id === id)).toMatchObject({
      email: 'caisse@csgo2.cd', nom_complet: 'Marie Kabila', role: 'CAISSIER', ecole_code: 'CSGO2', actif: true,
    })
    expect(await verifierIdentifiant(db, 'caisse@csgo2.cd', motDePasse)).toBe(id)
  })

  it('refuse une adresse déjà utilisée, quelle que soit la casse', async () => {
    await expect(creerCompte(base, ADMIN, identites, {
      email: 'CAISSE@csgo2.cd', nomComplet: 'Autre', role: 'CAISSIER', ecoleId: csgo2,
    })).rejects.toThrow(/existe déjà/)
  })

  it('exige une école, sauf pour un administrateur', async () => {
    await expect(creerCompte(base, ADMIN, identites, {
      email: 'dir@x.cd', nomComplet: 'Sans École', role: 'DIRECTION', ecoleId: null,
    })).rejects.toBeInstanceOf(ErreurCompte)
    const { id } = await creerCompte(base, ADMIN, identites, {
      email: 'admin2@groupe.cd', nomComplet: 'Second Admin', role: 'ADMIN', ecoleId: csgo2,
    })
    const [c] = (await db.query<{ ecole_id: string | null }>('select ecole_id from profils where id = $1', [id])).rows
    expect(c.ecole_id).toBeNull()
  })

  it('seul un administrateur peut créer un compte (contrôlé par la base)', async () => {
    await expect(creerCompte(base, caissier, identites, {
      email: 'pirate@csgo2.cd', nomComplet: 'Pirate', role: 'DIRECTION', ecoleId: csgo2,
    })).rejects.toThrow()
    const reste = await db.query(`select 1 from auth.users where email = 'pirate@csgo2.cd'`)
    expect(reste.rows).toHaveLength(0) // identité annulée avec le profil
  })

  it('modifier : changer d’école et de rôle, puis désactiver', async () => {
    await modifierCompte(base, ADMIN, caissier, { nomComplet: 'Marie Kabila', role: 'COMPTABLE', ecoleId: csgo1, actif: true })
    let [c] = (await enTantQue(base, ADMIN, listerComptes)).filter((x) => x.id === caissier)
    expect(c).toMatchObject({ role: 'COMPTABLE', ecole_code: 'CSGO1', actif: true })

    await modifierCompte(base, ADMIN, caissier, { nomComplet: 'Marie Kabila', role: 'COMPTABLE', ecoleId: csgo1, actif: false })
    ;[c] = (await enTantQue(base, ADMIN, listerComptes)).filter((x) => x.id === caissier)
    expect(c.actif).toBe(false)
  })

  it('l’administrateur ne peut pas se retirer ses propres droits', async () => {
    await expect(modifierCompte(base, ADMIN, ADMIN, { nomComplet: 'Administrateur', role: 'DIRECTION', ecoleId: csgo2, actif: true }))
      .rejects.toThrow(/propres droits/)
    await expect(modifierCompte(base, ADMIN, ADMIN, { nomComplet: 'Administrateur', role: 'ADMIN', ecoleId: null, actif: false }))
      .rejects.toThrow(/propres droits/)
  })

  it('réinitialiser le mot de passe : l’ancien ne marche plus', async () => {
    await modifierCompte(base, ADMIN, caissier, { nomComplet: 'Marie Kabila', role: 'COMPTABLE', ecoleId: csgo1, actif: true })
    const nouveau = await reinitialiserMotDePasse(base, ADMIN, identites, caissier)
    expect(await verifierIdentifiant(db, 'caisse@csgo2.cd', nouveau)).toBe(caissier)
  })

  it('chaque changement de compte est écrit dans le journal', async () => {
    const { rows } = await db.query<{ action: string; n: number }>(
      `select action, count(*)::int n from journal_audit where table_nom = 'profils' and ligne_id = $1 group by action`, [caissier])
    expect(Object.fromEntries(rows.map((r) => [r.action, r.n]))).toEqual({ INSERT: 1, UPDATE: 3 })
    const [j] = (await db.query<{ user_id: string }>(
      `select user_id::text from journal_audit where table_nom = 'profils' and ligne_id = $1 limit 1`, [caissier])).rows
    expect(j.user_id).toBe(ADMIN)
  })
})
