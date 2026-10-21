# Monétisation : ce qui fonctionne, ce qui reste à connecter

Ce document distingue clairement quatre choses : ce qui marche vraiment, les écrans de démonstration, les données de test, et les services externes à brancher avant toute mise en production.

## État actuel

| Élément | État | Détail |
|---|---|---|
| Pièces virtuelles, niveaux, succès, missions, récompense quotidienne | **Opérationnel** | Gagnés en jouant, enregistrés dans le navigateur |
| Achats en pièces dans la boutique | **Opérationnel** | Objets cosmétiques uniquement |
| Pass de saison, piste gratuite | **Opérationnel** | Progression par XP, récompenses à récupérer |
| Défi du jour | **Opérationnel** | Rotation par la date de l'appareil, sans serveur |
| Achats en euros (packs, jetons, pass Premium, abonnement) | **Démonstration** | Le bouton « Payer » répond « paiement indisponible ». Rien n'est encaissé, rien n'est accordé |
| Publicités récompensées | **Démonstration** | Le bouton « Regarder » répond « aucune publicité disponible ». Aucune pièce n'est accordée |
| Mode test (Profil > Réglages) | **Données de test** | Simule un achat ou une pub pour vérifier l'interface. Tout est marqué TEST et se retire d'un clic |

Les pièces ne s'achètent pas et ne se convertissent jamais en argent réel. Aucun objet payant ne donne d'avantage en partie.

## Où sont les prix

Tous les prix sont dans `js/config.js` (`prices`). Les modifier là suffit : la boutique, le pass et l'offre Premium se mettent à jour.

| Offre | Prix d'exemple |
|---|---|
| Petit pack | 0,99 € |
| Pack standard | 2,99 € |
| Pack premium | 4,99 € |
| Pass de saison | 3,99 € |
| Premium | 2,99 € / mois |

## Brancher de vrais paiements

Le point d'entrée unique est `P4.Payments` dans `js/payments.js`. Il suffit de lui fournir un `provider` avec une méthode `purchase(productId)` qui renvoie `{ status: "paid" }`, `{ status: "cancelled" }` ou `{ status: "error" }`. Les identifiants de produits sont listés dans `PRODUCTS`.

Selon la plateforme :

- **Site web (version actuelle, GitHub Pages)** : un prestataire comme Stripe (Checkout ou liens de paiement). Il faut **un petit serveur** (ou des fonctions serverless) pour créer la session de paiement et recevoir la confirmation (webhook). Un site statique seul ne peut pas vérifier un paiement de façon fiable.
- **Application Android ou iOS** : les biens numériques doivent passer par Google Play Billing ou les achats intégrés d'Apple. Stripe n'est pas autorisé pour ce cas.

Dans tous les cas, l'objet ne doit être accordé qu'**après vérification du reçu par un serveur**, jamais sur simple réponse du navigateur.

## Brancher de vraies publicités

Le point d'entrée est `P4.Ads` dans `js/payments.js` : un `provider` avec `showRewarded(placement)` qui renvoie `{ status: "completed" }` seulement si la vidéo a été vue en entier.

- Sur le web : une régie qui accepte les jeux HTML5 et les formats récompensés (par exemple Google Ad Placement API pour les jeux H5). L'accès se fait sur candidature.
- Dans une application : AdMob, Unity Ads ou équivalent.

Emplacements prévus : écran d'accueil et fin de partie en mode solo. Jamais pendant une partie.

## Obligations à prévoir avant la mise en production

- **Consentement RGPD** : une plateforme de gestion du consentement (CMP) avant toute publicité ou tout traceur.
- **Politique de confidentialité** et **conditions générales de vente** accessibles depuis l'application.
- **Prix affichés TTC**, facture ou reçu après achat.
- **Droit de rétractation** : pour un contenu numérique fourni immédiatement, le client doit renoncer expressément à son droit de rétractation (case à cocher avant paiement).
- **Abonnement** : résiliation aussi simple que la souscription, rappel du prix et de la reconduction.
- **Mineurs** : prudence sur les incitations à l'achat, pas de pression commerciale.
- **TVA** : vente de services numériques à des particuliers européens, TVA du pays de l'acheteur (guichet unique OSS).

## Ce qu'un serveur apporterait

La version actuelle fonctionne sans serveur. Un serveur deviendrait nécessaire pour :

- vérifier les paiements et les abonnements ;
- retrouver sa progression sur plusieurs appareils (compte joueur) ;
- un classement entre joueurs pour le défi du jour ;
- empêcher la triche (aujourd'hui, changer la date de l'appareil change le défi, et la progression stockée dans le navigateur est modifiable).
