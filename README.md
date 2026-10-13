# Wardrobe

Wardrobe est une application web que j'ai développée pour organiser une garde-robe et préparer des tenues. L'idée est de savoir ce que je possède, où se trouve chaque vêtement et ce que je peux porter un jour donné. L'interface est en français et s'adapte au téléphone comme à l'ordinateur.

## Fonctionnalités

- Créer des emplacements comme la maison ou un lieu de stockage.
- Ajouter des vêtements, leur état, leur disponibilité et des photos privées.
- Composer des tenues à partir des vêtements enregistrés et créer plusieurs variantes.
- Préparer le calendrier et consulter la page « Aujourd'hui ».
- Marquer une tenue comme portée et retrouver sa composition dans l'historique.
- Choisir le fuseau horaire et le thème clair, sombre ou système.

Un emplacement et l'état d'un vêtement sont deux informations différentes. Un vêtement doit être disponible et se trouver à l'emplacement choisi pour être proposé comme portable. Le calendrier peut tout de même afficher une tenue indisponible avec un avertissement.

## Technologies

Le projet utilise Next.js, React, TypeScript, PostgreSQL et Prisma. Better Auth gère les comptes et les sessions. Les photos sont traitées avec Sharp puis conservées dans un stockage privé. Docker Compose et Caddy servent au déploiement sur le VPS. GitHub Actions vérifie et déploie les versions intégrées dans `main`.

## Lancer le projet en local

Il faut Node.js 24, pnpm 11.25 et Docker avec Compose. Depuis la racine du dépôt :

```powershell
Copy-Item .env.example .env
pnpm install
pnpm db:generate
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev
```

L'application est ensuite disponible sur http://localhost:3000. Le seed crée un compte de démonstration local :

- Adresse : `demo@wardrobe.local`
- Mot de passe : `Wardrobe-demo-2026!`

Ces identifiants ne servent qu'au développement. Le seed refuse de tourner si `NODE_ENV=production` et conserve les données déjà présentes. En local, le fournisseur e-mail par défaut affiche les liens de confirmation et de réinitialisation dans le terminal.

## Organisation du code

`src/app` contient les pages et les routes HTTP. Les fonctionnalités sont regroupées dans `src/modules` : authentification, utilisateurs, emplacements, garde-robe, tenues, calendrier et historique. Chaque module sépare les règles métier, les services et la présentation. Le schéma Prisma et les migrations sont dans `prisma`.

`docs/architecture.md` décrit les principales décisions. Les routes sont détaillées dans `docs/api.md` et les variables et commandes locales dans `docs/development.md`.

## Vérifications

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Les tests d'intégration et le parcours navigateur ont besoin de PostgreSQL. L'intégration vérifie notamment les droits entre comptes, les contraintes de base et l'historique. Le parcours Playwright utilise des comptes de test et vérifie aussi l'affichage sur plusieurs tailles d'écran.

## Production

Wardrobe est disponible sur https://wardrobe.ediz-buba.com. L'application tourne sur un VPS OVHcloud. Caddy fournit HTTPS ; PostgreSQL et les photos restent sur des volumes persistants privés. Le portfolio principal continue d'être hébergé séparément sur GitHub Pages.

Une fusion dans `main` lance les contrôles CI, construit des images Docker identifiées par le commit et, si les contrôles passent, déploie la version. Les migrations de production utilisent `prisma migrate deploy`. Le seed de développement ne doit jamais être lancé sur le VPS.

Les détails de déploiement, de sauvegarde et de restauration se trouvent dans [docs/deployment.md](docs/deployment.md). Les vérifications réalisées sont dans [docs/implementation-status.md](docs/implementation-status.md). Les fonctions de partage, les statistiques avancées et le fonctionnement hors ligne ne font pas partie de cette version.

## Auteur

Ediz Buba
