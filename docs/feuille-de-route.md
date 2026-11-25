# Blossom School — feuille de route (validée le 25/11/2026)

Objectif : le système scolaire complet, de A à Z. **Un dossier unique par élève**, alimenté par chacun depuis sa place (caisse, enseignant, direction, parents) ; on ne saisit qu'une fois ; tout marche sans internet ; rien ne s'efface.

Chaque étape est livrée, testée et utilisable avant de passer à la suivante. Chaque module apparaît comme une **tuile** dans l'accueil de l'école.

| Étape | Contenu | État |
|---|---|---|
| **0. Socle** | Base hors ligne par PC (PGlite), règles d'accès par école et par rôle, journal d'audit, comptes et accès, choix de l'école, refus d'accès, analyse comptable des anciens fichiers et rapport | ✅ Fait |
| **1. Design Blossom** | Système de design (couleurs, typographie, composants, états), appliqué à tous les écrans existants, vérifié par captures d'écran (`scripts/captures.mjs`) | ✅ Fait (à affiner avec tes retours) |
| **2. Cycle de l'argent** | Grille de frais par classe (admin) · Élèves et inscriptions · Caisse : encaisser, reçu numéroté imprimé, annulation motivée · Listes imprimables (en ordre / non en ordre) · Clôture de caisse du jour | ⏳ En cours — grille de frais faite (FC et $, minerval mensuel) |
| **3. Synchronisation et installation** | Base centrale Supabase réelle · Envoi automatique PC → centre dès qu'internet revient · Réception de la configuration · Installateur Windows en un clic · Mises à jour automatiques · Sauvegarde quotidienne | À faire |
| **4. Reprise de l'existant** | Import dans la base des élèves et paiements des anciens fichiers (après correction des incohérences relevées par l'analyse) | À faire |
| **5. Parents** | Reçus, relances polies et absences par SMS / WhatsApp | À faire |
| **6. Mobile money** | Paiements M-Pesa, Orange Money, Airtel Money rattachés automatiquement à l'élève | À faire |
| **7. Pédagogie** | Présences (téléphone de l'enseignant) · Cotes par matière et période · Bulletins au format RDC · Suivi ENAFEP / Exetat · Emplois du temps | À faire |
| **8. Personnel et dépenses** | Fiches du personnel, présences, salaires, avances · Dépenses de l'école · Résultat mensuel (recettes − dépenses) | À faire |
| **9. Pilotage et espace parent** | Tableau du groupe : effectifs, encaissements, dépenses, résultats scolaires, alertes, comparaison d'une année à l'autre · Rapports aux propriétaires · Espace parent sur téléphone | À faire |

## Décisions à prendre avec les écoles (avant l'étape concernée)

- **Étape 2 — décidé le 25/11/2026** :
  - la grille de frais est fixée par l'**administrateur** (la direction, la comptabilité et la caisse la consultent) ;
  - monnaies : **francs congolais et dollars** ; chaque frais a sa monnaie et les totaux restent séparés par monnaie ;
  - le minerval est **mensuel** : un élève est en ordre s'il a payé tous les mois échus jusqu'au mois en cours ; tranches et bulletin ont chacun leur mois d'échéance.
  - Reste ouvert : paiement d'un frais en FC avec des dollars (taux du jour ?) ; la mensualité de 78 000 FC vue chez une dizaine d'élèves.
- **Étape 3** : création du projet Supabase (compte, région) ; budget pour l'offre avec sauvegardes.
- **Étape 5** : fournisseur SMS / WhatsApp et son coût par message.
- **Étape 6** : contrats marchands avec les opérateurs de mobile money.
- **Étape 7** : modèle officiel des bulletins utilisé par les écoles ; liste des matières et pondérations par classe.
