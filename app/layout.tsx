import type { Metadata } from 'next'

import { MARQUE } from '@/lib/marque'

import './globals.css'

export const metadata: Metadata = {
  title: MARQUE.complet,
  description: `${MARQUE.slogan} — ${MARQUE.ecoles}`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
