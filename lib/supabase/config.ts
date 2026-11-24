/** Variables publiques Supabase. `null` tant que .env.local n'est pas rempli :
 * l'application affiche alors un message clair au lieu de planter. */
export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key || url.includes('xxxxxxxx')) return null
  return { url, key }
}
