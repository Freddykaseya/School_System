# Blossom School — description détaillée pour la création du design

## 1. Le projet en bref

**Blossom School** (« Gestion scolaire, même sans internet ») est une application de gestion pour un groupe de quatre écoles en République démocratique du Congo : **NOVA**, **CSGO1**, **CSGO2** et **CSGO3**.

Elle sert à :
- gérer les **élèves** et leurs **inscriptions** par classe ;
- gérer les **frais scolaires** et les **paiements** (reçus numérotés) ;
- savoir à tout moment **qui est en ordre de paiement et qui ne l'est pas** ;
- **analyser la comptabilité** de chaque école à partir de ses fichiers actuels (PDF et Excel) et produire des **rapports** ;
- permettre à l'**administrateur** du groupe de suivre toutes les écoles et de gérer le personnel.

Aujourd'hui, les écoles tiennent leurs paiements dans des PDF et des fichiers Excel remplis à la main, qui se contredisent : paiements comptés deux fois, totaux faux, texte à la place de montants, élèves absents d'un fichier. Blossom School remplace ces fichiers.

## 2. Contexte d'utilisation

- **Internet instable** : l'application fonctionne sans internet sur le PC de l'école et envoie ses données au centre quand la connexion revient. L'absence d'internet est un état normal, pas une erreur.
- **Un PC portable Windows par école** (écran typique 1366 × 768). Pas d'usage prévu sur téléphone en version 1.
- **Utilisateurs peu habitués aux logiciels** : il faut des écrans simples, de grandes zones cliquables et des mots courants.
- **Langue** : français uniquement.
- **Monnaie** : franc congolais, avec des montants souvent longs (« 70 000 FC », « 43 474 500 FC »).
- **Impression** : les rapports et les listes s'impriment en A4.

## 3. Les utilisateurs et leurs droits

| Rôle | Qui | Écoles visibles | Ce qu'il peut faire |
|---|---|---|---|
| Administrateur | Responsable du groupe scolaire | Toutes | Tout : écoles, classes, frais, comptes du personnel, comptabilité de toutes les écoles |
| Direction | Directeur ou directrice d'une école | La sienne | Inscrire, accorder une prise en charge, encaisser, annuler un paiement, comptabilité |
| Comptable | Comptable d'une école | La sienne | Inscrire, encaisser, annuler un paiement, comptabilité |
| Caissier | Personne à la caisse | La sienne | Encaisser |

Les comptes sont créés par l'administrateur. Personne ne s'inscrit seul.

## 4. Le parcours

1. **Connexion** avec une adresse e-mail et un mot de passe.
2. **« Choisissez votre école »** : tout le monde arrive ici et voit toutes les écoles, plus une tuile **ADMIN**.
3. Selon le clic :
   - **une école où l'on n'a pas accès** → écran « Votre accès ne vous permet pas d'accéder à ce domaine. » ;
   - **sa propre école** → **accueil de l'école** avec des tuiles : Tableau de bord, **Comptabilité**, Personnel (administrateur seulement), et plus tard Élèves, Caisse, Listes ;
   - **ADMIN** → administration du groupe (administrateur seulement, sinon le même écran de refus).
4. Dans une école, on passe d'un espace à l'autre sans revenir au choix de l'école.

## 5. Les éléments communs à tous les écrans (après le choix de l'école)

- **Navigation** :
  - le logo et le nom Blossom ;
  - l'école en cours (code et nom complet) ;
  - les liens : Choisir une école, Mon école, et pour l'administrateur Toutes les écoles et Comptes et accès ;
  - en bas : le nom et le rôle de la personne connectée, et « Se déconnecter ».
- **Fil d'Ariane** : Choisir une école › NOVA › Comptabilité.
- **Onglets de l'école** : Accueil · Tableau de bord · Comptabilité · Personnel (administrateur).
- **Indicateur de synchronisation**, toujours visible, sous trois états :
  - « Tout est envoyé — dernier envoi aujourd'hui à 18 h 42 » ;
  - « 37 opérations en attente d'envoi » ;
  - alerte si rien n'a été envoyé depuis plus de 2 jours, puis plus de 5 jours.
