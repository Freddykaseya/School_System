# Blossom School — vision du produit et cahier de design

*Gestion scolaire, même sans internet.*

Ce document décrit ce qu'est l'application, à qui elle sert, comment on s'y déplace et à quoi elle doit ressembler. Il sert de référence pour concevoir le design de chaque écran.

---

## 1. En une phrase

Blossom School est l'application de gestion d'un groupe de quatre écoles (NOVA, CSGO1, CSGO2, CSGO3). Elle tient les élèves, les frais scolaires et les paiements de chaque école, **fonctionne sans internet** sur le PC de l'école et permet à l'administrateur de suivre toutes les écoles.

## 2. Pourquoi elle existe

Aujourd'hui, chaque école suit ses paiements dans des fichiers tenus à la main :
- des PDF « Tableau de bord » (ce que chaque élève a **payé**, mois par mois, une classe par fichier) ;
- un classeur Excel « Restant dû » (ce que chaque élève **doit encore**).

Ces fichiers se contredisent. Dans ceux de CSGO2 (638 élèves dans les PDF, 794 dans l'Excel), on trouve notamment :
- des paiements comptés deux fois (payés dans un fichier, encore dus dans l'autre) ;
- du texte à la place de montants (« 2OOO », « O », « a revoir ») ;
- des totaux tapés à la main et faux, des synthèses différentes du détail ;
- des élèves présents dans un seul fichier, ou dans une autre classe selon le fichier.

Résultat : personne ne sait exactement qui est en ordre, combien a été encaissé, ni combien reste dû.

**Blossom School remplace ces fichiers** : un montant n'est jamais tapé deux fois, ce qu'un élève doit est calculé, un paiement donne un reçu numéroté et ne s'efface jamais.

## 3. Le contexte qui guide toute la conception

| Contrainte | Conséquence pour le design |
|---|---|
| Internet instable dans les écoles | Tout fonctionne hors ligne. Un indicateur discret montre l'état d'envoi (« Dernier envoi : aujourd'hui 18 h 42 » / « 37 opérations en attente »). Jamais d'écran bloqué « pas de connexion ». |
| Un seul PC Windows par école, souvent un portable (écran 1366 × 768) | Mise en page pensée d'abord pour cet écran ; pas de dépendance au téléphone. |
| Personnel peu habitué aux logiciels | Grandes tuiles, une action principale par écran, mots simples, pas de jargon informatique. |
| Montants en francs congolais, souvent à 6 ou 9 chiffres | Chiffres lisibles, séparés par des espaces (« 70 000 FC »), alignés à droite, en chiffres à chasse fixe. |
| Documents à imprimer (rapports, listes, reçus) | Chaque écran de résultat a une version imprimable A4 propre. |
| Langue | Français partout. |

## 4. Les utilisateurs

| Rôle | Qui | Voit | Peut |
|---|---|---|---|
| **Administrateur** | Le responsable du groupe scolaire | Toutes les écoles | Tout : écoles, classes, frais, comptes du personnel, comptabilité de chaque école |
| **Direction** | Le directeur ou la directrice d'une école | Son école uniquement | Inscrire, accorder une prise en charge, encaisser, annuler un paiement, comptabilité |
| **Comptable** | Le comptable d'une école | Son école uniquement | Inscrire, encaisser, annuler un paiement, comptabilité |
| **Caissier** | La personne à la caisse | Son école uniquement | Encaisser |

Un compte est créé par l'administrateur (nom, e-mail, rôle, école) avec un mot de passe provisoire. Il n'y a pas d'inscription libre.

## 5. Le parcours (version 1)

```
Connexion (adresse e-mail + mot de passe)
        │
        ▼
« Choisissez votre école »   ← tout le monde arrive ici
  [CSGO1] [CSGO2] [CSGO3] [NOVA] [ADMIN]
        │
        ├── école à laquelle on n'a pas accès ─► « Votre accès ne vous permet pas
        │                                          d'accéder à ce domaine. »
        │                                          [Revenir au choix de l'école]
        │
        ├── son école (ex. NOVA) ─► Accueil de l'école : des tuiles
        │        [Tableau de bord]  [Comptabilité]  [Personnel*]
        │                              └─ là se passent toutes les opérations
        │                                 comptables de l'école
        │
        └── ADMIN (administrateur seulement) ─► Administration du groupe
                 [Toutes les écoles]  [Comptes et accès]

* Personnel : visible par l'administrateur uniquement.
```

Règles :
- **Toutes les tuiles d'écoles sont visibles par tous.** Le refus intervient au clic, avec un message clair et un bouton de retour, jamais une page blanche.
- La **comptabilité** d'une école est ouverte à la direction, au comptable de cette école et à l'administrateur. Un caissier qui clique reçoit le même message de refus.

## 6. Les écrans

### 6.1 Connexion
Logo, nom « Blossom School », slogan. Deux champs (adresse e-mail, mot de passe) et un bouton « Se connecter ». Messages d'erreur en clair (« Adresse e-mail ou mot de passe incorrect. », « Pas de connexion internet : la première connexion d'un compte sur ce PC doit se faire avec internet. »).

### 6.2 Choisissez votre école
Page plein écran, sans menu. Grand titre centré « Choisissez votre école ». Une rangée de tuiles carrées aux coins très arrondis : une par école (code en majuscules espacées : NOVA, CSGO1…) et une tuile **ADMIN** plus marquée. Le nom complet de l'école apparaît au survol. En haut : logo à gauche, nom de la personne et « Se déconnecter » à droite.

### 6.3 Accès refusé
Icône de cadenas, titre « Votre accès ne vous permet pas d'accéder à ce domaine. », une phrase d'explication (« Votre compte est rattaché à une autre école. » / « La comptabilité est réservée à… »), bouton « Revenir au choix de l'école ».

### 6.4 Accueil d'une école
En-tête : icône de l'école, nom complet, code et rôle de la personne. Question « Que voulez-vous faire ? ». Grille de grandes tuiles (icône, titre, une ligne d'explication) :
- **Tableau de bord** — effectifs et paiements par classe ;
- **Comptabilité** — analyse des fichiers, paiements encaissés, élèves en ordre, rapports ;
- **Personnel** (administrateur) — comptes de l'école.

Tuiles prévues ensuite (même gabarit) : **Élèves** (inscriptions), **Caisse** (encaisser, reçus), **Listes** (élèves en ordre / non en ordre, à imprimer).

À l'intérieur d'une école, des onglets permettent de passer d'un espace à l'autre : Accueil · Tableau de bord · Comptabilité · Personnel.

### 6.5 Tableau de bord de l'école
Quatre indicateurs en haut (élèves inscrits, montant dû, montant payé avec taux de recouvrement, reste à payer). Puis une carte par cycle (Maternelle, Primaire, Éducation de base, Humanités) avec un tableau des classes : élèves, dû, payé, reste, recouvrement (pastille verte ≥ 80 %, orange ≥ 50 %, rouge en dessous).

### 6.6 Comptabilité de l'école (espace principal des opérations)
1. **Dépôt des fichiers** : grande zone « Déposez les fichiers ici, ou cliquez pour les choisir » (plusieurs PDF + un Excel), liste des fichiers ajoutés en pastilles retirables (« 33 PDF · 1 Excel »), choix « Situation arrêtée à la fin de [mois] », bouton « Analyser les fichiers ». Mention : « Les fichiers sont lus puis oubliés : rien n'est enregistré. »
2. **Résultat** :
   - barre d'actions : « Générer le rapport (PDF) » et « Liste des élèves (Excel) » ;
   - indicateurs : élèves, total encaissé, recouvrement à la date choisie, reste dû ; puis en ordre, non en ordre, pris en charge, incohérences ;
   - graphique en barres des encaissements par mois (septembre → juin), une seule couleur, valeur au survol ; tranches et bulletins à côté ;
   - tableau par classe : élèves, payé, reste dû, recouvrement, en ordre, non en ordre, pris en charge, ligne de total ;
   - **incohérences à corriger** : une ligne par type (pastille de gravité « À corriger » / « À vérifier » / « Info », titre, nombre) qui se déplie sur le détail ;
   - liste des élèves : filtres (Tous / Non en ordre / En ordre / Pris en charge), choix de la classe, recherche par nom ; colonnes nom, classe, payé, reste dû, statut, fichiers.
3. **Rapport imprimable (A4)** : en-tête (école, date d'arrêt, date du rapport, fichiers analysés) ; 1. Synthèse ; 2. Encaissements par mois ; 3. Situation par classe ; 4. Incohérences ; 5. Élèves non en ordre, par classe.

À venir dans le même espace : saisie des paiements et reçus numérotés, annulation motivée, import des fichiers dans la base après correction.

### 6.7 Administration (administrateur)
- **Toutes les écoles** : indicateurs du groupe et tableau des écoles (classes, comptes, élèves, dû, payé, reste, recouvrement).
- **Comptes et accès** : une tuile par école (nombre de personnes par rôle, « + Ajouter ») et une tuile **Administrateur** (rose plein). Dans une école : formulaire « Ajouter une personne » (nom, e-mail ; rôle choisi par **cartes** Direction / Comptable / Caissier avec ce que chacun peut faire), mot de passe provisoire affiché une seule fois dans un encadré, puis la liste du personnel (nom, e-mail, rôle, actif/désactivé).
- **Fiche d'une personne** : changer le rôle ou l'école, désactiver, créer un nouveau mot de passe.

## 7. Vocabulaire et données

- **Cycles** : Maternelle (1re–3e), Primaire (1re–6e), Éducation de base (7e–8e), Humanités (1re–4e) avec des options : HP (pédagogie), CG (commerciale et gestion), MG (mécanique générale), MA (mécanique auto), SC (scientifique), TCC (coupe et couture), ELEC (électricité).
- **Frais** : minerval mensuel de septembre à mai (ex. 70 000 FC, 84 000 FC selon la classe), trois tranches dans l'année, un bulletin (2 500 FC).
- **Situation d'un élève** : en ordre / non en ordre (à une date donnée) / pris en charge (minerval offert : mentions « PR », « BONUS », « PROF » dans les fichiers actuels).
- **Paiement** : un reçu numéroté à la suite par école ; un paiement ne se modifie pas, il s'annule avec un motif.
- **Montants** : « 70 000 FC » ; dollars éventuels : « 25,00 $ ».

## 8. Identité visuelle

| Élément | Valeur |
|---|---|
| Nom | **Blossom School** (court : Blossom) |
| Slogan | « Gestion scolaire, même sans internet » |
| Logo | Fleur blanche à cinq pétales, cœur rose, dans un carré arrondi au dégradé rose (#e64980 → #c2255c) |
| Rose principal | **#c2255c** (boutons, liens, éléments actifs) — contraste 5,9:1 avec le blanc |
| Rose foncé | #a61e4d (survol, titres du rapport) |
| Rose pâle | #fdeef4 (fonds actifs, tuiles d'école) · bordure rose #f6c6d9 |
| Fond de page | #f8f4f6 · cartes blanches #ffffff, bordure #e4e9ed |
| Texte | #18242e (principal), #6b7a86 (secondaire), #9aa6af (discret) |
| États | vert #1f8a5b (en ordre, ≥ 80 %), orange #b7791f (à vérifier), rouge #c0463e (non en ordre, refus, à corriger) — toujours accompagnés d'un mot, jamais la couleur seule |
| Police | Inter, sinon Segoe UI (système Windows) ; 14 px de base ; chiffres tabulaires |
| Formes | cartes 10 px d'arrondi, tuiles 16–22 px, pastilles entièrement arrondies |
| Icônes | traits fins (style Lucide) : école, tableau de bord, calculatrice, personnes, bouclier pour l'administration, cadenas pour le refus |

## 9. Principes de design

1. **Des tuiles pour naviguer, des tableaux pour travailler.** Les choix (école, espace) se font par grandes tuiles ; les données se lisent dans des tableaux sobres.
2. **Une action principale par écran**, en rose plein ; les actions secondaires en contour rose.
3. **Toujours dire où l'on est** : fil d'Ariane (Choisir une école · NOVA · Comptabilité) et onglets de l'école.
4. **Jamais d'impasse** : chaque refus ou erreur dit pourquoi et propose un retour.
5. **Les chiffres d'abord** : indicateurs en haut, détail en dessous ; montants alignés à droite.
6. **La couleur n'est jamais seule** : un statut a toujours son mot (« En ordre », « Non en ordre »).
7. **Imprimable** : chaque résultat a sa version A4, sans menu ni boutons.
8. **Rien d'inquiétant hors ligne** : l'absence d'internet est un état normal, signalé calmement.

## 10. Ce que l'application ne fait pas (version 1)

Pas de notes ni de bulletins scolaires, pas d'emploi du temps, pas d'application pour les parents, pas de paiement en ligne. Ces modules pourront venir plus tard, sous forme de nouvelles tuiles dans l'accueil de l'école.

---

## Texte prêt à coller dans un outil de design

> Concevez les écrans de **Blossom School**, application de gestion scolaire en français pour un groupe de quatre écoles en RDC (NOVA, CSGO1, CSGO2, CSGO3), utilisée sur un PC portable Windows (1366 × 768) qui fonctionne souvent sans internet. Identité : rose #c2255c (foncé #a61e4d, pâle #fdeef4), fond #f8f4f6, cartes blanches, texte #18242e, police Inter, logo fleur blanche à cinq pétales dans un carré arrondi rose. Style : grandes tuiles aux coins arrondis pour naviguer, tableaux sobres pour les données, montants en francs congolais alignés à droite (« 70 000 FC »), statuts toujours écrits (En ordre, Non en ordre, Pris en charge) avec pastille verte/orange/rouge. Parcours : connexion → « Choisissez votre école » (tuiles NOVA, CSGO1, CSGO2, CSGO3, ADMIN) → accueil de l'école avec tuiles « Tableau de bord », « Comptabilité », « Personnel » → écran Comptabilité (dépôt de PDF et d'Excel, choix du mois, indicateurs, graphique des encaissements par mois, tableau par classe, incohérences dépliables, liste d'élèves filtrable, bouton « Générer le rapport (PDF) »). Une école non autorisée affiche « Votre accès ne vous permet pas d'accéder à ce domaine. » avec un bouton de retour. Public peu habitué aux logiciels : une action principale par écran, mots simples, jamais d'impasse.
