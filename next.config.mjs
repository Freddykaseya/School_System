/** @type {import('next').NextConfig} */
const nextConfig = {
  // Le centre (de démonstration) peut tourner en même temps qu'un PC d'école
  // sur la même machine : chacun son dossier de compilation.
  distDir: process.env.ERP_MODE === 'centre' ? '.next-centre' : '.next',
  // PGlite (base du PC, fichiers WebAssembly) et pg (base centrale) sont
  // chargés tels quels par Node.js, sans passer par le bundler.
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
}

export default nextConfig
