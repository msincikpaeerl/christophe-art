# Gérer les comptes

Plusieurs personnes peuvent administrer le site. **Tous les comptes ont les mêmes droits** : chacun peut créer, désactiver ou réinitialiser les autres. Ouvrez la section « Comptes » du menu.

Chaque compte a un nom affiché, un email de connexion (jamais utilisé pour envoyer un message), un statut (actif ou désactivé), une date de création et une date de dernière connexion.

## Créer un compte

1. Dans « Comptes », choisissez « Créer un compte ».
2. Saisissez le nom affiché et l'email de connexion, puis « Créer le compte ».
3. Le site affiche un **mot de passe temporaire**. Notez-le tout de suite : il n'est affiché qu'une seule fois. Transmettez-le de la main à la main à la personne (le site n'envoie aucun email).

À sa première connexion, la personne devra choisir son propre mot de passe (voir [Se connecter](se-connecter.md)).

## Désactiver et réactiver un compte

Dans la liste, choisissez « Désactiver » en face du compte. Ses sessions ouvertes sont fermées **immédiatement** et il ne peut plus se connecter. Choisissez « Réactiver » pour lui rendre l'accès ; son mot de passe est conservé.

Le **dernier compte actif** ne peut pas être désactivé : il faut toujours qu'au moins une personne puisse se connecter.

## Réinitialiser le mot de passe d'une autre personne

Dans la liste, choisissez « Réinitialiser le mot de passe » en face du compte. Le site affiche un nouveau mot de passe temporaire (une seule fois). Les sessions de la personne sont fermées et elle devra le changer à sa prochaine connexion. Pour votre propre mot de passe, utilisez « Mon mot de passe » dans le menu.

## Réinitialiser un mot de passe depuis le serveur

Si plus personne ne peut se connecter, la personne qui gère le serveur peut créer un compte ou réinitialiser un mot de passe avec une commande. Voir [la mise en place](../dev/setup.md#admin-accounts).

## Le journal d'activité

La section « Journal » liste, de la plus récente à la plus ancienne, les actions sur les comptes : connexions, échecs de connexion, créations, désactivations et réactivations, réinitialisations, changements de mot de passe et sessions fermées. Pour chacune : la date, qui l'a faite, l'action, la personne concernée et l'adresse IP. Le journal est découpé en pages de 25 lignes ; utilisez « Page précédente » et « Page suivante ». Une action faite depuis le serveur est notée « Commande serveur ».
