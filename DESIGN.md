---
name: Cartes de France
description: Cartes de la France par région, département et commune, lavées au carmin comme un plan cadastral.
colors:
  sapin: '#1f4a3d'
  sapin-deep: '#163a2f'
  sapin-line: '#4f7366'
  on-sapin: '#f3f6f4'
  on-sapin-soft: '#c6d6cf'
  carmine: '#8c2440'
  carmine-tint: '#f7e6e8'
  wash-1: '#f7e6e8'
  wash-2: '#efc9ce'
  wash-3: '#e1a0aa'
  wash-4: '#cd6f7f'
  wash-5: '#b4425a'
  wash-6: '#8c2440'
  wash-7: '#5f1229'
  no-data: '#e5e9ee'
  ground: '#f3f5f8'
  plate: '#ffffff'
  ink: '#26231e'
  ink-soft: '#5b564e'
  hairline: '#dcded8'
  hairline-strong: '#c4c7c0'
typography:
  display:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '46px'
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: '-0.01em'
    fontFeature: 'tnum'
  headline:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '30px'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '0.04em'
  year:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '30px'
    fontWeight: 700
    lineHeight: 1
    fontFeature: 'tnum'
  title:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '17px'
    fontWeight: 700
  body:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: 'tnum'
  control:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '15px'
    fontWeight: 600
  label:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '14px'
    fontWeight: 400
  caption:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '13px'
    fontWeight: 400
  wordmark:
    fontFamily: "'Source Sans 3 Variable', 'Source Sans 3', system-ui, sans-serif"
    fontSize: '15px'
    fontWeight: 700
    letterSpacing: '0.14em'
rounded:
  hair: '1px'
  inner: '2px'
  base: '4px'
  round: '50%'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '24px'
  '6': '32px'
components:
  band:
    backgroundColor: '{colors.sapin}'
    textColor: '{colors.on-sapin}'
    height: '60px'
    padding: '0 24px'
  segmented-option:
    textColor: '{colors.on-sapin-soft}'
    rounded: '{rounded.inner}'
    padding: '6px 12px'
  segmented-option-hover:
    backgroundColor: '{colors.sapin-deep}'
    textColor: '{colors.on-sapin}'
  segmented-option-on:
    backgroundColor: '{colors.on-sapin}'
    textColor: '{colors.sapin}'
    rounded: '{rounded.inner}'
  indicator-picker:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.sapin}'
    rounded: '{rounded.base}'
    height: 44px
    padding: '0 12px 0 16px'
  search-field:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.ink}'
    rounded: '{rounded.base}'
    height: '38px'
    padding: '0 12px'
  legend-plate:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.ink}'
    rounded: '{rounded.base}'
    padding: '16px 24px'
    width: '440px'
  fiche-panel:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.ink}'
    padding: '32px'
    width: '420px'
  play-button:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.sapin}'
    rounded: '{rounded.round}'
    size: '40px'
  play-button-active:
    backgroundColor: '{colors.sapin}'
    textColor: '{colors.on-sapin}'
  icon-button:
    backgroundColor: '{colors.plate}'
    textColor: '{colors.ink-soft}'
    rounded: '{rounded.base}'
    size: '36px'
  icon-button-hover:
    backgroundColor: '{colors.ground}'
    textColor: '{colors.ink}'
  map-tip:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.plate}'
    rounded: '{rounded.base}'
    padding: '4px 8px'
---

# Design System: Cartes de France

## Overview

**Creative North Star: "Le plan cadastral lavé"**

La carte est une planche du cadastre napoléonien : chaque territoire est lavé au carmin, comme le plan colorié à la main que chaque commune garde encore dans ses archives, et la classe se lit à la profondeur du lavis. Tout le reste est l'outillage du géomètre : un bandeau vert sapin, de l'encre, du papier blanc, des filets fins. La carte occupe tout l'écran ; la légende et la fiche sont des planches posées dessus, pas des widgets.

Le système refuse le défaut de la catégorie : pas de fond de carte gris, pas de barre latérale de réglages, pas de rampe bleue, pas de cartes KPI. La densité vient des tableaux à filets (rangs, parts, tous les indicateurs), pas de tuiles. Le monde est clair uniquement, par direction : il n'y a pas de thème sombre (`color-scheme: light`).

