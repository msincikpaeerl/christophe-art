// Interface text of the admin area. The admin is in French only; every text goes through `a(key)`.

export const messages = {
  'layout.title': 'Administration',
  'layout.skip': 'Aller au contenu',
  'layout.nav': "Navigation de l'administration",
  'layout.viewSite': 'Voir le site',
  'nav.accounts': 'Comptes',
  'nav.activity': 'Journal',
  'menu.account': 'Mon compte',
  'menu.password': 'Mon mot de passe',
  'menu.sessions': 'Mes sessions',
  'menu.logout': 'Se déconnecter',
  'menu.secondFactor': 'Double authentification',
  'menu.recovery': 'Codes de secours',

  'code.title': 'Code de vérification',
  'code.intro':
    'Ouvrez votre application d’authentification et saisissez le code à 6 chiffres affiché pour ce site.',
  'code.label': 'Code à 6 chiffres',
  'code.submit': 'Valider',
  'code.invalid': 'Code incorrect ou déjà utilisé.',
  'code.recoveryTitle': 'Vous n’avez plus votre application ?',
  'code.recoveryIntro':
    'Utilisez un de vos codes de secours. Chaque code ne fonctionne qu’une fois.',
  'code.recoveryLabel': 'Code de secours',
  'code.recoverySubmit': 'Utiliser ce code de secours',
  'code.expiresHint':
    'Cette étape se ferme au bout de quelques minutes : il faudra alors recommencer la connexion.',

  'factor.title': 'Double authentification',
  'factor.setupIntro':
    'Chaque compte doit avoir une double authentification. Installez une application d’authentification (Google Authenticator, Aegis, 1Password…), puis scannez le code QR.',
  'factor.mustSetup':
    'Vous devez activer la double authentification pour utiliser l’administration.',
  'factor.step1': '1. Scannez le code QR avec votre application',
  'factor.step1Text':
    'Si vous ne pouvez pas scanner, saisissez cette clé dans l’application (type de clé : basée sur l’heure).',
  'factor.key': 'Clé',
  'factor.step2': '2. Saisissez le code affiché par l’application',
  'factor.step2Text':
    'La double authentification n’est activée qu’après la saisie d’un code valide.',
  'factor.code': 'Code à 6 chiffres',
  'factor.confirm': 'Activer la double authentification',
  'factor.cancel': 'Annuler le remplacement',
  'factor.invalid': 'Code incorrect. Vérifiez l’heure de votre téléphone et réessayez.',
  'factor.noSetup': 'Aucune configuration en cours.',
  'factor.enabledTitle': 'Double authentification activée',
  'factor.enabledText': 'Votre compte demande un code de votre application à chaque connexion.',
  'factor.replacedDone': 'Application remplacée. Vos codes de secours restent valables.',
  'factor.recoveryTitle': 'Vos codes de secours',
  'factor.recoveryWarning':
    'Notez-les maintenant dans un endroit sûr : ils ne seront plus jamais affichés. Chaque code ne sert qu’une fois, à la place d’un code de l’application.',
  'factor.download': 'Télécharger les codes (fichier texte)',
  'factor.downloadName': 'codes-de-secours.txt',
  'factor.downloadHeader': 'Codes de secours de l’administration. Chaque code ne sert qu’une fois.',
  'factor.continue': 'Continuer',
  'factor.recoveryLink': 'Gérer mes codes de secours',
  'factor.replaceTitle': 'Remplacer l’application d’authentification',
  'factor.replaceText':
    'Pour changer de téléphone ou d’application, saisissez d’abord un code actuel : vous refaites ensuite la configuration.',
  'factor.replaceCode': 'Code actuel (application ou code de secours)',
  'factor.replace': 'Remplacer l’application',
  'factor.replacing': 'Remplacement en cours. L’ancienne application reste valable jusqu’à la fin.',
  'factor.needCurrent': 'Saisissez un code actuel.',

  'recovery.title': 'Codes de secours',
  'recovery.intro':
    'Les codes de secours remplacent un code de l’application si vous n’avez plus votre téléphone.',
  'recovery.remaining': 'Codes de secours restants',
  'recovery.warning':
    'Il reste peu de codes de secours. Générez-en un nouveau jeu avant d’être à court.',
  'recovery.none': 'Il ne reste aucun code de secours. Générez-en un nouveau jeu.',
  'recovery.regenerateTitle': 'Générer un nouveau jeu',
  'recovery.regenerateText':
    'Un nouveau jeu de 10 codes remplace l’ancien, qui cesse de fonctionner aussitôt.',
  'recovery.regenerate': 'Générer un nouveau jeu de codes',
  'recovery.newTitle': 'Votre nouveau jeu de codes',
  'recovery.usedWarning': 'L’ancien jeu ne fonctionne plus.',

  'login.title': 'Connexion',
  'login.intro': 'Connectez-vous pour gérer le site.',
  'login.email': 'Email',
  'login.password': 'Mot de passe',
  'login.submit': 'Se connecter',
  'login.invalid': 'Email ou mot de passe incorrect',

  'common.error': 'Erreur',
  'common.notice': 'Information',
  'common.never': 'Jamais',
  'common.unknownDevice': 'Appareil inconnu',
  'common.serverCommand': 'Commande serveur',
  'common.on': 'sur',

  'accounts.title': 'Comptes',
  'accounts.intro':
    'Toutes les personnes de cette liste ont les mêmes droits. Le site n’envoie jamais d’email : un mot de passe temporaire se transmet de la main à la main.',
  'accounts.create': 'Créer un compte',
  'accounts.list': 'Liste des comptes',
  'accounts.name': 'Nom',
  'accounts.email': 'Email de connexion',
  'accounts.status': 'Statut',
  'accounts.created': 'Créé le',
  'accounts.lastLogin': 'Dernière connexion',
  'accounts.actions': 'Actions',
  'accounts.active': 'Actif',
  'accounts.disabled': 'Désactivé',
  'accounts.you': 'vous',
  'accounts.disable': 'Désactiver',
  'accounts.enable': 'Réactiver',
  'accounts.reset': 'Réinitialiser le mot de passe',
  'accounts.secondFactor': 'Double authentification',
  'accounts.secondFactorOn': 'Activée',
  'accounts.secondFactorOff': 'Non configurée',
  'accounts.resetSecondFactor': 'Réinitialiser la double authentification',
  'accounts.secondFactorResetDone':
    'Double authentification réinitialisée. Les sessions du compte sont fermées : la personne devra la configurer à sa prochaine connexion.',
  'accounts.disabledDone': 'Compte désactivé. Ses sessions sont fermées.',
  'accounts.enabledDone': 'Compte réactivé.',
  'accounts.temporaryTitle': 'Mot de passe temporaire',
  'accounts.temporaryWarning':
    'Notez-le maintenant : il ne sera plus affiché. La personne devra le changer à sa prochaine connexion.',
  'accounts.temporaryFor': 'Compte concerné',
  'accounts.back': 'Retour à la liste des comptes',

  'new.title': 'Créer un compte',
  'new.name': 'Nom affiché',
  'new.email': 'Email de connexion',
  'new.emailHint':
    'Sert uniquement à se connecter : le site n’envoie jamais d’email à cette adresse.',
  'new.submit': 'Créer le compte',
  'new.done': 'Compte créé.',

  'password.title': 'Mon mot de passe',
  'password.mustChange':
    'Votre mot de passe est temporaire. Choisissez-en un nouveau pour continuer.',
  'password.current': 'Mot de passe actuel',
  'password.new': 'Nouveau mot de passe',
  'password.newHint': 'De 12 à 128 caractères. Une phrase facile à retenir convient très bien.',
  'password.confirm': 'Nouveau mot de passe, une seconde fois',
  'password.submit': 'Changer le mot de passe',
  'password.done': 'Mot de passe modifié. Vos autres sessions ont été fermées.',

  'sessions.title': 'Mes sessions',
  'sessions.intro':
    'Les appareils connectés à votre compte. Fermez ceux que vous ne reconnaissez pas ou que vous n’utilisez plus.',
  'sessions.list': 'Vos sessions ouvertes',
  'sessions.device': 'Appareil',
  'sessions.ip': 'Adresse IP',
  'sessions.opened': 'Ouverte le',
  'sessions.lastActivity': 'Dernière activité',
  'sessions.current': 'Session actuelle',
  'sessions.revoke': 'Fermer',
  'sessions.revoked': 'Session fermée.',

  'activity.title': 'Journal d’activité',
  'activity.intro':
    'Les actions sur les comptes : connexions, échecs, créations, désactivations, réinitialisations, changements de mot de passe et sessions fermées.',
  'activity.list': 'Journal',
  'activity.date': 'Date',
  'activity.who': 'Qui',
  'activity.what': 'Action',
  'activity.target': 'Cible',
  'activity.ip': 'Adresse IP',
  'activity.empty': 'Aucune activité pour le moment.',
  'activity.pagination': 'Pagination du journal',
  'activity.previous': 'Page précédente',
  'activity.next': 'Page suivante',

  'action.login': 'Connexion',
  'action.login_failed': 'Échec de connexion',
  'action.logout': 'Déconnexion',
  'action.account_created': 'Compte créé',
  'action.account_disabled': 'Compte désactivé',
  'action.account_enabled': 'Compte réactivé',
  'action.password_reset': 'Mot de passe réinitialisé',
  'action.password_changed': 'Mot de passe modifié',
  'action.session_revoked': 'Session fermée',
  'action.totp_enabled': 'Double authentification activée',
  'action.totp_replaced': 'Application d’authentification remplacée',
  'action.totp_failed': 'Code de double authentification incorrect',
  'action.totp_locked': 'Compte verrouillé après trop de codes incorrects',
  'action.recovery_used': 'Code de secours utilisé',
  'action.recovery_regenerated': 'Nouveau jeu de codes de secours',
  'action.totp_reset': 'Double authentification réinitialisée',

  'error.invalid_name': 'Le nom affiché est vide ou dépasse 80 caractères.',
  'error.invalid_email': 'Cette adresse email n’est pas valide.',
  'error.email_taken': 'Un compte utilise déjà cet email de connexion.',
  'error.not_found': 'Cet élément est introuvable.',
  'error.last_active': 'Le dernier compte actif ne peut pas être désactivé.',
  'error.own_account':
    'Pour changer votre propre mot de passe, utilisez « Mon mot de passe » dans le menu.',
  'error.wrong_current_password': 'Le mot de passe actuel est incorrect.',
  'error.same_password': 'Le nouveau mot de passe doit être différent de l’actuel.',
  'error.too_short': 'Le nouveau mot de passe doit contenir au moins 12 caractères.',
  'error.too_long': 'Le nouveau mot de passe doit contenir 128 caractères au plus.',
  'error.too_common': 'Ce mot de passe est trop courant. Choisissez-en un autre.',
  'error.own_second_factor':
    'Vous ne pouvez pas retirer votre propre double authentification : ce compte n’en aurait plus. Pour changer d’application, utilisez « Remplacer l’application ».',
  'error.no_second_factor': 'Ce compte n’a pas de double authentification.',
  'error.mismatch': 'Les deux saisies du nouveau mot de passe ne sont pas identiques.',
  'error.missing': 'Veuillez remplir tous les champs.',
} as const;

