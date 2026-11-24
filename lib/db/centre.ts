import pg from 'pg'

import type { Connexion } from './types.ts'

/** Base centrale (Supabase), en connexion PostgreSQL directe. */
export function connexionCentre(url: string): Connexion {
  const pool = new pg.Pool({ connectionString: url, max: 5 })
  return {
    async transaction(fn) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        const resultat = await fn(async <T>(sql: string, params?: unknown[]) => (await client.query(sql, params)).rows as T[])
        await client.query('commit')
        return resultat
      } catch (e) {
        await client.query('rollback').catch(() => {})
        throw e
      } finally {
        client.release()
      }
    },
  }
}
