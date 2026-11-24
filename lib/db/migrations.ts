import fs from 'node:fs'
import path from 'node:path'

import type { PGlite } from '@electric-sql/pglite'

/** Dossier de l'application (où se trouvent supabase/ et db/). */
export function racineApplication(): string {
  return process.env.ERP_RACINE ?? process.cwd()
}

/**
 * Fichiers à exécuter sur le PC, dans l'ordre :
 *   1. db/local/0000_auth.sql (ce que Supabase fournit d'habitude) ;
 *   2. le schéma commun supabase/migrations/*.sql, identique au centre ;
 *   3. les autres db/local/*.sql (propres au PC).
 */
export function fichiersMigrations(racine = racineApplication()): string[] {
  const lister = (dossier: string) =>
    fs.readdirSync(path.join(racine, dossier)).filter((f) => f.endsWith('.sql')).sort().map((f) => `${dossier}/${f}`)
  const avant = 'db/local/0000_auth.sql'
  return [avant, ...lister('supabase/migrations'), ...lister('db/local').filter((f) => f !== avant)]
}

/**
 * Met la base du PC à jour : chaque fichier n'est exécuté qu'une fois, dans
 * sa propre transaction. Une mise à jour de l'application qui apporte un
 * nouveau fichier l'exécute donc au démarrage suivant, sans intervention.
 */
export async function appliquerMigrations(db: PGlite, racine = racineApplication()): Promise<string[]> {
  await db.exec(`
    create schema if not exists local;
    create table if not exists local.migrations (
      nom text primary key,
      appliquee_le timestamptz not null default now()
    );
  `)
  const faites = new Set((await db.query<{ nom: string }>('select nom from local.migrations')).rows.map((r) => r.nom))
  const appliquees: string[] = []
  for (const fichier of fichiersMigrations(racine)) {
    if (faites.has(fichier)) continue
    const sql = fs.readFileSync(path.join(racine, fichier), 'utf8')
    await db.transaction(async (tx) => {
      await tx.exec(sql)
      await tx.query('insert into local.migrations (nom) values ($1)', [fichier])
    })
    appliquees.push(fichier)
  }
  return appliquees
}
