// Lance l'application dans un mode donné, sur toutes les plateformes :
//   node scripts/lancer.mjs <ecole|centre> [port]
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const [mode = 'ecole', port = mode === 'centre' ? '3001' : '3000'] = process.argv.slice(2)
if (!['ecole', 'centre'].includes(mode)) {
  console.error('Usage : node scripts/lancer.mjs <ecole|centre> [port]')
  process.exit(1)
}
const next = createRequire(import.meta.url).resolve('next/dist/bin/next')
const enfant = spawn(process.execPath, [next, 'dev', '-p', port], { stdio: 'inherit', env: { ...process.env, ERP_MODE: mode } })
enfant.on('exit', (code) => process.exit(code ?? 0))
