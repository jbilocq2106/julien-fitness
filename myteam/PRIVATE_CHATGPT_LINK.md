# Liaison privée ChatGPT vers MyTEAM

Ce transfert par lien chiffré n'est pas une synchronisation automatique ni un accès à Firebase.

## Première activation

1. Ouvrir MyTEAM > Rappels > Copier ma clé publique.
2. MyTEAM crée une paire RSA-OAEP SHA-256 2048 bits. La clé privée non exportable demeure dans IndexedDB, sur le téléphone.
3. Coller uniquement la clé publique (préfixe MYTEAM-PUB1:) dans ChatGPT. Ne jamais partager la phrase secrète ni une clé privée.

## Envoi des rappels

ChatGPT génère un lien chiffré à ouvrir sur le téléphone. Le site propose un aperçu ; l'utilisateur confirme avant tout ajout. Le code GitHub ne contient pas les rappels ni les noms des agents.

URL : https://jbilocq2106.github.io/julien-fitness/myteam/#mt-private-reminders-v1=<base64url de l'enveloppe JSON>

Enveloppe JSON compact :
- v : 1
- k : clé AES-256 chiffrée RSA-OAEP / MGF1-SHA256 avec la clé publique SPKI (base64url)
- i : IV AES-GCM aléatoire 12 octets (base64url)
- d : AES-256-GCM sur payload JSON UTF-8 (base64url)
- AAD exact : MyTEAM/private-reminders/v1

Payload : schema = myteam-private-reminders-v1 ; version = 1 ; items = liste de 1 à 25 objets avec id, agent, text, condition.

Exemple générique non nominatif :
{"schema":"myteam-private-reminders-v1","version":1,"items":[{"id":"ctx-20261102-example-01","agent":"AGENT EXEMPLE","text":"Vérifier une information administrative","condition":"present"}]}

Conditions autorisées : present, afternoon-night, visit. Identifiants stables entre transferts pour dédoublonner ; ne jamais réactiver une entrée terminée.

## Protection

Le fragment n'est pas envoyé au serveur GitHub Pages. Le déchiffrement et l'enregistrement ont lieu sur l'appareil. Les liens restent chiffrés, mais peuvent persister dans l'historique du chat et le presse-papiers. Les données validées rejoignent la sauvegarde Firebase de MyTEAM si sa synchronisation chiffrée est activée. Aucun transfert silencieux : un clic sur le lien et une confirmation par lot sont nécessaires. Une synchronisation push sans interaction nécessiterait une autre intégration backend autorisée.

Ne jamais placer de clés privées, de noms d'agents, de diagnostics ni de liens de transfert personnalisés dans le dépôt public.
