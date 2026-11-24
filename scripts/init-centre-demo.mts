// Prépare le CENTRE DE DÉMONSTRATION (base locale, sans Supabase) et crée
// le premier administrateur, qui ajoutera ensuite les autres comptes depuis
// l'écran « Comptes et accès ».
//   pnpm centre:init <email> <mot_de_passe> "<Nom complet>" [--frais-a-confirmer]
// L'application du centre doit être arrêtée pendant ce temps.

import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

process.env.ERP_MODE = 'centre'

const { dossierDonnees, ouvrirBaseLocale } = await import('../lib/db/local.ts')
const { racineApplication } = await import('../lib/db/migrations.ts')
const { enregistrerIdentifiant } = await import('../lib/poste/comptes.ts')

const args = process.argv.slice(2)
const avecFrais = args.includes('--frais-a-confirmer')
const [email, motDePasse, nom] = args.filter((a) => !a.startsWith('--'))
if (!email || !motDePasse || !nom) {
  console.error('Usage : pnpm centre:init <email> <mot_de_passe> "<Nom complet>" [--frais-a-confirmer]')
  process.exit(1)
}
if (motDePasse.length < 10) {
  console.error('Mot de passe trop court : 10 caractères minimum.')
  process.exit(1)
}

const dossier = dossierDonnees()
const db = await ouvrirBaseLocale(dossier)
const seed = (f: string) => db.exec(fs.readFileSync(path.join(racineApplication(), 'supabase/seeds', f), 'utf8'))
await seed('0001_referentiel.sql')
if (avecFrais) await seed('0002_frais_csgo2_A_CONFIRMER.sql')

const adresse = email.trim().toLowerCase()
const existant = await db.query<{ id: string }>('select id from public.profils where lower(email) = $1', [adresse])
const id = existant.rows[0]?.id ?? randomUUID()
await db.transaction(async (tx) => {
  await tx.query('insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing', [id, adresse])
  await tx.query(
    `insert into public.profils (id, email, nom_complet, role) values ($1, $2, $3, 'ADMIN')
     on conflict (id) do update set nom_complet = excluded.nom_complet, role = 'ADMIN', ecole_id = null, actif = true`,
    [id, adresse, nom],
  )
})
await enregistrerIdentifiant(db, id, adresse, motDePasse)
await db.close()
console.log(`Centre de démonstration prêt (${dossier}) : administrateur ${adresse}.`)