**Key Characteristics:**

- La couleur est réservée aux données : lavis carmin sur la carte, valeur carmin dans la fiche, courbe carmin. Le chrome n'utilise que le vert sapin, l'encre et le blanc.
- Fond blanc froid, délibérément pas crème.
- Des coutures blanches entre territoires, jamais de contours noirs.
- Une seule linéale de travail, chiffres tabulaires partout ; noms de territoires en capitales espacées.
- Aucune ombre au-delà d'un filet ; rayon de 4px, feuille mobile comprise.

## Colors

Une palette d'archive : vert sapin pour l'outillage, carmin pour la donnée, encre brun-noir sur papier blanc froid.

### Primary

- **Vert sapin** (sapin) : la seule couleur du chrome, complémentaire du carmin, le vert des bois et des prés sur les cartes anciennes. Il a remplacé le bleu de Prusse (#1f3a5f) du premier jet, le 09/11/2026. Bandeau supérieur, contrôles du bandeau, bouton lecture, curseur et année du défilement, lien, anneau de focus, tracé de la sélection et limites du niveau parent sur la carte, valeur et coche du sélecteur d'indicateur, curseur du graphique.
- **Sapin profond** (sapin-deep) : survol des options et du sélecteur dans le bandeau.
- **Trait de sapin** (sapin-line) : bordure du contrôle segmenté, du sélecteur et du menu mobile ; soulignement des liens au repos.
- **Blanc sur sapin** (on-sapin) et **Vert pâle sur sapin** (on-sapin-soft) : texte du bandeau, actif et inactif.

### Secondary

- **Carmin** (carmine) : la donnée lue. Valeur principale de la fiche, ligne et points du graphique, ligne de l'indicateur courant dans le tableau de tous les indicateurs.
- **Teinte carmin** (carmine-tint) : aire sous la courbe et sélection de texte.

### Tertiary : le lavis

- **Lavis carmin** (wash-1 à wash-7) : sept jalons, du rose pâle au carmin brûlé, interpolés linéairement sur autant de classes de Jenks que les fichiers publiés en contiennent (17 pour les départements et les communes, 13 pour les régions). Le contrat prévoyait six marches ; le nombre de classes publiées en a fait une rampe continue. La source de vérité est `web/src/palette.ts`, qui alimente à la fois l'expression MapLibre (via `feature-state`) et les cases de la légende.
- **Sans donnée** (no-data) : gris bleuté neutre pour un territoire sans valeur ; il ne doit jamais se confondre avec la classe la plus faible.

### Neutral

- **Fond froid** (ground) : fond de la carte et de l'application, survol des listes et boutons-icônes.
- **Planche** (plate) : surface de la légende, de la fiche, de la recherche ; couleur des coutures entre territoires.
- **Encre** (ink) : texte courant, info-bulle de survol, contour de survol sur la carte, marque de classe dans la rampe.
- **Encre douce** (ink-soft) : texte secondaire, unités, contexte, graduations.
- **Filet** (hairline) et **Filet appuyé** (hairline-strong) : règles des tableaux, bordures des planches, piste du curseur, poignée de la feuille, barres de défilement.

### Named Rules

**The Data Owns Colour Rule.** Le carmin et son lavis ne servent qu'à la donnée. Aucun bouton, aucun état, aucune décoration ne prend du carmin ; le chrome reste sapin, encre et blanc.

**The Paper Seam Rule.** Les territoires se séparent par des coutures blanches (0,8 à 2px selon le zoom, 0,3 à 1px pour les communes), jamais par des contours sombres. Les limites du niveau parent sont un trait fin de sapin à 85 % (0,9 à 2px selon le zoom), posé sur les coutures et qui dessine aussi les côtes. Les régions étant la fusion des départements simplifiés, ce trait tombe exactement sur les coutures. Seuls le survol (encre, 1,5px) et la sélection (sapin, 3px) tracent une ligne colorée.

**The Cool Paper Rule.** Le fond est blanc froid, jamais crème ni beige.

## Typography

**Display Font:** Source Sans 3 Variable (avec Source Sans 3, system-ui)
**Body Font:** la même

**Character:** une seule linéale de travail, sobre et lisible, en chiffres tabulaires sur tout le document pour que les colonnes de valeurs s'alignent. Le seul ornement est le lettrage du cadastre : noms de territoires et marque en capitales espacées.

### Hierarchy

- **Display** (700, 46px, 1,05, -0,01em ; 36px sur téléphone) : la valeur principale de la fiche, en carmin, unité à 26px.
- **Headline** (700, 30px, 1,1, 0,04em, capitales ; 24px sur téléphone) : le nom du territoire dans la fiche.
- **Year** (700, 30px, 1 ; 24px sur téléphone) : l'année courante du défilement, en vert sapin.
- **Title** (700, 17px) : titre de la légende (indicateur, puis niveau en encre douce).
- **Body** (400, 16px, 1,4) : texte courant, champ de recherche, phrase sous la valeur.
- **Control** (600, 15px) : sélecteur d'indicateur, option active du segmenté ; tableaux de la fiche à 15px.
- **Label** (400, 14px) : unité de la légende, extrémités de la rampe, contexte de recherche, légende du graphique.
- **Caption** (400, 13px ; 12px pour les crédits et l'attribution) : en-têtes de tableaux, bornes du curseur, pied de rampe.
- **Wordmark** (700, 15px, 0,14em, capitales) : « Cartes de France » dans le bandeau.

### Named Rules

**The Cadastre Lettering Rule.** Les capitales espacées sont réservées aux noms propres : nom du territoire (fiche et info-bulle, 0,04 à 0,06em) et marque (0,14em). Jamais pour une étiquette de section ou un sur-titre.

**The Tabular Rule.** `font-variant-numeric: tabular-nums` est posé sur le corps du document ; toute nouvelle surface en hérite.

## Layout

La carte remplit tout ce qui reste sous le bandeau (grille `auto 1fr`, hauteur `100dvh`, pas de défilement de page). Le bandeau fait 60px de haut minimum avec 24px de marge latérale : marque à gauche, recherche (360px max), puis à droite le contrôle segmenté des niveaux et le sélecteur d'indicateur.

Les planches flottent sur la carte : légende en bas à gauche à 24px des bords (440px de large, 380px minimum), fiche en panneau de 420px collé à droite, sur toute la hauteur, affichée seulement quand un territoire est sélectionné. Les contrôles MapLibre se décalent de la largeur de la fiche.

Rythme d'espacement sur une échelle de 4px (4, 8, 12, 16, 24, 32). La fiche respire à 32px ; la légende à 16/24px.

Points de rupture :

- **768 à 1060px** : le bandeau passe sur deux lignes, la recherche s'étire.
- **767px et moins (téléphone)** : la marque devient invisible (conservée pour les lecteurs d'écran), le bandeau tient la recherche et un bouton menu qui ouvre niveaux et indicateur sous le bandeau ; la légende se colle au bas de l'écran, pleine largeur, filet en haut, rayon nul, avec la marge de sécurité ; la fiche devient une feuille basse à mi-hauteur (52 %) qui contient nom, valeur, rangs et tendance sans défilement, et se déplie à pleine hauteur ; quand la fiche est ouverte, la légende se réduit au seul défilement des années.

## Elevation & Depth

Le système est plat. Il n'y a aucune ombre portée : la profondeur se lit par superposition de planches blanches bordées d'un filet sur la carte, et par l'ordre d'empilement (carte, légende, fiche, bandeau). Les ombres par défaut des contrôles MapLibre sont explicitement supprimées et remplacées par un filet. Le seul `box-shadow` du système est un anneau de 1px en vert sapin autour du curseur du défilement, qui fait office de filet.

### Named Rules

**The Hairline-Only Rule.** Une surface se détache par un filet de 1px (hairline ou hairline-strong), jamais par une ombre, un flou ou un dégradé.

## Shapes

Coins légèrement adoucis à 4px partout où une surface ou un contrôle a un rayon : planches, champs, menus, info-bulle, feuille mobile (coins supérieurs). À l'intérieur d'un contrôle, les éléments imbriqués descendent à 2px (options du segmenté, piste du curseur, poignée de la feuille) et les cases de la rampe à 1px. Deux formes rondes seulement, toutes deux liées au temps : le bouton lecture (40px) et le curseur du défilement. La légende docquée sur téléphone perd ses coins, car elle touche les bords de l'écran.

Les icônes sont des tracés au trait dessinés pour le projet : grille 24, affichées à 20px, trait de 1,8, extrémités et jonctions arrondies, couleur héritée.

## Components

### Bandeau

Le seul aplat de couleur du chrome. Fond vert sapin, texte blanc ; l'anneau de focus y passe en blanc.

### Contrôle segmenté (niveaux)

- **Forme :** cadre en trait de sapin, rayon 4px, 2px de jeu ; options à 2px de rayon, 6px 12px.
- **États :** inactif en vert pâle sur sapin ; survol en sapin profond et blanc ; actif en blanc avec texte sapin, graisse 600. Transitions de 160ms.
- **Téléphone :** les options se partagent la largeur, à 14px.

### Sélecteur d'indicateur

Bouton planche blanche dans le bandeau, 44px de haut, au moins 210px de large : petite étiquette « Indicateur » en 12px encre douce au-dessus de la valeur en 17px/700 sapin, chevron sapin à droite ; survol en fond froid. Il ouvre une liste (listbox) blanche à filet appuyé, sans ombre, en deux groupes séparés d'un filet (« Population » : population, densité, superficie ; « État civil » : naissances, décès, natalité, mortalité). Chaque option : nom en 15px/600, précision en 13px encre douce, coche sapin sur l'option courante, fond froid sur l'option active. Clavier : flèches, Début, Fin, Entrée, Échap. Sur téléphone, le bouton prend toute la largeur du panneau du menu.

### Fond et noms de lieux

Fond « Carte » par défaut : un monde discret tiré d'OpenFreeMap (OpenStreetMap), terres #eceef1, mer #d6e1ec, frontières des pays en #a9b2bd, sans routes ; les pays voisins et leurs villes sont nommés en gris #6c7f94 (les noms des micro-États, qui tomberaient sur le lavis, sont retirés). La France est couverte par le lavis ; ses noms viennent de nos données (`shapes/places.json` : chefs-lieux et communes de 5 000 habitants et plus), en encre avec un halo blanc, par paliers : chefs-lieux de région et villes de 200 000 habitants dès le zoom 4, préfectures et villes de 50 000 dès 5,5, puis 20 000 dès 7 et le reste dès 8,5. Les villes d'OpenStreetMap passent sous le lavis, qui cache les françaises.

Bascule à la Google Maps au-dessus des boutons de caméra (en haut à droite sur téléphone) : une vignette de 64px qui montre l'autre fond (« Photos » ou « Carte ») ; un clic bascule, le choix se garde dans l'URL (`?fond=photo`). Sur les photos aériennes IGN, le lavis tombe à 55 % d'opacité et les limites du niveau parent passent en blanc, plus épaisses. Plan IGN et relief ont été essayés et retirés.

### Icône du site

Une planche cadastrale sur fond vert sapin : trois parcelles lavées du plus clair au plus foncé (#efc9ce, #cd6f7f, #8c2440), cernées et séparées de blanc. Source `web/public/favicon.svg` (onglets) ; `favicon.ico` (16, 32, 48 px, le 16 px sans les coutures intérieures), `apple-touch-icon.png` (180 px) et les icônes du manifeste (192, 512, et une version maskable à marge plus large) sont des rendus de ce même dessin, plein cadre pour les écrans d'accueil. Couleur de thème : vert sapin.

### Boutons de caméra

Un seul groupe en bas à droite de la carte : zoomer, dézoomer, voir toute la France (icône de cadre avec un point central), boutons de 36px en encre, fond froid au survol. « Voir toute la France » recadre la métropole et la Corse à côté de la légende et de la fiche. Sur téléphone, seul ce dernier bouton reste (le zoom se fait au pincement).

### Recherche (combobox)

- **Champ :** planche blanche de 38px de haut, rayon 4px, icône loupe en encre douce, texte en encre ; focus marqué par un anneau blanc de 2px décalé de 2px (le champ vit sur le bandeau).
- **Liste :** planche blanche bordée d'un filet appuyé, rayon 4px, 6px sous le champ ; option active sur fond froid ; nom en 600, contexte en 14px encre douce.

### Planche de légende

- **Surface :** blanche, filet, rayon 4px, sans ombre.
- **Contenu :** titre (indicateur · niveau), unité, rampe de cases jointives (18px, 2px d'écart) colorées par le lavis, extrémités à la plus petite et à la plus grande valeur du niveau (« Moins » et « Plus » si les bornes manquent), au centre le nom du territoire survolé ou sélectionné suivi des bornes de sa classe en encre douce ; sa case est marquée d'un contour encre de 2px et grandit verticalement (×1,35), chaque case donne ses bornes au survol. Pied : pastille « Sans donnée ».
- **Défilement des années :** sous un filet, bouton lecture rond, curseur à piste fine et poignée sapin cerclée de blanc, bornes de la série en 13px, année en grand chiffre sapin. Un pas toutes les 650ms.

### Fiche

- **Bureau :** panneau blanc de 420px, filet à gauche, entrée par glissement de 24px en 280ms.
- **Téléphone :** feuille basse à coins supérieurs de 4px, filet en haut, poignée centrale (40×4px), mi-hauteur puis pleine hauteur ; entrée par glissement de 40px.
- **Contenu :** nom en capitales espacées, contexte (niveau, parents en liens, code postal), valeur carmin, phrase de lecture ; tableau des rangs à filets (rang en gras « 239ᵉ / 34 746 », part en encre douce, alignés à droite) ; graphique historique ; tableau de tous les indicateurs (nom souligné d'un filet appuyé, valeur 600, ligne courante en carmin) ; ligne de crédit des sources en 12px.
- **Chargement :** blocs gris froids animés en balayage, rayon 4px.

### Graphique historique

Axe temporel vrai : les recensements sont placés à leur date, et un écart de plus de 12 ans (1936 à 1954) coupe la courbe pour que la lacune se voie. Ligne carmin de 2px, aire en teinte carmin, points de 1,6px, grille des décennies en filet, curseur pointillé en sapin, point courant blanc cerclé de sapin.

### Info-bulle de survol

Pastille encre, texte blanc 14px/600 en capitales espacées (0,06em), rayon 4px, décalée de 14px du pointeur, sans flèche ni ombre.

### Liens et boutons-icônes

Lien : texte sapin, soulignement de 1px décalé de 3px en trait de sapin, plein au survol. Bouton-icône : 36px, blanc, icône en encre douce, fond froid et encre au survol.

## Do's and Don'ts

### Do:

- **Do** réserver le carmin et le lavis aux valeurs : carte, valeur de la fiche, courbe, ligne courante.
- **Do** tirer toute couleur de classe de `washAt()` dans `palette.ts`, pour que la carte et la légende restent identiques quel que soit le nombre de classes publiées.
- **Do** séparer les territoires par des coutures blanches et tracer la sélection en vert sapin (3px), le survol à l'encre (1,5px).
- **Do** détacher les surfaces par un filet de 1px et garder un rayon de 4px, feuille mobile comprise.
- **Do** montrer une valeur absente comme absente (gris « Sans donnée » sur la carte, « Pas de donnée » dans la fiche), jamais comme la classe la plus faible ni comme zéro.
- **Do** placer toute série temporelle sur un axe de temps vrai et laisser les lacunes de recensement visibles.
- **Do** écrire les noms de territoires en capitales espacées et les chiffres en tabulaires.

### Don't:

- **Don't** ajouter d'ombre portée, de flou ou de dégradé décoratif ; seul le filet sépare.
- **Don't** utiliser de fond crème ou beige : le fond est blanc froid.
- **Don't** introduire de thème sombre : la carte est claire uniquement, par direction.
- **Don't** colorer le chrome en dehors du vert sapin, de l'encre et du blanc.
- **Don't** tracer de contours noirs ou gris foncé entre territoires, ni poser de fond de carte gris.
- **Don't** composer de cartes KPI, de tuiles ou de barre latérale de réglages : les chiffres vont dans des tableaux à filets.
- **Don't** utiliser de sur-titres ou d'étiquettes en capitales espacées au-dessus des titres ; les capitales sont réservées aux noms propres.
- **Don't** utiliser de police d'icônes ni de glyphes : les icônes sont des tracés SVG au trait de 1,8.
