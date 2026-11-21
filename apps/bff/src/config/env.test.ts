import { loadEnv } from './env';

describe('loadEnv', () => {
  const valid = { GARMIN_PERSONAL_API_KEY: 'garmin-key', BFF_ACCESS_TOKEN: 'bff-token' };

  it('reads the required secrets and defaults the port', () => {
    expect(loadEnv(valid)).toEqual({
      garminPersonalApiKey: 'garmin-key',
      bffAccessToken: 'bff-token',
      port: 3000,
    });
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
    expect(() => loadEnv({ ...valid, PORT: 'abc' })).not.toThrow(/garmin-key|bff-token/);
  });
});
