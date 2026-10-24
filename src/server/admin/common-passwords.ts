// Bundled list of common passwords, refused by the password policy (compared in lower case).
// Only passwords of 12 characters or more matter: shorter ones are refused by the length rule.

const bases = [
  'password',
  'passw0rd',
  'motdepasse',
  'azertyuiop',
  'qwertyuiop',
  'qwerty',
  'azerty',
  'welcome',
  'bienvenue',
  'administrator',
  'administrateur',
  'admin',
  'letmein',
  'iloveyou',
  'jetaime',
  'changeme',
  'bonjour',
  'soleil',
  'football',
  'monkey',
  'dragon',
  'master',
  'superman',
  'batman',
  'trustno1',
  'sunshine',
  'princess',
  'whatever',
  'christophe',
  'secret',
  'default',
  'abc',
  'test',
  'login',
];

const suffixes = [
  '',
  '1',
  '12',
  '123',
  '1234',
  '12345',
  '123456',
  '2023',
  '2024',
  '2025',
  '2026',
  '!',
  '@123',
];

const literals = [
  '123456789012',
  '1234567890123',
  '12345678901234',
  '123456789123456789',
  '111111111111',
  '000000000000',
  '123123123123',
  '1q2w3e4r5t6y',
  '1qaz2wsx3edc',
  'qazwsxedcrfv',
  'zaq12wsxcde3',
  'qwertyuiopas',
  'qwertyuiop[]',
  'asdfghjklqwe',
  'azertyuiop12',
  'azertyuiopqs',
  'abcdefghijkl',
  'abcdefghijklmnop',
  'abcd12345678',
  'aaaaaaaaaaaa',
  'correcthorsebatterystaple',
  'thequickbrownfox',
  'passwordpassword',
  'motdepassemotdepasse',
  'iloveyouiloveyou',
  'changemechangeme',
  'administratorpassword',
  'welcometomywebsite',
  'letmeinletmein',
  'trustnobody1234',
  'mypasswordis123',
  'monmotdepasse123',
  'monmotdepasse1234',
  'unmotdepasse123',
  'p@ssw0rd1234',
  'p@ssword1234',
  'p@ssw0rd!2024',
  'password!1234',
  'password@1234',
  'passwordpassword1',
  'christopheart',
  'christopheart123',
  'christopheart2024',
  'christopheart2025',
  'christopheart2026',
  'christophe-art',
  'christophe-art1',
];

function build(): Set<string> {
  const all = new Set<string>(literals);
  for (const base of bases) {
    for (const suffix of suffixes) all.add(base + suffix);
    all.add(base + base);
  }
  return new Set([...all].filter((password) => password.length >= 12));
}

/** Lower-cased common passwords of 12 characters or more. */
export const commonPasswords: ReadonlySet<string> = build();

export function isCommonPassword(password: string): boolean {
  return commonPasswords.has(password.toLowerCase());
}
