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
