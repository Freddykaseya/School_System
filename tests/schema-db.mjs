// pnpm test:db — vérifie le schéma ERP Écoles sur un PostgreSQL embarqué (PGlite), avec une
// imitation minimale de Supabase (schéma auth, auth.uid(), rôle authenticated).
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const APP = fileURLToPath(new URL('../supabase', import.meta.url))
const db = new PGlite()
let ok = 0, ko = 0
const check = (label, cond, extra = '') => { if (cond) { ok++; console.log('  OK  ', label) } else { ko++; console.log('  ÉCHEC', label, extra) } }

await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated nologin;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
`)
await db.exec(fs.readFileSync(`${APP}/migrations/20261123_0001_schema.sql`, 'utf8'))
await db.exec(`grant usage on schema public to authenticated;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  grant usage on all sequences in schema public to authenticated;`)
await db.exec(fs.readFileSync(`${APP}/seeds/0001_referentiel.sql`, 'utf8'))
await db.exec(fs.readFileSync(`${APP}/seeds/0001_referentiel.sql`, 'utf8')) // rejouable
await db.exec(fs.readFileSync(`${APP}/seeds/0002_frais_csgo2_A_CONFIRMER.sql`, 'utf8'))

const one = async (sql, p) => (await db.query(sql, p)).rows[0]
console.log('Schéma et données de départ chargés.')
const n = await one(`select (select count(*) from ecoles) e, (select count(*) from classes where ecole_id=(select id from ecoles where code='CSGO2')) c2, (select count(*) from classes where ecole_id=(select id from ecoles where code='NOVA')) cn, (select count(*) from echeances) ech`)
check('4 écoles', Number(n.e) === 4)
check('CSGO2 : 3 + 6 + 2 + 28 = 39 classes', Number(n.c2) === 39, n.c2)
check('Nova : 3 classes de maternelle', Number(n.cn) === 3, n.cn)
check('Échéances CSGO2 : 39 classes × 13 = 507', Number(n.ech) === 507, n.ech)

// Comptes
const ids = { admin: '00000000-0000-0000-0000-00000000000a', dir2: '00000000-0000-0000-0000-0000000000d2', caisse2: '00000000-0000-0000-0000-0000000000c2', compta2: '00000000-0000-0000-0000-0000000000b2', dir1: '00000000-0000-0000-0000-0000000000d1' }
for (const id of Object.values(ids)) await db.query('insert into auth.users values ($1)', [id])
await db.exec(`
  insert into profils (id, email, nom_complet, role, ecole_id) values
  ('${ids.admin}', 'admin@x', 'Admin', 'ADMIN', null),
  ('${ids.dir2}', 'dir2@x', 'Direction CSGO2', 'DIRECTION', (select id from ecoles where code='CSGO2')),
  ('${ids.caisse2}', 'caisse2@x', 'Caisse CSGO2', 'CAISSIER', (select id from ecoles where code='CSGO2')),
  ('${ids.compta2}', 'compta2@x', 'Compta CSGO2', 'COMPTABLE', (select id from ecoles where code='CSGO2')),
  ('${ids.dir1}', 'dir1@x', 'Direction CSGO1', 'DIRECTION', (select id from ecoles where code='CSGO1'));`)

async function as(user, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
async function fails(fn) { try { await fn(); return null } catch (e) { return e.message } }

const csgo2 = (await one(`select id from ecoles where code='CSGO2'`)).id
const csgo1 = (await one(`select id from ecoles where code='CSGO1'`)).id
const mat1 = (await one(`select id from classes where ecole_id=$1 and cycle='MATERNELLE' and niveau=1`, [csgo2])).id
const annee = (await one(`select id from annees_scolaires where active`)).id

console.log('\nCloisonnement par école')
await as(ids.dir1, async () => {
  const r = await one(`select count(*) c from classes`)
  check('CSGO1 ne voit aucune classe de CSGO2', Number(r.c) === 0, r.c)
  const e = await one(`select count(*) c from ecoles`)
  check('CSGO1 ne voit que sa propre école', Number(e.c) === 1, e.c)
  const err = await fails(() => db.query(`insert into eleves (ecole_id, matricule, nom) values ($1, 'X1', 'INTRUS')`, [csgo2]))
  check('CSGO1 ne peut pas inscrire un élève dans CSGO2', !!err, err)
})

console.log('\nInscriptions')
let eleve, inscription
await as(ids.dir2, async () => {
  eleve = (await one(`insert into eleves (ecole_id, matricule, nom, postnom, prenom) values ($1, '2026-0001', 'ACHIZA', 'BADESIRE', 'MIGAEL') returning id`, [csgo2])).id
  inscription = (await one(`insert into inscriptions (ecole_id, eleve_id, annee_id, classe_id, premier_mois_du) values ($1,$2,$3,$4,'2026-09-01') returning id`, [csgo2, eleve, annee, mat1])).id
  check('La direction CSGO2 inscrit un élève', !!inscription)
  const e2 = (await one(`insert into eleves (ecole_id, matricule, nom) values ($1, '2026-0002', 'MWAPE') returning id`, [csgo2])).id
  const i2 = await fails(() => db.query(`insert into inscriptions (ecole_id, eleve_id, annee_id, classe_id, premier_mois_du, statut, pris_en_charge_par, remise_pct) values ($1,$2,$3,$4,'2026-09-01','PRISE_EN_CHARGE','Mme Solange',100)`, [csgo2, e2, annee, mat1]))
  check('La direction peut accorder une prise en charge', !i2, i2)
})
await as(ids.compta2, async () => {
  const e3 = (await one(`insert into eleves (ecole_id, matricule, nom) values ($1, '2026-0003', 'KASEKA') returning id`, [csgo2])).id
  const err = await fails(() => db.query(`insert into inscriptions (ecole_id, eleve_id, annee_id, classe_id, premier_mois_du, statut, remise_pct) values ($1,$2,$3,$4,'2026-09-01','BONUS',100)`, [csgo2, e3, annee, mat1]))
  check('Le comptable ne peut pas accorder une prise en charge', !!err && /direction/.test(err), err)
})
await as(ids.caisse2, async () => {
  const err = await fails(() => db.query(`insert into eleves (ecole_id, matricule, nom) values ($1, '2026-0009', 'X')`, [csgo2]))
  check('Le caissier ne peut pas inscrire d’élève', !!err, err)
})
{
  const e1 = (await one(`insert into eleves (ecole_id, matricule, nom) values ($1, 'M1', 'MELANGE') returning id`, [csgo1])).id
  const err = await fails(() => db.query(`insert into inscriptions (ecole_id, eleve_id, annee_id, classe_id, premier_mois_du) values ($1,$2,$3,$4,'2026-09-01')`, [csgo2, e1, annee, mat1]))
  check('Impossible de mélanger un élève de CSGO1 et une classe de CSGO2', !!err, err)
}

console.log('\nPaiements et reçus')
await as(ids.caisse2, async () => {
  const p1 = await one(`insert into paiements (ecole_id, inscription_id, montant) values ($1,$2,84000) returning id, numero_recu, recu_par`, [csgo2, inscription])
  const p2 = await one(`insert into paiements (ecole_id, inscription_id, montant) values ($1,$2,84000) returning id, numero_recu`, [csgo2, inscription])
  check('Reçus numérotés 1 puis 2', Number(p1.numero_recu) === 1 && Number(p2.numero_recu) === 2, `${p1.numero_recu},${p2.numero_recu}`)
  check('L’encaisseur est le compte connecté', p1.recu_par === ids.caisse2)
  const upd = await db.query(`update paiements set montant = 1000 where id = $1`, [p1.id])
  const apres = await one(`select montant from paiements where id = $1`, [p1.id])
  check('Le caissier ne peut pas modifier un paiement', upd.affectedRows === 0 && Number(apres.montant) === 84000, upd.affectedRows + ' / ' + apres.montant)
  const del = await db.query(`delete from paiements where id = $1`, [p1.id])
  check('Aucune suppression possible', del.affectedRows === 0, del.affectedRows)
  const neg = await fails(() => db.query(`insert into paiements (ecole_id, inscription_id, montant) values ($1,$2,-5)`, [csgo2, inscription]))
  check('Montant négatif refusé', !!neg)
})
await as(ids.compta2, async () => {
  const p = await one(`select id from paiements order by numero_recu limit 1`)
  const err = await fails(() => db.query(`update paiements set montant = 1000 where id = $1`, [p.id]))
  check('Même le comptable ne peut pas changer un montant', !!err && /ne se modifie pas/.test(err), err)
  const noReason = await fails(() => db.query(`update paiements set annule = true where id = $1`, [p.id]))
  check('Annulation refusée sans motif', !!noReason, noReason)
  const okAnn = await fails(() => db.query(`update paiements set annule = true, motif_annulation = 'Erreur de saisie' where id = $1`, [p.id]))
  check('Annulation avec motif acceptée', !okAnn, okAnn)
  const again = await fails(() => db.query(`update paiements set motif_annulation = 'autre motif' where id = $1`, [p.id]))
  check('Un paiement annulé ne se modifie plus', !!again, again)
})

console.log('\nSituation calculée')
const s = await one(`select montant_du, montant_paye, reste from situation_inscriptions where inscription_id = $1`, [inscription])
check('Dû 1re maternelle = 9 × 84 000 + 3 × 9 000 + 2 500 = 785 500', Number(s.montant_du) === 785500, s.montant_du)
check('Payé = 84 000 (le paiement annulé ne compte pas)', Number(s.montant_paye) === 84000, s.montant_paye)
check('Reste = 701 500', Number(s.reste) === 701500, s.reste)
const pc = await one(`select s.montant_du from situation_inscriptions s join inscriptions i on i.id = s.inscription_id where i.statut = 'PRISE_EN_CHARGE'`)
check('Prise en charge 100 % : minerval offert, tranches et bulletin dus (29 500)', Number(pc.montant_du) === 29500, pc.montant_du)
await as(ids.dir1, async () => {
  const r = await one(`select count(*) c from situation_inscriptions`)
  check('CSGO1 ne voit pas la situation des élèves de CSGO2', Number(r.c) === 0, r.c)
})
await as(ids.admin, async () => {
  const r = await one(`select count(*) c from situation_inscriptions`)
  check('L’administrateur voit toutes les inscriptions', Number(r.c) >= 2, r.c)
})

console.log('\nJournal')
const j = await one(`select count(*) filter (where table_nom='paiements') p, count(*) filter (where table_nom='inscriptions') i from journal_audit`)
check('Paiements et inscriptions tracés dans le journal', Number(j.p) >= 3 && Number(j.i) >= 2, JSON.stringify(j))
await as(ids.caisse2, async () => {
  const err = await fails(() => db.query(`insert into journal_audit (action, table_nom) values ('FAUX', 'x')`))
  check('Personne ne peut écrire directement dans le journal', !!err, err)
})

console.log(`\n${ok} contrôles réussis, ${ko} en échec`)
process.exit(ko ? 1 : 0)
