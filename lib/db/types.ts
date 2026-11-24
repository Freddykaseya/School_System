/** Exécute une requête SQL paramétrée et renvoie ses lignes. */
export type Requete = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>

/** Une base capable d'exécuter une fonction dans une transaction. */
export type Connexion = {
  transaction<T>(fn: (q: Requete) => Promise<T>): Promise<T>
}

/** Ce qu'offrent à la fois PGlite et une de ses transactions. */
export type ExecuteurSql = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
  exec(sql: string): Promise<unknown>
}
