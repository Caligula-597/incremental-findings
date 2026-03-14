import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { Submission, SubmissionFileRecord, AuditLog } from '@/lib/types';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, '.runtime-storage');
const SUBMISSIONS_FILE = join(DATA_DIR, 'submissions.json');
const SUBMISSION_FILES_FILE = join(DATA_DIR, 'submission-files.json');
const AUDIT_LOGS_FILE = join(DATA_DIR, 'audit-logs.json');

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
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
  ensureDir(DATA_DIR);
  return readJsonFile<Submission[]>(SUBMISSIONS_FILE, []);
}

export function writeRuntimeSubmissions(items: Submission[]) {
  writeJsonFile(SUBMISSIONS_FILE, items);
}

export function readRuntimeSubmissionFiles(): SubmissionFileRecord[] {
  ensureDir(DATA_DIR);
  return readJsonFile<SubmissionFileRecord[]>(SUBMISSION_FILES_FILE, []);
}

export function writeRuntimeSubmissionFiles(items: SubmissionFileRecord[]) {
  writeJsonFile(SUBMISSION_FILES_FILE, items);
}

export function readRuntimeAuditLogs(): AuditLog[] {
  ensureDir(DATA_DIR);
  return readJsonFile<AuditLog[]>(AUDIT_LOGS_FILE, []);
}

export function writeRuntimeAuditLogs(items: AuditLog[]) {
  writeJsonFile(AUDIT_LOGS_FILE, items);
}

export function getRuntimeStorageDir() {
  ensureDir(DATA_DIR);
  return DATA_DIR;
}
