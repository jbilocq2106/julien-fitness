# Paiement et livraison préparés — sans activation

## Option retenue : Ko-fi Shop et paiement PayPal

La documentation officielle Ko-fi permet de vendre un logiciel comme article numérique et d'attacher un fichier. Après achat, Ko-fi fournit automatiquement l'accès au téléchargement et un lien par email. Le vendeur n'a pas à envoyer les ZIP manuellement. L'offre gratuite n'impose pas d'abonnement mensuel ; 5 % de frais de boutique s'ajoutent aux frais PayPal/Stripe. Les frais exacts de votre compte restent à vérifier. Ce n'est donc pas une vente sans frais, mais sans investissement initial prévu.

Source vérifiée le 17/11/2026 :
- https://help.ko-fi.com/hc/en-us/articles/360009712917-Ko-fi-Shop-Sell-digital-physical-products
- https://help.ko-fi.com/hc/en-us/articles/360002506494-Does-Ko-fi-take-a-fee

## Éléments prêts

- `npm run build` génère `artifacts/mytraining-pro-0.1.0.zip`, le guide d'installation et sa somme SHA-256.
- `src/vente.html` contient la présentation et le comparatif ; tous les paiements sont absents.
- Le paquet gratuit est produit séparément.
- Livraison automatisée par le mécanisme natif Ko-fi, pas de webhook personnalisé à sécuriser ou de serveur à payer.

## Configuration après validation explicite du vendeur

1. Choisir le modèle de vente : téléchargement pour utilisateurs sachant héberger le logiciel, ou application hébergée grand public. Le ZIP actuel n'est pas une application Android prête à installer. Ne pas vendre à un public mobile non technique sans résoudre cette étape.
2. Compléter le statut légal, les CGV, la licence, la garantie et la politique d'installation et d'assistance. Choisir le prix TTC en euros ; aucune tarification n'a été fixée par ce chantier.
3. Créer/ouvrir le compte Ko-fi et connecter le compte PayPal adapté à l'activité. Authentification et acceptation des conditions relèvent du titulaire.
4. Créer un produit numérique en brouillon, joindre le ZIP Pro et le guide, renseigner prix, conditions, compatibilité et contact. Ne pas publier automatiquement.
5. Prévoir un aperçu créé à partir de données fictives, jamais une capture de la version personnelle.
6. Vérifier comment obtenir et conserver le consentement exprès à l'exécution immédiate et la reconnaissance de la perte du droit de rétractation lorsque cette exception est utilisée. Si le parcours ne permet pas de recueillir une preuve valable, ne pas appliquer l'exception ; définir une politique conforme.
7. Faire un essai de livraison sans paiement si Ko-fi offre un mode adapté, ou demander une autorisation distincte avant tout achat réel. Aucun achat n'a été effectué.
8. Après autorisation de publication uniquement, ouvrir la boutique et ajouter son URL réelle à la page. Ne pas ajouter de fausse URL ni de bouton de paiement déverrouillant le code côté navigateur.

## Pourquoi pas un simple bouton PayPal ?

Un lien PayPal seul ne valide pas côté serveur le montant, la devise, le statut final, les remboursements, ni la livraison sécurisée. Aucun serveur PayPal n'a été simulé. Si un modèle SaaS est retenu plus tard : identité utilisateur, commande serveur, capture vérifiée auprès de PayPal, gestion idempotente des notifications, droits serveur et révocation après remboursement seront nécessaires. Ce n'est pas la livraison de ZIP fournie ici.

## Proposition de fiche produit à compléter

Titre : MyTraining Pro — programmes et carnet d'entraînement.
Résumé : composez jusqu'à 30 programmes et suivez vos séries dans une application web sans compte cloud.
Contenu : fichiers web, guide d'installation, licence validée.
Pré-requis : navigateur moderne et hébergement HTTPS ; pas d'APK, pas de synchronisation.
Prix : À VALIDER. Support et mises à jour : À DÉFINIR. Ne pas publier tant que ces éléments ne sont pas finalisés.
