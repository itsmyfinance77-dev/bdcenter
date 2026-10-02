import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Read-only view of the backup folder written by deploy/backup/backup.sh
 * (mounted into the app at BACKUP_DIR). The app never writes there; it only
 * reports whether backups are recent, so a silent failure shows up in the panel.
 */

type Env = Record<string, string | undefined>;

/** A daily job that has missed one run still counts as healthy; two do not. */
export const BACKUP_STALE_HOURS = 36;

const DB_FILE = /^db-(\d{8}-\d{6})\.dump$/;
const FILES_FILE = /^files-(\d{8}-\d{6})\.tar\.gz$/;
const FAILURE_FILE = 'last-failure.txt';

export type BackupFile = { name: string; takenAt: Date; size: number };

export type BackupStatus =
  | { configured: false }
  | {
      configured: true;
      readable: boolean;
      database: BackupFile[];
      files: BackupFile[];
      /** Content of last-failure.txt, written when the latest run failed. */
      failure: string | null;
      stale: boolean;
    };

/** "20261002-003000" (UTC, as the script names files) -> Date. */
export function parseStamp(stamp: string): Date {
  return new Date(
    stamp.replace(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/, '$1-$2-$3T$4:$5:$6Z'),
  );
}

export async function getBackupStatus(
  env: Env = process.env,
  now = new Date(),
): Promise<BackupStatus> {
  const dir = env.BACKUP_DIR?.trim();
  if (!dir) return { configured: false };

  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return {
      configured: true,
      readable: false,
      database: [],
      files: [],
      failure: null,
      stale: true,
    };
  }

  async function collect(pattern: RegExp): Promise<BackupFile[]> {
    const found: BackupFile[] = [];
    for (const name of names) {
      const match = pattern.exec(name);
      if (!match) continue;
      const info = await stat(path.join(dir!, name)).catch(() => null);
      if (!info?.isFile()) continue;
      found.push({ name, takenAt: parseStamp(match[1] ?? ''), size: info.size });
    }
    return found.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  }

  const [database, files] = await Promise.all([collect(DB_FILE), collect(FILES_FILE)]);
  const failure = names.includes(FAILURE_FILE)
    ? (await readFile(path.join(dir, FAILURE_FILE), 'utf8').catch(() => ''))
        .trim()
        .slice(0, 2000) || 'unknown failure'
    : null;
  const newest = database[0]?.takenAt;
  const stale = !newest || now.getTime() - newest.getTime() > BACKUP_STALE_HOURS * 60 * 60 * 1000;

  return { configured: true, readable: true, database, files, failure, stale };
}
