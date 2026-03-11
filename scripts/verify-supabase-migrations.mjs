#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'supabase', 'migrations');
if (!fs.existsSync(dir)) {
  console.error('[migrations] missing directory supabase/migrations');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
if (files.length === 0) {
  console.error('[migrations] no sql migrations found');
  process.exit(1);
}

const expected = [
  '202603090001_auth_alignment_and_rls.sql',
  '202603090002_submissions_normalization_rls_audit.sql',
  '202603090003_ethics_cases_and_policy_support.sql',
  '202603090004_audit_archive_and_ops.sql',
  '202603090005_editor_applications_and_invites.sql'
];

for (const name of expected) {
  if (!files.includes(name)) {
    console.error(`[migrations] required migration missing: ${name}`);
    process.exit(1);
  }
}

const pattern = /^\d{12}_[a-z0-9_]+\.sql$/;
for (const file of files) {
  if (!pattern.test(file)) {
    console.error(`[migrations] invalid naming format: ${file}`);
    process.exit(1);
  }
}

console.log(`[migrations] ok (${files.length} files)`);
