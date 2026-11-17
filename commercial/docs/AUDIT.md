# Audit du 17 novembre 2026

## Périmètre examiné

Base main `11617f4` (Refresh offline cache for new recovery timer). L'entrée racine redirige vers `training/`. L'application active utilise `training/app.js`, un programme JSON et plusieurs dizaines de scripts correctifs (minuteurs, machines, suivi de salle, synchronisation Firebase, mémoire de coaching). La racine conserve aussi une version ancienne. `myteam/` et `team4/` hébergent des fonctions professionnelles sans rapport avec le produit sportif.

Cette multiplicité, les accès globaux, le mélange de rendu HTML et de logique, les paramètres personnels et les SDK Firebase importés à distance augmentent le risque de régression et de diffusion accidentelle. Le programme contient des charges initiales et des choix de séance adaptés à son utilisateur. Les caches existants ont leurs propres préfixes et chemins.

## Choix de transformation

Nouvelle base autonome `commercial/` : aucun fichier historique modifié, aucune donnée personnelle importée. Modèle validé et testable, rendu par textContent/createElement (aucun innerHTML), validation des imports, limites de taille, contrôles des nombres et identifiants, export CSV neutralisant les préfixes de formule, CSP, permissions restreintes. Aucun code de paiement ni secret côté client. Modèles sans charge initiale ; pseudo générique ; stockage `mytraining_pro_v1`.

Il s'agit d'une reconstruction ciblée des fonctions utiles et non d'une copie de tous les modules personnels. Les fonctions de coaching avancé, mesures corporelles, synchronisation et guides illustrés historiques ne font pas partie de 0.1.

## Images et licences

Aucun LICENSE général trouvé à la racine ; cela n'établit pas la propriété de toutes les contributions existantes. Les photos, sprites, favicons et icônes historiques ne sont pas redistribués : leur provenance et leur licence ne sont pas démontrées. Aucun lien de vidéo ou de marque de salle n'est repris. Le seul visuel livré est `src/icon.svg`, pictogramme vectoriel créé pour cette version. Police système, aucun composant npm tiers ni média externe. Le conditionnement par liste de fichiers empêche d'inclure accidentellement des images ou données de l'ancien dépôt. Le nom « MyTraining Pro » reste à rechercher dans les bases INPI/EUIPO et les boutiques avant exploitation ; aucune disponibilité de marque n'est certifiée.

## Sécurité et limites

- Profil local, sans authentification : toute personne utilisant ce navigateur peut voir les données. Ce n'est pas un espace multi-utilisateur ni un dossier médical.
- Sauvegardes et stockage non chiffrés ; avertissement affiché. Pas de promesse de confidentialité sur appareil partagé.
- Aucun paiement déduit d'un paramètre URL ou du localStorage. La distribution Pro est une édition distincte sans DRM, modifiable et accessible dans le dépôt public. Une vente SaaS protégée nécessiterait une autorisation serveur.
- Import JSON reconstruit un schéma autorisé, refuse séries invalides et doublons, limite 5 Mo. Le stockage illisible est bloqué au lieu d'être écrasé silencieusement.
- Limites localStorage et erreurs d'écriture signalées. Sauvegarde recommandée ; pas de garantie de persistance système. L'historique est plafonné pour éviter une croissance sans contrôle.
- Service worker restreint au dossier, cache propre à l'édition/contenu ; aucune suppression globale de caches, aucune lecture des clés personnelles. Héberger sur une origine dédiée renforce réellement l'isolation (un simple chemin n'est pas une frontière de sécurité).
- Contrôles automatiques de modèle et de conditionnement ; aucune certification de sécurité, aucun pentest externe. Les en-têtes doivent être vérifiés sur l'hébergement choisi.

## Conditions préalables au lancement

Installation mobile réelle, contrôle de l'expérience acheteur, informations du vendeur, prix et licence, CGV/garanties/rétractation, vérification de marque, hébergement et politiques prestataires. Aucune production commerciale activée.