- **Bannière de démonstration** (administrateur, en démonstration seulement) : « Centre de démonstration : base locale ».

## 6. Les écrans

### E1 — Connexion
- **But** : entrer dans l'application.
- **Contenu** : logo, « Blossom School », slogan ; champs « Adresse e-mail » et « Mot de passe » ; bouton « Se connecter ».
- **États** :
  - pendant la vérification, le bouton affiche « Connexion… » ;
  - erreur : « Adresse e-mail ou mot de passe incorrect. » ;
  - sans internet : « Pas de connexion internet. Ce compte ne s'est encore jamais connecté sur ce PC : la première connexion doit se faire avec internet. » ;
  - compte désactivé : « Ce compte n'est pas actif. Contactez l'administrateur. »

### E2 — Choisissez votre école
- **But** : choisir où travailler.
- **Contenu** :
  - en haut : logo, nom de la personne, « Se déconnecter » ;
  - au centre : grand titre « Choisissez votre école » et cinq tuiles NOVA, CSGO1, CSGO2, CSGO3, ADMIN. La tuile ADMIN se distingue des autres ;
  - au survol d'une tuile : le nom complet, par exemple « Complexe Scolaire Grâce à l'Ouest 2 / Kenya ».
- **Il n'y a pas de menu sur cet écran.**

### E3 — Accès refusé
- **Contenu** :
  - une icône de cadenas ;
  - le titre « Votre accès ne vous permet pas d'accéder à ce domaine. » ;
  - une phrase selon le cas : « Votre compte est rattaché à une autre école. », « La comptabilité est réservée à la direction, à la comptabilité de l'école et à l'administrateur. » ou « Cet espace est réservé à l'administrateur du groupe scolaire. » ;
  - « Si vous pensez que c'est une erreur, contactez l'administrateur. » ;
  - un bouton « Revenir au choix de l'école ».

### E4 — Accueil d'une école
- **En-tête** : nom complet de l'école, son code et le rôle de la personne, par exemple « NOVA · Direction ». Question « Que voulez-vous faire ? ».
- **Tuiles**, chacune avec une icône, un titre et une ligne d'explication :
  - **Tableau de bord** — Effectifs et paiements par classe, taux de recouvrement ;
  - **Comptabilité** — Analyse des fichiers, paiements encaissés, élèves en ordre et rapports. Pour un caissier : « Réservé à la direction et à la comptabilité. » ;
  - **Personnel** (administrateur) — Comptes de l'école et rôles de chacun.
- **Tuiles prévues plus tard**, à dessiner désactivées ou marquées « Bientôt » :
  - **Élèves** — inscriptions ;
  - **Caisse** — encaisser et imprimer un reçu ;
  - **Listes** — élèves en ordre et non en ordre, à imprimer.

### E5 — Tableau de bord de l'école
- **Quatre indicateurs** : élèves inscrits, montant dû, montant payé avec le taux de recouvrement, reste à payer.
- **Une section par cycle** : Maternelle, Primaire, Éducation de base, Humanités. Chacune contient un tableau des classes avec ces colonnes : Classe, Élèves, Dû, Payé, Reste, Recouvrement.
- **Le recouvrement** s'affiche en pastille : vert à partir de 80 %, orange de 50 à 80 %, rouge en dessous.
- **États** :
  - aucune année scolaire active ;
  - aucune classe configurée : « Aucune classe n'est encore configurée pour cette école. » ;
  - classe sans élève : « — ».

### E6 — Comptabilité : déposer les fichiers
- **But** : analyser les fichiers actuels de l'école.
- **Contenu** :
  - titre « Analyser les fichiers de CSGO2 » ;
  - choix « Situation arrêtée à la fin de » (Septembre à Juin) ;
  - **grande zone de dépôt** : « Déposez les fichiers ici, ou cliquez pour les choisir — plusieurs PDF (une classe par fichier) et un fichier Excel .xlsx » ;
  - **liste des fichiers ajoutés**, chaque fichier sous forme de pastille avec une icône PDF ou Excel et une croix pour le retirer ; un compteur « 33 PDF · 1 Excel » et « Tout retirer » ;
  - bouton « Analyser les fichiers » ;
  - mention « Les fichiers sont lus puis oubliés : rien n'est enregistré. »
