# Operations Runbook (P2)

## 1) Migration governance
- Source of truth: `supabase/migrations/*`
- Release gate requires: lint + typecheck + build + smoke
- Every production deploy should apply pending migrations before traffic shift.

## 2) Audit retention / archival
- Online retention default: 90 days (`AUDIT_LOG_ONLINE_RETENTION_DAYS`).
- Archive table: `public.audit_logs_archive`.
- SQL helper function: `public.archive_audit_logs(retention_days int)`.

### Manual archive command
```sql
select public.archive_audit_logs(90);
```

### Scripted archive SQL generation
```bash
AUDIT_LOG_ONLINE_RETENTION_DAYS=90 node scripts/audit-archive-sql.mjs
```

## 3) Recommended schedule
- Daily: archive old audit logs.
- Weekly: export metadata snapshots and indexing payloads to cold storage.
- Per release: run UAT runbook + smoke checks.


## 4) CI quality gate
- Workflow: `.github/workflows/quality-gate.yml`
- Checks: `verify:migrations`, `lint`, `typecheck`, `build`, `smoke`
- Local preflight: `npm run verify:migrations && npm run lint && npm run typecheck && npm run build` then `SMOKE_BASE_URL=http://127.0.0.1:3000 npm run smoke`
