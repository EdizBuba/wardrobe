# État du projet

Wardrobe est déployé sur https://wardrobe.ediz-buba.com. Le MVP comprend les comptes, les préférences, les emplacements, les vêtements avec photos privées, les tenues et variantes, le calendrier, la page Aujourd'hui et l'historique.

Les contrôles locaux passent : lint, vérification TypeScript, 20 tests unitaires et d'interface, 9 tests d'intégration PostgreSQL et build de production. La CI exécute aussi le parcours complet avec Chromium. Les vérifications de production couvrent HTTPS, les migrations, l'authentification, l'isolation entre comptes et la persistance de la base et des photos après redémarrage.

Une fusion dans main déclenche le déploiement après le contrôle verify.

L'installation PWA sur un téléphone physique et les tests de charge restent à faire. Le partage, les statistiques avancées, la météo, l'import d'URL et le mode hors ligne ne sont pas prévus dans le MVP. Les procédures sont dans [deployment.md](deployment.md).
