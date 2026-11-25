// Captures d'écran de l'application (contrôle visuel du design).
//   node scripts/captures.mjs <url de base> <dossier de sortie> <email> <mot de passe> [pages...]
// Utilise le Chrome (ou Edge) déjà installé, en arrière-plan, au format 1366 × 768.
import fs from 'node:fs'
import path from 'node:path'

import puppeteer from 'puppeteer-core'

const [base, sortie, email, motDePasse, ...pages] = process.argv.slice(2)
const NAVIGATEURS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]
const executablePath = NAVIGATEURS.find((p) => fs.existsSync(p))
if (!base || !sortie || !executablePath) {
  console.error('Usage : node scripts/captures.mjs <url> <dossier> <email> <mot de passe> [pages...]')
  process.exit(1)
}
fs.mkdirSync(sortie, { recursive: true })
const nom = (p) => (p === '/' ? 'accueil' : p.replace(/^\//, '').replace(/[/?=&]/g, '_'))

const navigateur = await puppeteer.launch({ executablePath, headless: true, defaultViewport: { width: 1366, height: 768 } })
try {
  const page = await navigateur.newPage()
  await page.goto(`${base}/login`, { waitUntil: 'networkidle0' })
  await page.screenshot({ path: path.join(sortie, '00-login.png') })
  if (email) {
    await page.type('input[name=email]', email)
    await page.type('input[name=mot_de_passe]', motDePasse)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type=submit]')])
  }
  let i = 1
  for (const p of pages.length ? pages : ['/choisir']) {
    await page.goto(base + p, { waitUntil: 'networkidle0' })
    // Comptabilité : avec CAPTURE_FICHIERS=<dossier>, dépose les fichiers et lance l'analyse.
    const dossier = process.env.CAPTURE_FICHIERS
    if (dossier && p.endsWith('/comptabilite')) {
      const fichiers = fs.readdirSync(dossier).filter((f) => /\.(pdf|xlsx)$/i.test(f)).map((f) => path.join(dossier, f))
      const entree = await page.$('input[type=file]')
      await entree.uploadFile(...fichiers)
      await page.click('.form-actions .primary')
      await page.waitForSelector('.barre-actions', { timeout: 120_000 })
    }
    const fichier = path.join(sortie, `${String(i++).padStart(2, '0')}-${nom(p)}.png`)
    await page.screenshot({ path: fichier, fullPage: true })
    console.log(fichier)
  }
} finally {
  await navigateur.close()
}
