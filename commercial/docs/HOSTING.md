# Hébergement préparé, non déployé

Ne pas utiliser GitHub Pages pour la page commerciale ou le service commercial. GitHub l'exclut de ce type d'usage : https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Option technique de départ : projet Cloudflare Pages distinct. Offre gratuite avec limites, notamment 500 builds/mois d'après https://developers.cloudflare.com/pages/platform/limits/ consulté le 17/11/2026. Les conditions contractuelles, traitement des journaux, sous-traitance et transferts doivent être acceptés après vérification par le titulaire ; aucun compte créé ni coût engagé ici. Aucun domaine acheté.

## Configuration manuelle après validation

- Créer un projet indépendant de la version personnelle.
- Ne pas connecter le dépôt entier à un déploiement automatique. Préférer un dépôt commercial assaini ou un téléversement manuel du seul dossier de build.
- Commande locale : `cd commercial && npm run check`.
- Racine à téléverser : `commercial/dist/free` pour le gratuit uniquement.
- Vérifier la prise en compte de `_headers`, HTTPS, CSP, Referrer-Policy et nosniff.
- Ne jamais publier `dist/pro` en pensant qu'une URL cachée suffit à protéger un achat. Le ZIP peut être livré par Ko-fi ; pour une application Pro hébergée à accès réservé, développer une authentification/autorisation serveur au préalable.
- Origine dédiée pour éviter le partage du localStorage avec les applications personnelles/professionnelles du même hôte.
- Aucun secret, ZIP Pro, fichier de sauvegarde utilisateur ni dossier parent dans le contenu hébergé.
- Après publication autorisée, vérifier en-têtes, installation sur Samsung/iPhone, fonctionnement hors ligne, mise à jour et récupération des sauvegardes.

Les journaux IP restent un traitement à documenter même si les séances ne sortent pas de l'appareil. Le coût zéro n'est pas garanti au-delà des quotas ou si des options payantes sont activées. Aucune fonctionnalité facturable n'est configurée.
