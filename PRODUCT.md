# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Grand public curieux : quelqu'un qui ouvre la carte pour voir sa commune, la comparer à ses
voisines, regarder comment elle a évolué, ou explorer la France par curiosité. Pas de compte, pas
de contexte professionnel supposé, pas de connaissance préalable des sources INSEE.

## Product Purpose

Cartes de la France à trois niveaux (régions, départements, communes) pour la population, les
naissances, les décès, la densité, la superficie et les naissances et décès par habitant, sur
toutes les années disponibles. Le visiteur choisit un indicateur et une année, voit la carte
colorée par classes de Jenks, puis ouvre une région, un département ou une commune pour ses
chiffres, ses rangs et ses courbes.

Réussite : un curieux trouve sa commune vite, comprend ce que la carte montre sans lire de
notice, et repart avec un chiffre juste et une idée de sa place parmi les autres.

## Positioning

- **Séries longues** : populations depuis 1876, complètes, toutes calculées dans la géographie
  actuelle (dernier COG), donc comparables d'une année à l'autre.
- **Rangs et parts à chaque niveau** : pour chaque indicateur et chaque année, rang et part dans
  le pays, la région et le département.
- **Simplicité** : une carte rapide et lisible, sans compte, sans portail, sans jargon
  administratif, là où les outils publics voisins (Observatoire des territoires, statistiques
  locales INSEE, Géoportail) visent des usages experts.

## Operating Context

- Usage occasionnel et exploratoire : arrivée sur la carte, recherche d'une commune ou d'une
  adresse, survol, clic, comparaison avec les voisines, changement d'année ou d'indicateur.
- Navigation par URL (`BrowserRouter`) : une vue doit pouvoir se partager par lien.
- Données statiques servies par le CDN (`maps-data.gaetanraynaud.fr`), régénérées à la main une
  fois par an environ, au nouveau millésime INSEE.

## Capabilities and Constraints

- Niveaux : région, département, commune (France métropolitaine ; DROM-COM exclus).
- Indicateurs : superficie (sans année), population, densité, naissances, décès, naissances et
  décès par habitant (par année). Classes de Jenks précalculées par indicateur et par année.
- Par entité : séries annuelles, rangs (pays, région, département selon le niveau), parts du
  parent, code postal, mairie et centre pour les communes.
- Recherche d'adresse prévue via `api-adresse.data.gouv.fr`.
- Frontières : tuiles vectorielles data.gouv.fr (couches `regions`, `departements`, `communes`,
  jointure par code INSEE). Fond de carte IGN dans l'ancien site, à reconfirmer.
- Poids : les fichiers Jenks sont lourds (environ 50 Mo bruts au total) ; ne pas tout charger au
  démarrage sans décision explicite (voir [docs/migration.md](docs/migration.md)).
- Aucun suivi d'audience : pas d'analytics, pas de traceur, pas de bandeau de consentement.
- Ouvert : place du mobile (même niveau que le desktop ou non) et langues autres que le français
  ne sont pas décidées.

## Brand Commitments

- Nom affiché actuel : « Cartes de France ». Domaine `maps.gaetanraynaud.fr`.
- Interface et docs en français.
- Aucune autre identité visuelle n'est engagée. L'ancien site ne sert que de liste de
  fonctionnalités : ni son apparence, ni son UX (menus, popups, enchaînements) ne sont à suivre.

## Evidence on Hand

- Données réelles et vérifiées : totaux par département et région identiques à ceux de l'INSEE
  (bilan dans [docs/migration.md](docs/migration.md)). Sources listées dans le
  [README](README.md).
- Pas de témoignages, de chiffres d'audience ni de presse : ne pas en inventer.

## Product Principles

1. **Le chiffre juste d'abord.** Les valeurs affichées sont celles de l'INSEE ; une valeur absente
   se montre comme absente, jamais comme zéro.
2. **Comprendre sans notice.** Indicateur, année, unité et sens des couleurs se lisent sur la
   carte elle-même.
3. **Comparer est le geste central.** Rangs, parts et voisins sont à portée d'un clic, à chaque
   niveau.
4. **Le temps long est un atout.** Les séries depuis 1876 se parcourent facilement, pas
   seulement la dernière année.
5. **Léger et sans suivi.** Chargement à la demande, aucun compte, aucun traceur.

## Accessibility & Inclusion

- Conformité visée : RGAA / WCAG (niveau à fixer, AA par défaut tant que rien d'autre n'est
  décidé).
- Les classes de couleur de la carte doivent rester distinguables sans perception fine des
  couleurs, et l'information ne doit pas passer par la couleur seule (valeurs lisibles dans la
  légende, les popups et les fiches).
- Recherche, choix d'indicateur et d'année, et fiches utilisables au clavier et au lecteur
  d'écran.
