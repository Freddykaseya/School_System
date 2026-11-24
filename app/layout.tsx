import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'ERP Écoles',
  description: 'Gestion des élèves et des paiements — Nova, CSGO1, CSGO2, CSGO3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