- **États** :
  - zone vide ;
  - fichier en cours de dépôt (zone en surbrillance) ;
  - analyse en cours : « Analyse en cours… », environ 5 secondes ;
  - erreur : « Aucun fichier exploitable. » ;
  - avertissements : « 2E X.pdf : aucun tableau d'élèves reconnu, fichier ignoré. »

### E7 — Comptabilité : résultat de l'analyse
- **Barre d'actions** : « Résultat · CSGO2 · situation à fin octobre », puis deux boutons : « Liste des élèves (Excel) » et « Générer le rapport (PDF) ».
- **Huit indicateurs** :
  - Élèves : 809 (39 classes · 33 PDF) ;
  - Encaissé : 43 474 500 FC ;
  - Recouvrement à fin octobre : 48,6 % (calculé sur les élèves présents dans les deux fichiers) ;
  - Reste dû à fin octobre ;
  - En ordre : 165 ;
  - Non en ordre : 559 ;
  - Pris en charge : 71 ;
  - Incohérences : 95, dont 22 à corriger.
- **Graphique des encaissements par mois**, de septembre à juin, avec le montant au survol. À côté : les trois tranches et les bulletins.
- **Tableau par classe** : Classe, Élèves, Payé, Reste dû, Recouvrement (pastille), En ordre, Non en ordre, Pris en charge, avec une ligne Total.
- **Incohérences à corriger** : une ligne dépliable par type, avec un niveau (« À corriger », « À vérifier » ou « Info »), un titre et un nombre. Une fois dépliée, la liste des cas, par exemple « MUKENDI JEAN (1re scientifique) — Septembre : 70 000 payés et 70 000 encore dus. »
  - À corriger : paiements comptés deux fois, totaux faux, texte à la place d'un montant, synthèses différentes du détail ;
  - À vérifier : élève dans une autre classe selon le fichier, élèves présents dans un seul fichier, paiement en juin, mois réclamé avant l'inscription, deux fichiers pour la même classe ;
  - Info : noms écrits différemment, classes sans PDF, formules Excel sans résultat.
- **Liste des élèves** :
  - filtres en pastilles : Tous · Non en ordre · En ordre · Pris en charge, chacun avec son nombre ;
  - un choix de la classe et une recherche par nom ;
  - colonnes : Nom, Classe, Payé (année), Reste dû à fin octobre, Statut (pastille), Fichiers (« PDF + Excel ») ;
  - un bouton « Afficher plus ».

### E8 — Rapport imprimable (A4)
- **En-tête** : « Rapport comptable — CSGO2 · Complexe Scolaire Grâce à l'Ouest 2 / Kenya », « Situation arrêtée à fin octobre · rapport établi le 25/11/2026 à 10:30 · 33 PDF et RESTANT DU.xlsx ».
- **Sections** :
  1. Synthèse ;
  2. Encaissements par mois (mois, encaissé, restant dû) ;
  3. Situation par classe ;
  4. Incohérences, par type ;
  5. Élèves non en ordre, classe par classe, avec le montant dû.
- **Mise en page** : sobre, en noir sur blanc avec une touche de la couleur de la marque. Pas de menu ni de bouton.

### E9 — Administration : toutes les écoles
- **Indicateurs du groupe** : nombre d'écoles, élèves, montant payé, recouvrement.
- **Tableau des écoles** : École (code et nom), Cycles, Classes (avec « à configurer » s'il n'y en a aucune), Comptes, Élèves, Dû, Payé, Reste, Recouvrement.

### E10 — Comptes et accès
- **Tuiles** : une par école, avec le code, le nom, le nombre de personnes actives par rôle et « + Ajouter ». Une tuile **Administrateur** distincte.

