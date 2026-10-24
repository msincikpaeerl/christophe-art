export interface Device {
  browser: string | undefined;
  system: string | undefined;
}

// Order matters: Edge and Opera also say "Chrome", Chrome also says "Safari".
const browsers: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

// Android and iPhone/iPad also say "Linux" or "Mac OS X".
const systems: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux|X11/, 'Linux'],
];

/** A short description (browser and system) of the device behind a User-Agent header. */
export function describeDevice(userAgent: string): Device {
  return {
    browser: browsers.find(([pattern]) => pattern.test(userAgent))?.[1],
    system: systems.find(([pattern]) => pattern.test(userAgent))?.[1],
  };
}