export type AdminMessageKey = keyof typeof messages;

/** The interface text for a key. */
export function a(key: AdminMessageKey): string {
  return messages[key];
}

/** The text for an error code from the account functions or the password form. */
export function errorText(code: string): string {
  const key = `error.${code}`;
  return key in messages ? messages[key as AdminMessageKey] : messages['error.not_found'];
}

/** The text for an activity action code; an unknown code is shown as it is. */
export function actionText(code: string): string {
  const key = `action.${code}`;
  return key in messages ? messages[key as AdminMessageKey] : code;
}

/** "Trop de tentatives. Réessayez dans 12 minutes." for a wait in seconds. */
export function limitedText(retryAfterSeconds: number): string {
  if (retryAfterSeconds < 60) {
    const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
    return `Trop de tentatives de connexion. Réessayez dans ${String(seconds)} seconde${seconds > 1 ? 's' : ''}.`;
  }
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Trop de tentatives de connexion. Réessayez dans ${String(minutes)} minute${minutes > 1 ? 's' : ''}.`;
}

/** "Trop de codes incorrects. Réessayez dans 15 minutes." for a wait in seconds. */
export function codeLimitedText(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop de codes incorrects : ce compte est verrouillé. Réessayez dans ${String(minutes)} minute${minutes > 1 ? 's' : ''}.`;
}

/** "Page 2 sur 5". */
export function pageText(page: number, pageCount: number): string {
  return `Page ${String(page)} sur ${String(pageCount)}`;
}

const dateTime = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

/** A date and time in French, in Paris time. */
export function dateTimeText(date: Date): string {
  return dateTime.format(date);
}
