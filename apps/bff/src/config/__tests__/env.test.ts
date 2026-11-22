import { loadEnv } from '../env';

describe('loadEnv', () => {
  const TOKEN = 'a'.repeat(32);
  const valid = { GARMIN_PERSONAL_API_KEY: 'garmin-key', BFF_ACCESS_TOKEN: TOKEN };

  it('reads the required secrets and defaults the port and the git SHA', () => {
    expect(loadEnv(valid)).toEqual({
      garminPersonalApiKey: 'garmin-key',
      bffAccessToken: TOKEN,
      port: 3000,
      gitSha: 'unknown',
    });
  });

  it('reads the git SHA the image was built from', () => {
    const sha = '3f9c2a1b7d4e5f60718293a4b5c6d7e8f9012345';
    expect(loadEnv({ ...valid, GIT_SHA: sha }).gitSha).toBe(sha);
  });

  it('treats an empty git SHA as unknown', () => {
    expect(loadEnv({ ...valid, GIT_SHA: '' }).gitSha).toBe('unknown');
  });

  it('reads the port when given', () => {
    expect(loadEnv({ ...valid, PORT: '8080' }).port).toBe(8080);
  });

  it.each(['GARMIN_PERSONAL_API_KEY', 'BFF_ACCESS_TOKEN'])('fails fast, naming it, when %s is missing', (name) => {
    const raw: Record<string, string | undefined> = { ...valid };
    delete raw[name];
    expect(() => loadEnv(raw)).toThrow(name);
  });

  it('treats an empty variable as missing', () => {
    expect(() => loadEnv({ ...valid, BFF_ACCESS_TOKEN: '' })).toThrow('BFF_ACCESS_TOKEN');
  });

  it('lists every missing variable at once', () => {
    expect(() => loadEnv({})).toThrow(/GARMIN_PERSONAL_API_KEY.*BFF_ACCESS_TOKEN/s);
  });

  it('rejects a port that is not a valid number, without echoing secrets', () => {
    expect(() => loadEnv({ ...valid, PORT: 'abc' })).toThrow('PORT');
    expect(() => loadEnv({ ...valid, PORT: 'abc' })).not.toThrow(/garmin-key|a{32}/);
  });

  it('accepts a token of exactly 32 characters', () => {
    expect(loadEnv({ ...valid, BFF_ACCESS_TOKEN: 'b'.repeat(32) }).bffAccessToken).toBe('b'.repeat(32));
  });

  it('rejects a token shorter than 32 characters, without echoing it', () => {
    const short = 'c'.repeat(31);
    expect(() => loadEnv({ ...valid, BFF_ACCESS_TOKEN: short })).toThrow(/BFF_ACCESS_TOKEN.*32/);
    expect(() => loadEnv({ ...valid, BFF_ACCESS_TOKEN: short })).not.toThrow(short);
  });

  it('rejects the placeholder copied from .env.example', () => {
    expect(() => loadEnv({ ...valid, BFF_ACCESS_TOKEN: 'replace-with-a-long-random-string' })).toThrow(
      /BFF_ACCESS_TOKEN.*placeholder/,
    );
  });
});
