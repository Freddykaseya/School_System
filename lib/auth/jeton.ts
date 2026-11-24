import { createHmac, timingSafeEqual } from 'node:crypto'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function signature(corps: string, secret: string): string {
  return createHmac('sha256', secret).update(corps).digest('base64url')
}

/** Jeton de session du PC : « <utilisateur>.<expiration>.<signature> ». */
export function signerJeton(userId: string, secret: string, dureeSecondes: number, maintenant = Date.now()): string {
  const expiration = Math.floor(maintenant / 1000) + dureeSecondes
  const corps = `${userId}.${expiration}`
  return `${corps}.${signature(corps, secret)}`
}

/** Utilisateur du jeton, ou null s'il est faux, modifié ou expiré. */
export function verifierJeton(jeton: string | undefined, secret: string, maintenant = Date.now()): string | null {
  if (!jeton) return null
  const [userId, expiration, sig] = jeton.split('.')
  if (!userId || !expiration || !sig || !UUID.test(userId)) return null
  const attendue = Buffer.from(signature(`${userId}.${expiration}`, secret))
  const recue = Buffer.from(sig)
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null
  if (Number(expiration) * 1000 < maintenant) return null
  return userId
}
