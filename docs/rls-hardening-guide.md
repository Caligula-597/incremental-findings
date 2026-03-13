# RLS 强化与提交数据规范化指引（精简版可分享）

> 本文是“提交系统 + Supabase 安全策略”对齐文档，便于在团队内快速同步和执行。

## 一、精简总结（要点）

### 目标
- 规范化 `submissions` 的作者数据结构。
- 为 `submissions`、`submission_files` 等核心表强化 RLS。
- 在文件上传/元数据变更时记录审计日志，并同步 Storage 元数据。
- 提供可选 Edge Function 处理 Storage webhook（使用 service role）。

### 推荐完成项（按优先级）
1. 新增 `submission_authors` 表，把 `submissions.authors`（字符串）迁移到结构化记录：
   - `author_email`
   - `author_name`
   - `author_order`
2. 在 `submissions` 新增 `submitter_email`（后续建议升级为 `submitter_user_id uuid`）。
3. 启用并强化 RLS：基于 JWT claims（当前兼容 email/role；后续迁移到 `auth.uid()`）。
4. 为 `submission_files` 插入行为加触发器，写入 `audit_logs`，并同步 size/content_type。
5. 提供 `vw_submissions_for_user` 视图，统一“当前用户可见投稿”的查询入口。
6. 可选部署 `storage-webhook-sync` Edge Function，接收 Storage webhook 后更新 `submission_files` 并写审计。
7. 为 RLS 高频过滤列补索引（如 `submitter_email`、`submission_id`、`created_at`）。

### 安全与运维建议
- 长期建议把 RLS 主键从 email 迁移到 `auth.uid()`（UUID 更稳定，抗伪造更强）。
- Edge Function 若使用 service role，必须验签或校验 secret header。
- SQL migration 与 Edge Function 代码应入库并在 CI/CD 自动执行。
- `audit_logs` 建议增加归档/保留策略（如 90/180 天冷热分层）。

---

## 二、你提供的两条 policy：问题与改法

你提供的策略：

```sql
-- 允许 API 写入用户信息
CREATE POLICY "Allow system to insert accounts" 
ON user_accounts FOR INSERT 
WITH CHECK (true);

-- 允许 API 写入 ORCID 绑定关系
CREATE POLICY "Allow system to insert orcid links" 
ON orcid_links FOR INSERT 
WITH CHECK (true);
```

### 风险点（简述）
- `WITH CHECK (true)` 代表**不校验插入内容**。
- 若未限制 `TO` 或 claims，可能让过宽角色写入任意数据。
- 这对 `user_accounts/orcid_links` 这类身份数据风险较高。

### 更安全的替代策略（建议）

> 说明：下面给出两种模式。你可先用 **A（仅 service_role）**，后续再升级到 **B（受控 authenticated）**。

#### A) 最小风险（推荐现在用）：仅允许 service_role 写入

```sql
-- 确保先启用 RLS
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcid_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow system to insert accounts" ON user_accounts;
DROP POLICY IF EXISTS "Allow system to insert orcid links" ON orcid_links;

CREATE POLICY "service_role_insert_user_accounts"
ON user_accounts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_insert_orcid_links"
ON orcid_links
FOR INSERT
TO service_role
WITH CHECK (true);
```

#### B) 受控 authenticated（仅在你明确需要客户端直写时）

```sql
-- 仅允许带特定 role claim 的会话写入（示例）
CREATE POLICY "system_claim_insert_user_accounts"
ON user_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('editor', 'admin', 'system')
);

CREATE POLICY "system_claim_insert_orcid_links"
ON orcid_links
FOR INSERT
TO authenticated
WITH CHECK (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('editor', 'admin', 'system')
);
```

> 注意：若你没有稳定签发 `role` claim，不建议用 B。会引发“看似安全、实则绕过或误拒绝”的问题。

---

## 三、结合当前仓库的落地建议（非常具体）

1. 保持服务端数据库写入只走 service role（你当前 `lib/supabase.ts` 已是这个方向）。
2. 客户端不要直接写 `user_accounts/orcid_links`，统一走 API route。
3. 在 migration 中显式写：
   - `ENABLE RLS`
   - `DROP POLICY IF EXISTS ...`
   - `CREATE POLICY ... TO service_role`
4. 对注册和 ORCID 绑定增加失败可观测日志（写到 `audit_logs`/`security_events`）。

---

## 四、快速检查清单

- [ ] `user_accounts` / `orcid_links` 已 `ENABLE ROW LEVEL SECURITY`
- [ ] 不存在宽松 `WITH CHECK (true)` + 未限角色 的 INSERT policy
- [ ] `TO service_role` 策略可用
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 仅在服务端环境存在
- [ ] 客户端直写路径已关闭（统一 API route）
