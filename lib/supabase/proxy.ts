import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { supabaseConfig } from './config'

const PUBLIC_PATHS = ['/login']

/**
 * Vérification rapide à chaque navigation : session présente ou non.
 * Les droits (école, rôle) sont vérifiés dans les pages et, surtout, par
 * la base elle-même (Row Level Security).
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.includes(pathname)
  let response = NextResponse.next({ request })

  const config = supabaseConfig()
  if (!config) {
    if (isPublic) return response
    const url = new URL('/login', request.url)
    url.searchParams.set('erreur', 'config')
    return NextResponse.redirect(url)
  }

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
      },
    },
  })

  let connected = false
  try {
    const { data } = await supabase.auth.getClaims()
    connected = typeof data?.claims?.sub === 'string'
  } catch (error) {
    console.error('proxy: lecture de session impossible', error)
  }

  const redirectWith = (url: URL) => {
    const redirect = NextResponse.redirect(url)
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  }

  // /login reste accessible même connecté : un compte désactivé y est
  // renvoyé par les pages, le renvoyer d'ici vers « / » ferait une boucle.
  if (!connected && !isPublic) return redirectWith(new URL('/login', request.url))
  return response
}
