import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// Paramètres scrypt recommandés (OWASP). Ils sont écrits dans l'empreinte :
// on pourra les renforcer plus tard sans invalider les anciennes.
const N = 16384
const R = 8
const P = 1
const LONGUEUR = 32

function deriver(motDePasse: string, sel: Buffer, n: number, r: number, p: number, longueur: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(motDePasse.normalize('NFKC'), sel, longueur, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, cle) =>
      err ? reject(err) : resolve(cle),
    ),
  )
}

/** Empreinte d'un mot de passe : « scrypt$N$r$p$sel$cle » (base64). */
export async function empreinte(motDePasse: string): Promise<string> {
  const sel = randomBytes(16)
  const cle = await deriver(motDePasse, sel, N, R, P, LONGUEUR)
  return ['scrypt', N, R, P, sel.toString('base64'), cle.toString('base64')].join('$')
}

export async function verifierMotDePasse(motDePasse: string, stockee: string): Promise<boolean> {
  const [algo, n, r, p, sel, cle] = stockee.split('$')
  if (algo !== 'scrypt' || !sel || !cle) return false
  const attendue = Buffer.from(cle, 'base64')
  const calculee = await deriver(motDePasse, Buffer.from(sel, 'base64'), Number(n), Number(r), Number(p), attendue.length)
  return timingSafeEqual(attendue, calculee)
}
