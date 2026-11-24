# Blossom School — Nova, CSGO1, CSGO2, CSGO3

*Gestion scolaire, même sans internet.* Nom et couleur (rose) : `lib/marque.ts` et `app/globals.css`.

Gestion des élèves et des paiements pour le groupe scolaire. Chaque compte est rattaché à **une** école et n'en voit que les données ; l'administrateur voit toutes les écoles.

## Version 1 — périmètre

1. Connexion, et arrivée directe dans son école. **Fait (étape 1)**
2. Grille de frais par école et par classe. *Schéma prêt, montants à confirmer.*
3. Inscription des élèves.
4. Paiements et reçus numérotés (annulation tracée, jamais de suppression).
5. Listes imprimables : élèves en ordre et non en ordre, totaux.
6. Import des fichiers existants (PDF « Tableau de bord », Excel « Restant dû ») avec rapport d'incohérences.
7. Tableau administrateur : toutes les écoles, détail école → classe → élève. **Première version faite**

## Fonctionnement : un PC par école, sans internet

Internet est instable dans les écoles. L'application tourne donc **sur le PC de chaque école** (mode `ecole`, par défaut), avec sa propre base PostgreSQL intégrée (PGlite) : on inscrit, encaisse et imprime sans connexion. Quand le PC est connecté, il échange avec la **base centrale** (Supabase), où l'administrateur voit toutes les écoles (mode `centre`).

- **Même schéma partout** : `supabase/migrations/` est exécuté au centre et sur chaque PC ; les mêmes règles d'accès s'appliquent hors ligne.
- **Première connexion d'un compte sur un PC : avec internet.** Le centre vérifie le mot de passe et envoie l'école, ses classes et ses frais ; le PC garde l'empreinte du mot de passe. Ensuite, la connexion marche sans internet.
- **Un PC appartient à une école** : la première connexion le rattache ; un compte d'une autre école y est refusé, le compte administrateur aussi (il s'utilise en ligne).
- **Opérations à envoyer** : chaque création ou modification (élève, inscription, paiement, journal) est notée dans `local.a_envoyer`. *L'envoi automatique au centre est la prochaine étape.*
- La base du PC est mise à jour toute seule au démarrage (`local.migrations`).

## Démarrer

Prérequis : Node 22 ou plus.

```
npx pnpm@12.3.4 install
```

### Essayer sur un PC d'école, sans base centrale

```
npx pnpm@12.3.4 poste:init CSGO2 direction@csgo2.cd "MotDePasse!2026" "Direction CSGO2" DIRECTION --frais-a-confirmer
npx pnpm@12.3.4 dev                 # http://localhost:3000
```

La base locale est créée dans `donnees-locales/` (ou `ERP_DONNEES`). L'application doit être arrêtée pendant `poste:init` : une seule ouverture de la base à la fois (verrou `donnees-locales.verrou`).

### Essayer l'administration (centre de démonstration)

Tant que la base Supabase n'existe pas, le centre tourne sur une base locale (`donnees-centre-demo/`) :

```
npx pnpm@12.3.4 centre:init admin@groupe.cd "MotDePasse!2026" "Administrateur" --frais-a-confirmer
npx pnpm@12.3.4 dev:centre          # http://localhost:3001 (ou : node scripts/lancer.mjs centre 3002)
```

**Comptes et accès** : l'administrateur ajoute une personne (nom, e-mail, rôle, école) ; un mot de passe provisoire est créé et affiché une seule fois. Il peut ensuite changer le rôle ou l'école, désactiver le compte ou créer un nouveau mot de passe. Chaque changement est écrit dans le journal. Un compte d'école n'accède qu'à son école ; seul l'administrateur voit toutes les écoles.

### Base centrale (Supabase)

1. Dans Supabase, **SQL Editor**, exécuter dans l'ordre :
   - `supabase/migrations/*.sql` (par ordre de nom) ;
   - `supabase/seeds/0001_referentiel.sql` ;
   - (après confirmation) `supabase/seeds/0002_frais_csgo2_A_CONFIRMER.sql`.
2. Copier `.env.example` en `.env.local` et le remplir.
3. Créer les comptes :
   ```
   npx pnpm@12.3.4 create-user admin@exemple.cd "MotDePasseSolide" "Administrateur" ADMIN
   npx pnpm@12.3.4 create-user caisse.csgo2@exemple.cd "MotDePasseSolide" "Caisse CSGO2" CAISSIER CSGO2
   ```
4. Serveur de l'administrateur : `ERP_MODE=centre`, `DATABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` (l'écran « Comptes et accès » crée alors les comptes dans Supabase Auth).

### Tests

```
npx pnpm@12.3.4 test       # tests unitaires et poste hors ligne (PGlite)
npx pnpm@12.3.4 test:db    # règles du schéma
npx pnpm@12.3.4 typecheck
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
- `lib/donnees.ts` : lectures en SQL, toujours avec l'identité de l'utilisateur (`lib/db/en-tant-que.ts`), donc soumises aux règles d'accès.
- `lib/db/` : base du PC (PGlite, migrations, verrou) et base centrale (PostgreSQL).
- `lib/comptabilite/` : lecture des PDF « Tableau de bord » et de l'Excel « Restant dû », rapprochement, incohérences, rapport (espace Comptabilité de chaque école).
- `lib/acces.ts` : qui peut entrer dans quelle école et dans quel espace (sinon « Votre accès ne vous permet pas d'accéder à ce domaine »).
- `docs/vision-produit.md` : vision du produit et cahier de design.
- `lib/comptes/` : gestion des comptes par l'administrateur (règles, identités Supabase ou locales).
- `lib/poste/` : propre au PC de l'école — identifiants hors ligne, réception de la configuration du centre.
- `db/local/` : SQL propre au PC (équivalent local de Supabase Auth, opérations à envoyer).
- `lib/libelles.ts` : tous les textes et formats affichés (prêt pour une seconde langue).
- `supabase/` : schéma commun (centre et PC) et données de départ.
- `docs/analyse-fichiers-csgo2.md` : ce que les fichiers actuels de CSGO2 ont appris.
