import { describe, expect, it } from 'vitest';
import { describeDevice } from './device.ts';

describe('describeDevice', () => {
  it.each([
    [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      { browser: 'Chrome', system: 'Linux' },
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0',
      { browser: 'Edge', system: 'Windows' },
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1',
      { browser: 'Safari', system: 'iOS' },
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
      { browser: 'Chrome', system: 'Android' },
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0',
      {
        browser: 'Firefox',
        system: 'macOS',
      },
    ],
    ['curl/8.0', { browser: undefined, system: undefined }],
  ])('describes %s', (userAgent, expected) => {
    expect(describeDevice(userAgent)).toEqual(expected);
  });
});
