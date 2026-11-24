import type { Connexion, Requete } from './types.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Exécute `fn` avec l'identité d'un utilisateur, dans une transaction :
 * la base applique alors ses règles d'accès (une école ne voit que ses
 * données, un caissier ne peut qu'encaisser...). C'est ce que fait Supabase
 * pour chaque appel ; on le fait nous-mêmes, au centre comme sur le PC.
 */
export function enTantQue<T>(connexion: Connexion, userId: string, fn: (q: Requete) => Promise<T>): Promise<T> {
  if (!UUID.test(userId)) return Promise.reject(new Error('Identifiant utilisateur invalide.'))
  return connexion.transaction(async (q) => {
    await q('set local role authenticated')
    await q(
      `select set_config('request.jwt.claim.sub', $1, true),
              set_config('request.jwt.claims', $2, true)`,
      [userId, JSON.stringify({ sub: userId, role: 'authenticated' })],
    )
    return fn(q)
  })
}
