# Modèle de données

Better Auth gère les comptes et sessions ; PostgreSQL contient aussi les préférences et la garde-robe.

| Tables | Rôle |
| --- | --- |
| UserPreference | Fuseau horaire, thème et emplacement par défaut |
| WardrobeLocation | Emplacements du compte |
| WardrobeItem, ItemImage | Vêtements et références des photos privées |
| Outfit, OutfitVariant, OutfitVariantItem | Tenues et composition de leurs variantes |
| OutfitPlan | Variante prévue pour une date et un créneau |
| WearLog, WearLogItem | Tenue portée et copie de sa composition |

Chaque donnée métier porte un userId. Les clés étrangères composées isolent les comptes. Vêtements, emplacements et tenues sont archivés ; retirer une planification ne supprime pas l'historique.

Les dates sont stockées en PostgreSQL DATE, sans heure ni fuseau. Les migrations gardent les index uniques partiels pour l'emplacement et la variante par défaut. Préserve-les lors des changements de schéma.
