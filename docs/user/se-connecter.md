# Se connecter

L'espace d'administration sert à gérer le site. Son adresse est celle du site suivie de `/admin`, par exemple `https://christophe.art/admin`. Les moteurs de recherche ne l'affichent pas.

## Première connexion

Un compte est créé pour vous par une autre personne de l'administration (voir [Gérer les comptes](gerer-les-comptes.md)), ou par la personne qui installe le site. On vous remet un **mot de passe temporaire** de 16 caractères.

1. Ouvrez la page `/admin`. Elle vous mène à la page « Connexion ».
2. Saisissez votre email de connexion et le mot de passe temporaire, puis choisissez « Se connecter ».
3. Le site vous demande d'abord d'**activer la double authentification** (voir [Activer la double authentification](activer-la-double-authentification.md)). Tant que ce n'est pas fait, aucune autre page n'est accessible.
4. Il vous demande ensuite de choisir un nouveau mot de passe. Tant que ce n'est pas fait, aucune autre page n'est accessible.
5. Saisissez le mot de passe temporaire dans « Mot de passe actuel », puis votre nouveau mot de passe deux fois, et choisissez « Changer le mot de passe ».

Votre email de connexion ne sert qu'à vous identifier : le site n'envoie jamais d'email.

## Choisir un bon mot de passe

- Entre 12 et 128 caractères.
- Pas un mot de passe trop courant (par exemple « motdepasse1234 » est refusé).
- Une phrase facile à retenir, que personne ne connaît, convient très bien.

## Se connecter ensuite

Saisissez votre email et votre mot de passe sur la page « Connexion », puis le code à 6 chiffres de votre application d'authentification (ou un [code de secours](codes-de-secours.md)). Vous n'êtes connecté qu'après un code valable. Si l'email ou le mot de passe est faux, le message est toujours le même : « Email ou mot de passe incorrect ». Le site ne dit pas lequel est faux, ni si le compte existe.

Après plusieurs échecs, la connexion est bloquée un moment pour ce compte et pour votre adresse. Le message indique dans combien de temps vous pourrez réessayer, par exemple « Réessayez dans 12 minutes ». Si vous avez oublié votre mot de passe, demandez à une autre personne de l'administration de le réinitialiser.

## Rester connecté

Vous êtes déconnecté automatiquement après une période sans activité (une heure par défaut) et au bout d'une durée maximale (12 heures par défaut), même si vous travaillez. Il suffit de vous reconnecter.

## Changer votre mot de passe

Ouvrez le menu avec votre nom, en haut à droite, puis « Mon mot de passe ». Saisissez votre mot de passe actuel, puis le nouveau deux fois. Vos **autres** sessions (sur d'autres appareils) sont fermées ; celle que vous utilisez reste ouverte.

## Voir et fermer vos sessions

Menu avec votre nom, puis « Mes sessions » : la liste des appareils connectés à votre compte, avec leur dernière activité. Choisissez « Fermer » en face de ceux que vous ne reconnaissez pas ou que vous n'utilisez plus. Si vous fermez la session que vous utilisez, vous êtes déconnecté.

## Se déconnecter

Menu avec votre nom, puis « Se déconnecter ». Faites-le toujours sur un ordinateur partagé.

Sur téléphone, l'espace d'administration s'affiche de la même façon, avec un menu qui se replie.
