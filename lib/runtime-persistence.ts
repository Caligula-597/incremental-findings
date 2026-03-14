import { accessSync, constants, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { Submission, SubmissionFileRecord, AuditLog } from '@/lib/types';

const ROOT = process.cwd();
const STORAGE_DIRNAME = '.runtime-storage';

const configuredDir = (process.env.RUNTIME_STORAGE_DIR ?? '').trim();
const candidateDirs = [configuredDir, join(ROOT, STORAGE_DIRNAME), join('/tmp', 'incremental-findings', STORAGE_DIRNAME)].filter(Boolean);

let resolvedDataDir: string | null = null;

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function isWritableDir(path: string) {
  try {
    ensureDir(path);
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function getDataDir() {
  if (resolvedDataDir) return resolvedDataDir;

  for (const candidate of candidateDirs) {
    if (isWritableDir(candidate)) {
      resolvedDataDir = candidate;
      return candidate;
    }
  }

  throw new Error(
    `No writable runtime storage directory found. Tried: ${candidateDirs.join(', ') || '(none)'}. Set RUNTIME_STORAGE_DIR to a writable path.`
  );
}

function readJsonFile<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(path: string, value: unknown) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf8');
}

export function readRuntimeSubmissions(): Submission[] {
  return readJsonFile<Submission[]>(join(getDataDir(), 'submissions.json'), []);
}

export function writeRuntimeSubmissions(items: Submission[]) {
  writeJsonFile(join(getDataDir(), 'submissions.json'), items);
}

export function readRuntimeSubmissionFiles(): SubmissionFileRecord[] {
  return readJsonFile<SubmissionFileRecord[]>(join(getDataDir(), 'submission-files.json'), []);
}

export function writeRuntimeSubmissionFiles(items: SubmissionFileRecord[]) {
  writeJsonFile(join(getDataDir(), 'submission-files.json'), items);
}

export function readRuntimeAuditLogs(): AuditLog[] {
  return readJsonFile<AuditLog[]>(join(getDataDir(), 'audit-logs.json'), []);
}

export function writeRuntimeAuditLogs(items: AuditLog[]) {
  writeJsonFile(join(getDataDir(), 'audit-logs.json'), items);
}

export function getRuntimeStorageDir() {
  return getDataDir();
}
