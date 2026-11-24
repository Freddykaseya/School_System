# ERP Écoles — Nova, CSGO1, CSGO2, CSGO3

Gestion des élèves et des paiements pour le groupe scolaire. Chaque compte est rattaché à **une** école et n'en voit que les données ; l'administrateur voit toutes les écoles.

## Version 1 — périmètre

1. Connexion, et arrivée directe dans son école. **Fait (étape 1)**
2. Grille de frais par école et par classe. *Schéma prêt, montants à confirmer.*
3. Inscription des élèves.
4. Paiements et reçus numérotés (annulation tracée, jamais de suppression).
5. Listes imprimables : élèves en ordre et non en ordre, totaux.
6. Import des fichiers existants (PDF « Tableau de bord », Excel « Restant dû ») avec rapport d'incohérences.
7. Tableau administrateur : toutes les écoles, détail école → classe → élève. **Première version faite**

## Démarrer

Prérequis : Node 22 ou plus, et un projet Supabase.

1. Dans Supabase, ouvrir **SQL Editor** et exécuter dans l'ordre :
   - `supabase/migrations/20261123_0001_schema.sql`
   - `supabase/seeds/0001_referentiel.sql`
   - (plus tard, après confirmation) `supabase/seeds/0002_frais_csgo2_A_CONFIRMER.sql`
2. Copier `.env.example` en `.env.local` et le remplir (Project Settings > API).
3. Installer et lancer :
   ```
   npx pnpm@12.3.4 install
   npx pnpm@12.3.4 dev
   ```
4. Créer le premier compte administrateur :
   ```
   npx pnpm@12.3.4 create-user admin@exemple.cd "MotDePasseSolide" "Administrateur" ADMIN
   ```
   Puis un compte par école, par exemple :
   ```
   npx pnpm@12.3.4 create-user caisse.csgo2@exemple.cd "MotDePasseSolide" "Caisse CSGO2" CAISSIER CSGO2
   ```

## Règles de sécurité appliquées par la base

| Rôle | Voit | Peut |
|---|---|---|
| ADMIN | toutes les écoles | tout configurer (écoles, classes, frais, comptes) |
| DIRECTION | son école | inscrire, accorder une prise en charge, encaisser, annuler un paiement |
| COMPTABLE | son école | inscrire, encaisser, annuler un paiement |
| CAISSIER | son école | encaisser |

- Le numéro de reçu est attribué par la base, à la suite, par école.
- Un paiement ne se modifie pas : on l'annule (motif obligatoire) et on en saisit un nouveau.
- Toute création ou modification d'élève, d'inscription, de paiement, de classe ou de frais est écrite dans `journal_audit`.
- Ce que doit un élève est calculé (vue `situation_inscriptions`), jamais saisi.

## Organisation du code

- `app/login` : connexion.
- `app/(espace)/ecole` : tableau de bord de l'école du compte connecté.
- `app/(espace)/admin` : toutes les écoles, puis `admin/ecoles/[code]` pour le détail.
- `lib/donnees.ts` : lectures (toujours avec la session de l'utilisateur, donc soumises aux règles d'accès).
- `lib/libelles.ts` : tous les textes et formats affichés (prêt pour une seconde langue).
- `supabase/` : schéma et données de départ.
- `docs/analyse-fichiers-csgo2.md` : ce que les fichiers actuels de CSGO2 ont appris.
