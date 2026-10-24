# Activer la double authentification

Pour protéger l'administration, **chaque compte doit avoir une double authentification** : en plus du mot de passe, le site demande un code à 6 chiffres que seule votre application d'authentification sur votre téléphone peut produire. Sans elle, personne ne peut entrer avec votre mot de passe seul.

Tant que ce n'est pas fait, la seule page accessible est celle de la configuration, juste après votre mot de passe.

## Avant de commencer

- Installez une application d'authentification sur votre téléphone : Google Authenticator, Aegis, 1Password, Microsoft Authenticator… Toutes conviennent.
- Vérifiez que l'heure de votre téléphone est réglée sur « automatique » : les codes dépendent de l'heure, et un téléphone en retard de plus d'une minute produit des codes refusés.
- Prévoyez un endroit sûr pour noter vos codes de secours (voir [Codes de secours](codes-de-secours.md)).

## Configurer l'application

1. Connectez-vous avec votre email et votre mot de passe (voir [Se connecter](se-connecter.md)). Si votre compte n'a pas encore de double authentification, la page « Double authentification » s'affiche.
2. Dans votre application, ajoutez un compte et **scannez le code QR** affiché à l'écran. Si vous ne pouvez pas scanner, choisissez la saisie manuelle et recopiez la **clé** écrite sous le code QR (type de clé : basée sur l'heure). Le code QR est dessiné par le site lui-même : rien n'est envoyé à un service extérieur.
3. L'application affiche un code à 6 chiffres qui change toutes les 30 secondes. Saisissez-le dans « Code à 6 chiffres », puis choisissez « Activer la double authentification ».
4. La double authentification n'est enregistrée **que si le code est bon**. Si le site le refuse, vérifiez l'heure du téléphone et saisissez le code suivant.
5. Le site affiche alors **10 codes de secours, une seule fois**. Choisissez « Télécharger les codes (fichier texte) » ou notez-les, puis « Continuer ». Voir [Codes de secours](codes-de-secours.md).

Si vous quittez la page avant d'avoir saisi un code, la configuration n'est pas enregistrée : la prochaine connexion vous ramène à la même page, avec la même clé.

## Se connecter ensuite

1. Saisissez votre email et votre mot de passe.
2. Le site affiche « Code de vérification » : ouvrez l'application et saisissez le code à 6 chiffres.
3. Vous êtes connecté.

Bon à savoir :

- Un code ne fonctionne **qu'une seule fois**. Si vous venez de l'utiliser, attendez le code suivant (30 secondes au plus).
- Vous avez quelques minutes (5 par défaut) pour saisir le code après le mot de passe. Passé ce délai, il faut recommencer la connexion.
- Après plusieurs codes faux de suite (5 par défaut), le compte est **verrouillé** un moment (15 minutes par défaut) : même un bon code est alors refusé. Le message dit dans combien de temps réessayer. L'événement est noté dans le journal.
- Si vous n'avez plus votre téléphone, utilisez un code de secours.

## Changer de téléphone ou d'application

Menu avec votre nom, puis « Double authentification ».

1. Dans « Remplacer l'application d'authentification », saisissez un **code actuel** (de l'application, ou un code de secours), puis « Remplacer l'application ».
2. Refaites la configuration : scannez le nouveau code QR et saisissez le code affiché.
3. L'ancienne application cesse de fonctionner dès que la nouvelle est confirmée. Vos codes de secours restent valables.

Tant que la nouvelle application n'est pas confirmée, l'ancienne continue de fonctionner ; « Annuler le remplacement » abandonne le changement.

## Retirer la double authentification ?

Elle ne peut pas être retirée : chaque compte en a une. Vous ne pouvez pas non plus réinitialiser la vôtre. Une **autre** personne de l'administration peut le faire si vous avez perdu votre téléphone et vos codes de secours : voir [Gérer les comptes](gerer-les-comptes.md#réinitialiser-la-double-authentification-dune-autre-personne). Vous devrez alors la configurer de nouveau à votre prochaine connexion.
