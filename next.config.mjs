/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite (base du PC, fichiers WebAssembly) et pg (base centrale) sont
  // chargés tels quels par Node.js, sans passer par le bundler.
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
}

export default nextConfig
