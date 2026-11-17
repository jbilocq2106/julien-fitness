# Compte rendu de validation et passage en production

Préversion 0.1, 17 novembre 2026. Aucun déploiement ou paiement effectué.

## Vérifications reproductibles

`cd commercial && npm run check` : syntaxe JavaScript, tests Node, builds Free/Pro et empreintes SHA-256. Tests couvrant schéma des sauvegardes, import malformé/volumineux, valeurs numériques, séries invalides/dupliquées, progression, séance partielle, export CSV, stockage indépendant, absence de SDK et données historiques, contenu des distributions et configuration des éditions. Les ZIP sont régénérables et ne sont pas publiés comme release GitHub.

`git diff origin/main --name-only` doit ne montrer que `commercial/`. Aucun fichier de la version personnelle ou professionnelle n'est modifié. La branche ne doit pas être fusionnée dans main pour déployer.

## Vérifications restantes avant vente

Ces contrôles doivent être faits sur le futur hébergement et les appareils cibles ; les tests de modèle ne les remplacent pas.

- Android Chrome sur Samsung et iOS Safari : largeur 360/390 px, zoom, clavier, contraste et lecture écran, navigation clavier ; aucune vérification visuelle native effectuée dans ce chantier.
- Créer un profil, modifier un programme, démarrer une séance, modifier une série validée, recharger, terminer partiellement, supprimer une séance.
- Sauvegarder/restaurer, annuler restauration, effacer, tester refus du stockage/quota. Vérifier absence d'effet sur MyTraining personnel.
- Installation PWA : déclinaisons PNG d'icône si requises, hors ligne après premier chargement, mise à jour de version sans perte de données.
- Hébergement HTTPS et en-têtes de sécurité réels, journalisation et notice de confidentialité.
- Choisir et livrer une expérience d'installation compréhensible pour l'acheteur mobile. Le téléchargement de fichiers web ne suffit pas à promettre une application Android installable.
- Valider marque, titularité du code, statut, TVA, prix, CGV, licence, médiateur, rétractation et garanties.
- Configurer Ko-fi/PayPal dans les comptes du vendeur et confirmer la livraison avant autorisation de publication. Tout test de paiement réel nécessite son accord.

## Décisions attendues du titulaire

Prix unique TTC et durée de support ; vente de fichiers ou accès hébergé ; identité et statut vendeur ; disponibilité des comptes Ko-fi/PayPal/hébergeur ; autorisation de publication distincte. Ne pas considérer cette liste comme une activation automatique après la fin du développement.
