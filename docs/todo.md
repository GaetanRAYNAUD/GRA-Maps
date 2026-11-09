# À faire

## Recherche : choisir une commune ne zoome pas

Dans la recherche, choisir un résultat de type commune ouvre la fiche mais ne déplace pas la
carte. Choisir une adresse fonctionne.

Pistes (non vérifiées), dans `web/src/App.tsx` (`onPlace` de `Search`) et `web/src/MapView.tsx`
(effet sur `focus`) :

- choisir une commune peut aussi changer le niveau (`niveau=communes`) : l'effet de niveau et
  l'effet de `focus` partent en même temps, un `easeTo` (padding de la fiche) peut annuler le
  `flyTo` ;
- `onLoaded` de la fiche relance un `setFocus` vers le centre de la commune, que `flownTo` doit
  empêcher : vérifier l'ordre entre `setFlownTo` et le chargement de la fiche.
