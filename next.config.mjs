/** @type {import('next').NextConfig} */
const nextConfig = {
  // Le centre (de démonstration) peut tourner en même temps qu'un PC d'école
  // sur la même machine : chacun son dossier de compilation.
  distDir: process.env.ERP_MODE === 'centre' ? '.next-centre' : '.next',
  // PGlite (base du PC, fichiers WebAssembly), pg (base centrale), pdfjs et
  // exceljs (lecture des fichiers en comptabilité) sont chargés tels quels
  // par Node.js, sans passer par le bundler.
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'pdfjs-dist', 'exceljs'],
  // Pas de bouton d'outils de développement par-dessus l'interface.
  devIndicators: false,
  experimental: {
    // Comptabilité : tous les PDF et l'Excel d'une école en un seul envoi.
    proxyClientMaxBodySize: '50mb',
  },
}

export default nextConfig
