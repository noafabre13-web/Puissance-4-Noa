# Puissance 4 Noa

Un Puissance 4 simple et ludique, jouable dans le navigateur, sans installation ni dépendance.

**Jouer en ligne : https://noafabre13-web.github.io/Puissance-4-Noa/**

## Modes de jeu

- **Classique** : à deux sur le même appareil, ou contre l'ordinateur (Facile, Moyen, Difficile).
- **Pouvoirs** : à deux, avec 4 pouvoirs utilisables une fois chacun : Double coup, Jeton explosif, Colonne bloquée, Permutation. Chaque pouvoir demande une confirmation et peut être annulé avant le choix de la cible.
- **Chrono** : une réserve de temps par joueur (1, 3 ou 5 minutes). Temps écoulé, partie perdue.
- **Défi du jour** : une position à résoudre en un nombre de coups donné, la même pour tout le monde le même jour. Étoiles, série de jours et récompenses.
- **Entraînement** : contre l'ordinateur, avec conseil du meilleur coup et retour en arrière.

Les règles de chaque mode s'affichent à chaque fois qu'on y entre.

## Progression et boutique

Pièces virtuelles gagnées en jouant, niveaux, succès, missions du jour, récompense de connexion, statistiques, boutique cosmétique (jetons, plateaux, animations de victoire, avatars, effets, packs), pass de saison et offre Premium.

Les achats en euros et les publicités sont **des démonstrations** : aucun paiement ni aucune régie n'est connecté. Voir [MONETISATION.md](MONETISATION.md).

## Structure

```
index.html          Les écrans (accueil, partie, boutique, pass, profil)
css/style.css       Le design
js/config.js        Prix, récompenses, saison (à modifier ici)
js/engine.js        Règles du jeu, sans affichage
js/ai.js            Ordinateur : 3 niveaux, solveur exact
js/daily.js         Défis quotidiens vérifiés
js/catalog.js       Objets cosmétiques et récompenses du pass
js/progress.js      Profil du joueur, enregistré dans le navigateur
js/payments.js      Points de branchement paiements et publicités
js/ui.js            Fenêtres, messages, effets visuels
js/game.js          Déroulement d'une partie dans chaque mode
js/app.js           Navigation et écrans
tests/regles.html   Tests automatiques des règles
```

## Tests

Ouvrez `tests/regles.html` (en ligne : https://noafabre13-web.github.io/Puissance-4-Noa/tests/regles.html). La page vérifie les victoires, la gravité, les pouvoirs, les trois niveaux d'IA et que chaque défi quotidien est bien gagnable dans le nombre de coups annoncé.

## Jouer hors ligne

Téléchargez le dépôt et ouvrez `index.html` dans votre navigateur.

## Données

La progression est enregistrée uniquement dans le navigateur (localStorage). Aucun compte, aucune donnée envoyée.

Réalisé par Noa Fabre.
