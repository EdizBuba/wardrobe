# Architecture

Wardrobe est un monolithe modulaire construit avec Next.js. Une seule application contient les pages, l'API et les règles métier, réparties entre les modules auth, users, locations, wardrobe, outfits, planner et wear-history. Les règles de disponibilité et de calendrier ne dépendent pas de l'interface.

Les routes privées de /api/v1 vérifient la session Better Auth avant d'appeler les services applicatifs. Prisma relie ces services à PostgreSQL et les migrations versionnent le schéma. Chaque ressource appartient à un utilisateur ; les requêtes et les clés étrangères composées empêchent les accès entre comptes.

Sharp valide et redimensionne les photos avant leur conversion en WebP. Elles restent hors du dossier public et leur route vérifie le propriétaire. Le calendrier utilise des dates civiles YYYY-MM-DD interprétées selon le fuseau du profil. Une tenue portée garde une copie de sa composition, même si sa variante change ensuite.

En production, Caddy termine HTTPS et transmet le trafic à l'application. PostgreSQL et les photos sont sur des volumes persistants privés. Le proxy et Wardrobe sont deux projets Compose indépendants.
