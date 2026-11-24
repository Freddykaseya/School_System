import { NextResponse, type NextRequest } from 'next/server'

import { COOKIE_SESSION } from '@/lib/auth/constantes'
import { MODE } from '@/lib/mode'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Vérification rapide à chaque navigation : une session est-elle présente ?
 * La vérification complète (signature, compte actif, école) est faite par
 * les pages (lib/session.ts), et les droits par la base elle-même.
 * /login reste toujours accessible : renvoyer d'office un compte connecté
 * vers l'accueil créerait une boucle pour un compte désactivé.
 */
export async function proxy(request: NextRequest) {
  if (MODE === 'centre') return updateSession(request)

  if (request.nextUrl.pathname === '/login' || request.cookies.has(COOKIE_SESSION)) return NextResponse.next()
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'],
}
