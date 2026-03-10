# UAT Runbook (Author + Editor)

> 用途：发布前固定执行一次全链路验收。

## Preconditions
- 已部署可访问环境（Vercel preview/prod）。
- Supabase migrations 已执行。
- ORCID 应用回调 URL 已配置到当前环境域名。

## Scenario A: Author flow
1. 打开 `/login`，注册作者账号。
2. 登录后访问 `/account`，确认 session 显示用户信息。
3. 点击 ORCID connect，完成授权回跳。
4. 回到 `/account`，确认 ORCID 状态显示已绑定。
5. 进入 `/submit` 提交稿件（含 manuscript + cover letter）。
6. 确认 `/api/submissions` 中存在 pending 记录。

## Scenario B: Editor flow
1. 使用 editor login 进入 `/editor`。
2. 在 pending 列表将稿件推进至 under_review/published（按流程测试）。
3. 对 published 稿件执行 identifier 分配（当前为 Publication ID 占位标识）。
4. 打开 `/papers/[id]`，确认公开页可访问，且显示 Publication ID 或 DOI。
5. 下载 citation（bibtex/ris/csl-json），检查格式返回正确。

## Scenario C: Public/readiness endpoints
- `GET /api/public/supabase-health`
- `GET /api/public/integrations/requirements`
- `GET /api/public/journal-standards`
- `GET /api/public/submissions`

## Acceptance
- 无 500 级错误。
- 关键流程可重复（同一账号、第二次提交/编辑仍成功）。
- 所有返回字段与前端展示一致。
