# API HTTP

Les routes /api/v1 nécessitent une session Better Auth. Les modifications vérifient l'origine et le type de contenu. L'authentification passe par /api/auth.

Une réponse réussie contient data. Les créations renvoient 201, les suppressions sans contenu 204. Les erreurs principales sont 401 (non connecté), 403 (origine refusée), 404 (introuvable) et 409 (conflit).

| Route | Méthodes | Rôle |
| --- | --- | --- |
| /me | GET, PATCH | Profil et préférences |
| /locations, /locations/:id | GET, POST, PATCH, DELETE | Emplacements ; DELETE archive |
| /items, /items/:id | GET, POST, PATCH, DELETE | Vêtements et filtres |
| /items/:id/images | POST | Ajouter une photo |
| /images/:id | GET, DELETE | Lire ou retirer une photo privée |
| /outfits, /outfits/:id | GET, POST, PATCH, DELETE | Tenues |
| /outfits/:id/variants | POST | Créer une variante |
| /outfits/:id/variants/:variantId | PATCH | Modifier une variante |
| /outfits/:id/variants/:variantId/clone | POST | Copier une variante |
| /plans, /plans/:id | GET, POST, PATCH, DELETE | Calendrier |
| /history, /history/:id | GET, POST | Historique et tenue portée |
| /api/health | GET | État de l'application et de PostgreSQL |

Les listes sont paginées et filtrables. Les schémas Zod des modules valident les paramètres.

Les dates du calendrier s'échangent en YYYY-MM-DD et représentent un jour civil. Ne les convertis pas en heure locale. La page Aujourd'hui utilise le fuseau du profil.

Chaque opération vérifie l'appartenance des ressources au compte connecté. Les photos sont décodées et contrôlées avant stockage. Une tenue indisponible peut être planifiée avec avertissement ; sa composition est conservée quand elle est marquée comme portée.
