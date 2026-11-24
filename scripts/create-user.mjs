// Crée un compte et son profil.
//   pnpm create-user <email> <mot_de_passe> "<Nom complet>" <ROLE> [CODE_ECOLE]
// ROLE : ADMIN | DIRECTION | COMPTABLE | CAISSIER. CODE_ECOLE obligatoire sauf ADMIN.
// Exemple : pnpm create-user caisse@csgo2.cd "MotDePasse!2026" "Caisse CSGO2" CAISSIER CSGO2

const [email, password, nom, role, codeEcole] = process.argv.slice(2)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const ROLES = ['ADMIN', 'DIRECTION', 'COMPTABLE', 'CAISSIER']
if (!email || !password || !nom || !ROLES.includes(role) || (role !== 'ADMIN' && !codeEcole)) {
  console.error('Usage : pnpm create-user <email> <mot_de_passe> "<Nom complet>" <ADMIN|DIRECTION|COMPTABLE|CAISSIER> [CODE_ECOLE]')
  process.exit(1)
}
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local')
  process.exit(1)
}
if (password.length < 10) {
  console.error('Mot de passe trop court : 10 caractères minimum.')
  process.exit(1)
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

let ecoleId = null
if (role !== 'ADMIN') {
  const res = await fetch(`${url}/rest/v1/ecoles?code=eq.${encodeURIComponent(codeEcole.toUpperCase())}&select=id`, { headers })
  const rows = await res.json()
  if (!res.ok || !rows[0]) {
    console.error(`École introuvable : ${codeEcole}`)
    process.exit(1)
  }
  ecoleId = rows[0].id
}

const created = await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ email, password, email_confirm: true }),
})
const user = await created.json()
if (!created.ok) {
  console.error('Création du compte impossible :', user.msg ?? user.message ?? created.status)
  process.exit(1)
}

const profil = await fetch(`${url}/rest/v1/profils`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'return=minimal' },
  body: JSON.stringify({ id: user.id, email, nom_complet: nom, role, ecole_id: ecoleId }),
})
if (!profil.ok) {
  console.error('Profil non créé :', await profil.text())
  await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers })
  process.exit(1)
}
console.log(`Compte créé : ${email} (${role}${codeEcole ? ' · ' + codeEcole.toUpperCase() : ''})`)
