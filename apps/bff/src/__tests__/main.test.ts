import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TOKEN = 'a'.repeat(32);

/** Lets the promise chain started by `bootstrap()` on import settle. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('main (boot)', () => {
  const KEYS = ['GARMIN_PERSONAL_API_KEY', 'BFF_ACCESS_TOKEN', 'PORT'] as const;
  const originalValues = KEYS.map((key) => process.env[key]);
  const originalCwd = process.cwd();
  let workDir: string;
  let listen: jest.Mock;
  let enableShutdownHooks: jest.Mock;
  let create: jest.Mock;
  let consoleError: jest.SpyInstance;
  let exit: jest.SpyInstance;

  /** Imports main.ts afresh: it boots as a side effect, like `node dist/main.js`. */
  async function boot(): Promise<void> {
    jest.isolateModules(() => {
      jest.doMock('@nestjs/core', () => ({
        ...jest.requireActual('@nestjs/core'),
        NestFactory: { create },
      }));
      jest.requireActual('../main');
    });
    await settle();
  }

  beforeEach(() => {
    KEYS.forEach((key) => delete process.env[key]);
    workDir = mkdtempSync(join(tmpdir(), 'bff-main-'));
    process.chdir(workDir);

    listen = jest.fn().mockResolvedValue(undefined);
    enableShutdownHooks = jest.fn();
    create = jest.fn().mockResolvedValue({ enableShutdownHooks, listen });
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(workDir, { recursive: true, force: true });
    KEYS.forEach((key, i) => {
      if (originalValues[i] === undefined) delete process.env[key];
      else process.env[key] = originalValues[i];
    });
    jest.dontMock('@nestjs/core');
    jest.restoreAllMocks();
  });

  it('listens on PORT when the environment is complete', async () => {
    Object.assign(process.env, { GARMIN_PERSONAL_API_KEY: 'garmin-key', BFF_ACCESS_TOKEN: TOKEN, PORT: '4321' });

    await boot();

    expect(create).toHaveBeenCalledTimes(1);
    expect(enableShutdownHooks).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(4321);
    expect(exit).not.toHaveBeenCalled();
  });

  it('reads a .env.local in the working directory', async () => {
    writeFileSync(
      join(workDir, '.env.local'),
      `GARMIN_PERSONAL_API_KEY=garmin-key\nBFF_ACCESS_TOKEN=${TOKEN}\nPORT=5555\n`,
    );

    await boot();

    expect(listen).toHaveBeenCalledWith(5555);
  });

  it('lets variables already in the environment win over .env.local', async () => {
    writeFileSync(
      join(workDir, '.env.local'),
      `GARMIN_PERSONAL_API_KEY=from-file\nBFF_ACCESS_TOKEN=${TOKEN}\nPORT=5555\n`,
    );
    process.env.PORT = '6666';

    await boot();

    expect(listen).toHaveBeenCalledWith(6666);
  });

  it('fails fast, before anything listens, when a required variable is missing', async () => {
    await boot();

    expect(create).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('GARMIN_PERSONAL_API_KEY'));
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('BFF_ACCESS_TOKEN'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits 1 and prints a failure that is not an Error as it is', async () => {
    Object.assign(process.env, { GARMIN_PERSONAL_API_KEY: 'garmin-key', BFF_ACCESS_TOKEN: TOKEN });
    create.mockRejectedValue('port already in use');

    await boot();

    expect(consoleError).toHaveBeenCalledWith('port already in use');
    expect(exit).toHaveBeenCalledWith(1);
  });
});
