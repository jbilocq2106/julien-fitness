# MyTraining Pro — préversion commerciale isolée

Branche de travail exclusivement. Ne pas fusionner vers main : un déploiement existant pourrait publier le dossier commercial. Aucun déploiement commercial, aucune boutique, aucun paiement activé. Une [démo privée sans achat](docs/DEMO.md) permet les essais.

## Exécuter

Node 22+ et Python 3, aucune dépendance npm tierce.

```sh
cd commercial
npm run check
python -m http.server 8080 --directory dist/free
```

Le build crée `dist/free`, `dist/pro`, deux ZIP et leurs empreintes dans `artifacts/`. Seuls les fichiers de `src/`, le guide d'installation et la licence entrent dans les distributions. Ni le reste du dépôt, ni les documents d'audit ne sont livrés aux clients. Ne jamais héberger la racine du dépôt.

## Livré

Profil local, programmes éditables et modèles génériques, saisie de séries persistante, séances partielles, récupération chronométrée, statistiques, historique, exports JSON/CSV, restauration validée et suppression. Interface tactile responsive, navigation accessible, CSP et en-têtes de sécurité, service worker limité au dossier de l'application. Aucun SDK, police distante ou image tierce. Page de vente et confidentialité en préversion.

Gratuit : 1 programme. Pro : 30 programmes. Les sauvegardes et exports restent disponibles gratuitement. L'édition est choisie au build, sans prétendre vérifier un paiement. Le code distribué peut être modifié : ce n'est pas une protection anti-copie. Le dépôt public donne accès au source Pro. Ce modèle vend la commodité de distribution et la licence, pas un secret technique. Ne pas vendre de compte SaaS tant qu'une authentification et une autorisation serveur ne sont pas implémentées.

## Documents

- [Audit et limites](docs/AUDIT.md)
- [Installation client](docs/INSTALLATION.md)
- [Vente et livraison Ko-fi](docs/COMMERCE.md)
- [Dossier juridique à compléter](docs/LEGAL-DRAFT.md)
- [Hébergement](docs/HOSTING.md)
- [Vérification et lancement](docs/RELEASE.md)

Les étapes qui dépendent de l'identité du vendeur, de ses comptes et de ses décisions restent bloquées. La préversion n'est pas déclarée prête à vendre.

## Démo privée

`npm run demo` génère `dist/demo`, sans page de vente et avec un stockage local distinct. Le [guide de démo](docs/DEMO.md) fournit le lien privé et les vérifications effectuées.
