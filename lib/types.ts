export type Cycle = 'MATERNELLE' | 'PRIMAIRE' | 'EDUCATION_BASE' | 'HUMANITES'
export type Role = 'ADMIN' | 'DIRECTION' | 'COMPTABLE' | 'CAISSIER'
export type Devise = 'CDF' | 'USD'

export type Profil = {
  id: string
  email: string
  nom_complet: string
  role: Role
  ecole_id: string | null
  actif: boolean
}

export type Ecole = {
  id: string
  code: string
  nom: string
  cycles: Cycle[]
  devise_defaut: Devise
  actif: boolean
}

export type Classe = {
  id: string
  ecole_id: string
  cycle: Cycle
  niveau: number
  option_code: string | null
  libelle: string
  ordre: number
  actif: boolean
}
