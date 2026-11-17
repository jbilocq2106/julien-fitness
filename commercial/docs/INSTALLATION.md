# MyTraining Pro 0.1 — installation et utilisation

Préversion à évaluer avant vente. Application web locale : aucun compte ni synchronisation multi-appareils. Compatible avec navigateurs modernes supportant ES modules, crypto.randomUUID et localStorage ; la compatibilité mobile réelle reste à valider sur appareils.

## Sur téléphone

L'application doit être servie via HTTPS. Une fois une URL dédiée configurée par l'éditeur, ouvrez-la dans Chrome sur Android puis utilisez « Ajouter à l'écran d'accueil » / « Installer l'application » si disponible. Sur iPhone : Safari → Partager → Sur l'écran d'accueil. La possibilité d'installation dépend du navigateur ; le mode web reste disponible. Attendre le chargement initial avant de passer hors ligne. Le pictogramme SVG peut nécessiter une déclinaison PNG selon les navigateurs.

Le ZIP est une distribution web : ne pas promettre une installation Android en ouvrant simplement le fichier HTML. Ce n'est ni un APK ni une application Play Store. Les modules ne fonctionnent pas via file://. Pour une clientèle non technique, une URL Pro avec contrôle d'accès serveur ou un empaquetage natif signé doit être ajouté avant lancement.

## Évaluation sur ordinateur

Décompressez le paquet puis lancez `python -m http.server 8080` dans son dossier. Ouvrez http://localhost:8080. Pour le développement depuis le dépôt : `cd commercial`, `npm run check`, puis `python -m http.server 8080 --directory dist/free`.

## Utilisation

1. Dans Profil, choisissez un pseudo et un objectif sans information médicale.
2. Dans Programmes, adaptez le programme existant ou chargez un modèle. Une ligne par exercice : `Nom ; séries ; répétitions ; repos en secondes`.
3. Dans Séance, commencez puis saisissez répétitions et charge (0 pour poids du corps), validez chaque série et terminez. Les séries validées sont reprises après rechargement.
4. Retrouvez les séances et repères de charges dans Progression. Une séance partielle peut être terminée après confirmation.
5. Sauvegardez régulièrement en JSON. Pour changer d'appareil, importez le fichier. Importer remplace les données présentes après confirmation. Les fichiers sont lisibles en clair.
6. Profil → Effacer supprime uniquement les données MyTraining Pro de ce navigateur. Le cache applicatif peut rester jusqu'au nettoyage du site dans le navigateur.

Un programme dans l'édition gratuite ; 30 dans la distribution Pro. Historique limité à 10 000 séances, 100 affichées, toutes exportables. Les programmes sont des modèles génériques à adapter, sans charges initiales imposées.