### E11 — Personnel d'une école
- **Formulaire « Ajouter une personne à CSGO2 »** :
  - nom complet et adresse e-mail ;
  - choix du rôle par **trois cartes** : Direction, Comptable, Caissier, chacune avec une icône et une phrase sur ce qu'elle permet ;
  - bouton « Ajouter à CSGO2 ».
- **Après l'ajout** : un encadré « Compte créé pour caisse@csgo2.cd. Mot de passe provisoire à transmettre : **Kx7m-Pq4r-Zt9w**. Il ne sera plus affiché. »
- **Liste du personnel** : Nom, E-mail, Rôle, État (Actif ou Désactivé), Créé le.
- **Erreurs possibles** : « Un compte existe déjà avec cette adresse e-mail. », « Choisissez l'école de cette personne. »

### E12 — Fiche d'une personne
- **Contenu** :
  - nom, e-mail, date de création ;
  - pour modifier : nom, rôle, école, compte actif ou désactivé, bouton « Enregistrer » ;
  - un bloc « Mot de passe » avec « Créer un nouveau mot de passe », qui demande une confirmation.
- **Cas particulier** : l'administrateur qui regarde son propre compte ne peut ni changer son rôle ni se désactiver. Un message l'explique.

### À venir (à dessiner si possible)
- **Élèves** :
  - la liste ;
  - l'inscription : nom, postnom, prénom, sexe, date de naissance, responsable et téléphone, classe, mois d'inscription, prise en charge éventuelle.
- **Caisse** :
  - rechercher un élève ;
  - voir ce qu'il doit, mois par mois ;
  - saisir un montant, choisir le mode (espèces, mobile money, banque) ;
  - imprimer un **reçu numéroté** ;
  - annuler un paiement, avec un motif obligatoire.
- **Listes imprimables** : élèves en ordre et non en ordre, par classe, avec les totaux.

## 7. Données d'exemple (inventées)

- **Écoles** :
  - NOVA — École Nova (maternelle) ;
  - CSGO1, CSGO2, CSGO3 — Complexe Scolaire Grâce à l'Ouest 1, 2 / Kenya et 3 (de la maternelle aux humanités).
- **Classes** :
  - 1re–3e maternelle, 1re–6e primaire, 7e–8e éducation de base ;
  - 1re–4e humanités, avec les options HP, CG, MG (mécanique générale), MA (mécanique auto), SC, TCC (coupe et couture), ELEC.
- **Frais** :
  - minerval mensuel de septembre à mai, de 70 000 FC à 84 000 FC selon la classe (145 000 FC en 4e humanités) ;
  - trois tranches de 9 000 à 22 500 FC ;
  - bulletin à 2 500 FC.
- **Élèves fictifs** : KABEYA MUKENDI GRACE, ILUNGA MWAMBA JOËL, NGOY KASONGO SARAH. Les mentions « PR », « BONUS » ou « PROF » signalent une prise en charge.
- **Personnel fictif** : Marie Kabila (Caissier, CSGO2), Jean Mukendi (Comptable, CSGO2), Grace Mbuyi (Direction, NOVA).

## 8. Identité imposée

- **Nom** : Blossom School (version courte : Blossom).
- **Slogan** : « Gestion scolaire, même sans internet ».
- **Couleur de la marque : le rose.** Le reste (nuances, typographie, formes, icônes, logo) est **libre**.
- **Règle à respecter** : un statut est toujours écrit en toutes lettres (« En ordre », « Non en ordre »), jamais signalé par la seule couleur.

## 9. Ce que j'attends en retour

Pour chaque écran E1 à E12, et les écrans « à venir » si possible :
- une **image** au format PNG en 1366 × 768, ou un **lien Figma**, ou un **export HTML** ;
- les **états importants** : vide, chargement, erreur, refus, hors ligne ;
- la **version imprimée** du rapport (E8) ;
- les **couleurs, polices et arrondis** retenus, si l'outil les fournit.
