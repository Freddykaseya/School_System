import type { Metadata } from 'next'
import { Lexend, Source_Sans_3 } from 'next/font/google'

import { MARQUE } from '@/lib/marque'

import './globals.css'

// Polices téléchargées à la compilation et servies par l'application :
// aucune connexion à internet n'est nécessaire sur le PC de l'école.
// Lexend (titres) est conçue pour faciliter la lecture ; Source Sans 3
// (texte) reste lisible en petite taille et a des chiffres alignés.
const titres = Lexend({ subsets: ['latin'], variable: '--police-titres', display: 'swap' })
const texte = Source_Sans_3({ subsets: ['latin'], variable: '--police-texte', display: 'swap' })

export const metadata: Metadata = {
  title: MARQUE.complet,
  description: `${MARQUE.slogan} — ${MARQUE.ecoles}`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${titres.variable} ${texte.variable}`}>
      <body>{children}</body>
    </html>
  )
}
