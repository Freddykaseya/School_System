import { LoginForm } from './login-form'

const MESSAGES: Record<string, string> = {
  config: 'La base de données n’est pas encore configurée : remplissez le fichier .env.local (voir README).',
  compte: 'Ce compte n’est pas actif ou n’est rattaché à aucun profil. Contactez l’administrateur.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams
  return (
    <main className="login-page">
      <LoginForm messageInitial={erreur ? (MESSAGES[erreur] ?? null) : null} />
    </main>
  )
}
