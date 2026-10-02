import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getBackupStatus, parseStamp } from '@/modules/backups/service';
import {
  describeError,
  fingerprintOf,
  isControlFlow,
  normalizeMessage,
  stripQuery,
} from '@/modules/errors/service';

describe('error grouping', () => {
  it('gives repeats of one bug the same fingerprint despite changing ids and values', () => {
    const a = fingerprintOf(
      'TypeError',
      "Cannot read 'title' of course cm1abcdefghijklmnopqrstuv at row 12",
      '/courses/[slug]',
    );
    const b = fingerprintOf(
      'TypeError',
      "Cannot read 'name' of course cm9zyxwvutsrqponmlkjihgfe at row 7",
      '/courses/[slug]',
    );
    expect(a).toBe(b);
    expect(normalizeMessage('slot 3f2b8c1e-1d2a-4b5c-9e8f-0a1b2c3d4e5f gone')).toBe(
      'slot <uuid> gone',
    );
  });

  it('keeps different routes and error types apart', () => {
    const base = fingerprintOf('Error', 'boom', '/news');
    expect(fingerprintOf('Error', 'boom', '/events')).not.toBe(base);
    expect(fingerprintOf('TypeError', 'boom', '/news')).not.toBe(base);
  });

  it('never keeps a query string or fragment', () => {
    expect(stripQuery('/account/login?next=/x&token=secret#y')).toBe('/account/login');
    expect(stripQuery(undefined)).toBeNull();
  });

  it('ignores Next.js redirects and not-found, and describes non-Error values', () => {
    expect(
      isControlFlow(
        Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/x;307;' }),
      ),
    ).toBe(true);
    expect(
      isControlFlow(Object.assign(new Error('x'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })),
    ).toBe(true);
    expect(isControlFlow(Object.assign(new Error('x'), { digest: '2849371' }))).toBe(false);
    expect(describeError('plain string')).toMatchObject({
      name: 'NonError',
      message: 'plain string',
    });
    expect(describeError(new Error('x'.repeat(5000))).message.length).toBeLessThanOrEqual(1001);
  });
});

describe('backup status', () => {
  let dir: string;
  const now = new Date('2026-10-02T08:00:00Z');

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'bdc-backup-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('parses the UTC stamp in file names', () => {
    expect(parseStamp('20261002-003015').toISOString()).toBe('2026-10-02T00:30:15.000Z');
  });

  it('is unconfigured without BACKUP_DIR and alarming when the folder is missing', async () => {
    expect(await getBackupStatus({})).toEqual({ configured: false });
    const missing = await getBackupStatus({ BACKUP_DIR: path.join(dir, 'nope') }, now);
    expect(missing).toMatchObject({ configured: true, readable: false, stale: true });
  });

  it('lists backups newest first and flags staleness and failures', async () => {
    await writeFile(path.join(dir, 'db-20260930-000000.dump'), 'old');
    await writeFile(path.join(dir, 'db-20261002-000000.dump'), 'newest');
    await writeFile(path.join(dir, 'files-20261002-000000.tar.gz'), 'f');
    await writeFile(path.join(dir, 'notes.txt'), 'ignored');

    const fresh = await getBackupStatus({ BACKUP_DIR: dir }, now);
    if (!fresh.configured || !fresh.readable) throw new Error('expected a readable folder');
    expect(fresh.database.map((f) => f.name)).toEqual([
      'db-20261002-000000.dump',
      'db-20260930-000000.dump',
    ]);
    expect(fresh.database[0]?.size).toBe(6);
    expect(fresh.files).toHaveLength(1);
    expect(fresh.stale).toBe(false);
    expect(fresh.failure).toBeNull();

    // Two days later, with no new dump: stale. The file time does not matter, only the name.
    await utimes(path.join(dir, 'db-20261002-000000.dump'), now, now);
    const later = await getBackupStatus({ BACKUP_DIR: dir }, new Date('2026-10-04T08:00:00Z'));
    expect(later).toMatchObject({ stale: true });

    await writeFile(path.join(dir, 'last-failure.txt'), '2026-10-03 pg_dump: connection refused\n');
    const failed = await getBackupStatus({ BACKUP_DIR: dir }, now);
    expect(failed).toMatchObject({ failure: '2026-10-03 pg_dump: connection refused' });
  });
});
