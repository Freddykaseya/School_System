// Prépare la base locale d'un PC pour un ESSAI, sans base centrale :
// charge les données de départ et crée un compte de l'école.
//   pnpm poste:init <CODE_ECOLE> <email> <mot_de_passe> "<Nom complet>" <DIRECTION|COMPTABLE|CAISSIER> [--frais-a-confirmer]
// En vrai, un PC reçoit son école et ses comptes du centre à la première
// connexion en ligne : ce script n'est là que pour essayer l'application.
// L'application doit être arrêtée pendant ce temps (une seule ouverture).

import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { dossierDonnees, ouvrirBaseLocale } from '../lib/db/local.ts'
import { racineApplication } from '../lib/db/migrations.ts'
import { definirParametre, enregistrerIdentifiant, parametre } from '../lib/poste/comptes.ts'

const args = process.argv.slice(2)
const avecFrais = args.includes('--frais-a-confirmer')
const [code, email, motDePasse, nom, role] = args.filter((a) => !a.startsWith('--'))
const ROLES = ['DIRECTION', 'COMPTABLE', 'CAISSIER']

if (!code || !email || !motDePasse || !nom || !ROLES.includes(role)) {
  console.error('Usage : pnpm poste:init <CODE_ECOLE> <email> <mot_de_passe> "<Nom complet>" <DIRECTION|COMPTABLE|CAISSIER> [--frais-a-confirmer]')
  process.exit(1)
}
if (motDePasse.length < 10) {
  console.error('Mot de passe trop court : 10 caractères minimum.')
  process.exit(1)
}

const dossier = dossierDonnees()
const db = await ouvrirBaseLocale(dossier)
const seed = (f: string) => db.exec(fs.readFileSync(path.join(racineApplication(), 'supabase/seeds', f), 'utf8'))

// Données de configuration, comme si elles venaient du centre : rien à renvoyer.
await db.exec(`select set_config('erp.reception', 'on', false)`)
await seed('0001_referentiel.sql')
if (avecFrais) await seed('0002_frais_csgo2_A_CONFIRMER.sql')
await db.exec(`select set_config('erp.reception', '', false)`)

const { rows } = await db.query<{ id: string }>('select id from public.ecoles where code = $1', [code.toUpperCase()])
const ecoleId = rows[0]?.id
if (!ecoleId) {
  console.error(`École introuvable : ${code}`)
  process.exit(1)
}
const rattachee = await parametre(db, 'ecole_id')
if (rattachee && rattachee !== ecoleId) {
  console.error('Ce PC est déjà rattaché à une autre école.')
  process.exit(1)
}

const existant = await db.query<{ id: string }>('select id from public.profils where lower(email) = lower($1)', [email])
const userId = existant.rows[0]?.id ?? randomUUID()
await db.transaction(async (tx) => {
  await tx.query('insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing', [userId, email])
  await tx.query(
    `insert into public.profils (id, email, nom_complet, role, ecole_id) values ($1, $2, $3, $4, $5)
     on conflict (id) do update set nom_complet = excluded.nom_complet, role = excluded.role, actif = true`,
    [userId, email, nom, role, ecoleId],
  )
  await definirParametre(tx, 'ecole_id', ecoleId)
})
await enregistrerIdentifiant(db, userId, email, motDePasse)
await db.close()

console.log(`Poste prêt (${dossier}) : école ${code.toUpperCase()}, compte ${email} (${role}).`)
if (!avecFrais) console.log('Grille de frais non chargée (ajoutez --frais-a-confirmer pour les montants CSGO2 déduits).')
