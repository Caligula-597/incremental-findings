#!/usr/bin/env node

const retentionDays = Number(process.env.AUDIT_LOG_ONLINE_RETENTION_DAYS ?? '90') || 90;

const sql = `-- Generated archive SQL\n-- retentionDays=${retentionDays}\n\nbegin;\n\ninsert into public.audit_logs_archive (id, submission_id, action, actor_email, detail, created_at, archived_at)\nselect a.id, a.submission_id, a.action, a.actor_email, a.detail, a.created_at, now()\nfrom public.audit_logs a\nwhere a.created_at < now() - interval '${retentionDays} days'\n  and not exists (select 1 from public.audit_logs_archive ar where ar.id = a.id);\n\ndelete from public.audit_logs\nwhere created_at < now() - interval '${retentionDays} days';\n\ncommit;\n`;

process.stdout.write(sql);
