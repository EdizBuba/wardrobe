# Développement

Il faut Node.js 24, pnpm 11.25 et Docker Compose. Copie .env.example vers .env, puis suis les commandes du README. Ne committe pas .env. Lance PostgreSQL avec docker compose up -d postgres.

Prépare ensuite la base et les données de démonstration :

    pnpm db:generate
    pnpm db:migrate
    pnpm db:seed

Le compte de démonstration est réservé au développement. Le seed refuse la production et préserve les données existantes. Les liens e-mail de développement s'affichent dans le terminal.

Pour changer le schéma, crée et vérifie une migration avec pnpm db:dev --name nom_du_changement, puis committe-la. En production, pnpm db:migrate applique les migrations. N'utilise pas prisma db push.

Les commandes principales sont pnpm lint, pnpm typecheck, pnpm test, pnpm test:integration, pnpm test:e2e et pnpm build. L'intégration utilise PostgreSQL et Playwright utilise Chromium. Les photos locales sont dans MEDIA_ROOT (./media) ; les libellés sont dans src/config/labels.ts.
