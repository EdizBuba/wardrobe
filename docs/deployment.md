# Déploiement

Wardrobe tourne sur un VPS OVHcloud Ubuntu 26.04 à l'adresse https://wardrobe.ediz-buba.com. Seul le sous-domaine wardrobe pointe vers ce serveur ; le portfolio reste hébergé à part.

Docker Compose sépare Caddy de Wardrobe. Seul le proxy publie les ports 80 et 443 ; PostgreSQL et l'application restent sur le réseau privé. Caddy redirige HTTP vers HTTPS et renouvelle le certificat. La base et les photos utilisent des volumes persistants. Le fichier d'environnement de production reste sur le serveur, hors de Git.

## Mise en production

La CI construit les images de l'application et des migrations pour le SHA validé, puis les publie dans GHCR. Un compte SSH limité lance le déploiement.

Le déploiement vérifie les migrations, sauvegarde la base et les photos, exécute prisma migrate deploy et contrôle la santé de l'application. Une nouvelle empreinte de migration doit être approuvée par l'administrateur. Le seed et prisma db push ne sont jamais utilisés en production. Une migration incompatible exige une procédure de maintenance séparée.

Pour un déploiement manuel d'une image déjà disponible sur le VPS :

    sudo /usr/local/sbin/wardrobe-deploy <sha-complet-du-commit>

## Sauvegarde et restauration

Les sauvegardes nocturnes incluent PostgreSQL et les photos ; sept copies sont gardées sur le VPS. Une tâche Windows envoie une copie chiffrée vers le dépôt restic du PC si celui-ci est allumé, la session ouverte et la clé SSH disponible. Si le PC est éteint, la copie reprend à la prochaine ouverture de session. Aucune destination S3/SFTP indépendante n'est configurée.

Pour vérifier une sauvegarde sans toucher aux données en production :

    sudo /opt/containers/wardrobe/scripts/restore-check.sh <horodatage-UTC>

Le contrôle restaure PostgreSQL dans un conteneur isolé et vérifie les photos sans toucher aux volumes de production. Une restauration réelle nécessite l'arrêt des écritures. Revenir à une ancienne image ne restaure pas l'ancien schéma.
