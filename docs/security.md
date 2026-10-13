# Sécurité

Better Auth gère mots de passe, sessions, confirmation et réinitialisation. En production, les cookies sont sécurisés, l'adresse doit être confirmée et le changement de mot de passe invalide les sessions. Les opérations sensibles sont limitées en fréquence.

Chaque route privée vérifie la session et filtre les données par userId. Les identifiants reçus sont contrôlés ; les clés étrangères composées isolent aussi les comptes dans PostgreSQL.

Les photos sont limitées, vérifiées et converties en WebP sans métadonnées. Elles restent privées et leur lecture vérifie le propriétaire.

Les secrets et fichiers .env restent hors de Git. PostgreSQL et Next.js ne sont pas exposés ; seul Caddy publie les ports web 80 et 443.
