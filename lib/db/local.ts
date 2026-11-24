import fs from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'

import { appliquerMigrations } from './migrations.ts'
import type { Connexion } from './types.ts'

/** Dossier des données du PC (fichiers de la base PGlite). */
export function dossierDonnees(): string {
  return process.env.ERP_DONNEES ?? path.join(process.cwd(), 'donnees-locales')
}

function processusVivant(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Deux programmes qui écrivent en même temps dans les mêmes fichiers
 * abîmeraient la base : on pose un verrou à côté du dossier.
 */
function prendreVerrou(dossier: string) {
  const verrou = `${dossier}.verrou`
  if (fs.existsSync(verrou)) {
    const pid = Number(fs.readFileSync(verrou, 'utf8'))
    if (pid && pid !== process.pid && processusVivant(pid)) {
      throw new Error(`La base locale est déjà ouverte par un autre programme (processus ${pid}). Fermez-le avant de continuer.`)
    }
  }
  fs.writeFileSync(verrou, String(process.pid))
  process.once('exit', () => {
    try {
      if (fs.readFileSync(verrou, 'utf8') === String(process.pid)) fs.unlinkSync(verrou)
    } catch {
      // Verrou déjà retiré.
    }
  })
}

/**
 * Ouvre la base du PC et la met à jour. Sans dossier : base en mémoire
 * (tests).
 */
export async function ouvrirBaseLocale(dossier?: string): Promise<PGlite> {
  let db: PGlite
  if (dossier) {
    fs.mkdirSync(path.dirname(dossier), { recursive: true })
    prendreVerrou(dossier)
    db = new PGlite(dossier)
  } else {
    db = new PGlite()
  }
  await db.waitReady
  await appliquerMigrations(db)
  return db
}

/** Une transaction PGlite. PGlite n'a qu'une session : les autres
 * requêtes attendent la fin de la transaction en cours. */
export function connexionPGlite(db: PGlite): Connexion {
  return {
    transaction: (fn) =>
      db.transaction((tx) => fn(async <T>(sql: string, params?: unknown[]) => (await tx.query<T>(sql, params)).rows)),
  }
}
