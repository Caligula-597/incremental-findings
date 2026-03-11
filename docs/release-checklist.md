# Release Checklist (P0)

> 目标：确保上线前具备最小可用与可回滚能力。

## 1) Environment / Secrets
- [ ] Vercel Production 配置完成：`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `EDITOR_ACCESS_CODE`。
- [ ] ORCID 生产回调地址已与 `ORCID_REDIRECT_URI` 对齐。
- [ ] `DOI_PLACEHOLDER_PREFIX` 已设置（上线前使用占位 publication ID）。
- [ ] 关键密钥未出现在前端可见环境变量中。

## 2) Database / Supabase
- [ ] 执行 migration: `202603090001_auth_alignment_and_rls.sql`。
- [ ] 执行 migration: `202603090002_submissions_normalization_rls_audit.sql`。
- [ ] 执行 migration: `202603090003_ethics_cases_and_policy_support.sql`。
- [ ] 执行 migration: `202603090004_audit_archive_and_ops.sql`。
- [ ] 核验 RLS policy 生效（user_accounts/orcid_links/submissions/submission_files）。
- [ ] 核验 Storage bucket 与上传路径策略（papers）。

## 3) API/Runtime Smoke
- [ ] `GET /api/public/supabase-health` 返回 `runtime` 与 `productionGate`。
- [ ] `GET /api/public/integrations/requirements` 返回 provider readiness。
- [ ] `GET /api/public/journal-standards` 返回四大模块基线。
- [ ] 作者链路：register/login/session 正常。
- [ ] ORCID 链路：start/callback/status 正常。
- [ ] 投稿链路：submit -> decision -> publish -> publication ID 分配。

## 4) Quality Gates
- [ ] `npm run lint` 通过。
- [ ] `npm run typecheck` 通过。
- [ ] `npm run build` 通过。
- [ ] `npm run smoke` 对目标环境通过（至少 public endpoints + auth）。

## 5) Rollback / Operations
- [ ] Vercel 回滚目标版本已标记。
- [ ] Supabase 回滚策略已准备（DDL/DML 回退脚本或快照）。
- [ ] 发布后 24h 监控负责人和排班确定。
- [ ] 错误告警通道（Slack/Email）已验证。
