# Supabase 团队对接清单（P0 / P1 / P2）

> 用途：直接转发给负责 Supabase schema / policy / storage 的同学，收集一次性确认项，避免反复沟通。

## 最新确认结论（根据当前反馈）

- `user_accounts.username`：**已确认存在**（`text` 可空），且存在唯一索引 `user_accounts_username_key`。
- 服务端写入模式：建议基线 **YES**（统一 `SUPABASE_SERVICE_ROLE_KEY`）。
- `user_accounts/orcid_links` 当前策略：发现存在宽松 INSERT 策略命名（如 `Allow All Insert`），但需继续拿到完整 policy SQL 原文确认。
- 中期方向：同意逐步迁移到 `auth.uid()`（UUID）作为主关联键。
- `orcid_links`：建议主关联迁移到 `user_id`，`user_email` 保留检索冗余字段。

---

## P0 — 必须先确认（直接影响可用性）

### 1) `user_accounts.username` 是否存在？最终 schema 版本是什么？

**问题**
- 当前代码有 `username` 查询/写入路径；若线上表没有该列，会导致注册/登录失败。

**请 Supabase 团队回传**

```sql
-- 列定义
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_accounts'
order by ordinal_position;

-- 索引定义
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'user_accounts';
```

**建议决策（二选一）**
- A（短期兼容）：保留 `username`，补 migration + 唯一索引。
- B（长期一致）：移除 `username` 依赖，统一 `email` 或 `auth.uid()`。

---

### 2) 生产是否确认服务端写入统一使用 `SUPABASE_SERVICE_ROLE_KEY`？

**问题**
- 当前服务端逻辑已按 service role 模式执行写入。
- 需确认这是团队认可的安全基线。

**请 Supabase 团队回复**
- YES / NO
- 若 YES：说明保护措施（仅服务端可见、轮换策略、泄露应急流程）。

---

### 3) `user_accounts` / `orcid_links` 线上 RLS policy 原文是什么？

**问题**
- 需避免宽松策略（如 `WITH CHECK (true)` 且未限制角色）。

**请 Supabase 团队回传**

```sql
select c.relname as table_name,
       pol.polname as policy_name,
       pg_get_policydef(pol.oid) as policy_sql
from pg_policy pol
join pg_class c on pol.polrelid = c.oid
join pg_namespace n on c.relnamespace = n.oid
where n.nspname = 'public'
  and c.relname in ('user_accounts', 'orcid_links')
order by c.relname, pol.polname;
```

**推荐最小权限方向**
- 服务端写入表（账户、身份绑定）优先限制为 `TO service_role`。

---

## P1 — 建议尽快确认（影响稳定性与后续演进）

### 4) 是否计划从 email-based 迁移到 `auth.uid()`（UUID）？

**请回复**
- 是否迁移（YES/NO）
- 负责人
- 时间窗口（例如 Sprint / 月份）

---

### 5) `papers` bucket 是 public 还是 private？

**请回复**
- 当前设置：public / private
- 若 public：访问审计方案是什么？
- 若 private：签名 URL 过期策略是什么？

---

### 6) `orcid_links` 主关联字段是否从 `user_email` 迁移到 `user_id`？

**建议**
- 主关联用 `user_id (UUID)`
- `user_email` 仅保留为冗余检索字段

---

## P2 — 中期优化（非立即阻断）

### 7) migration 管理流程是否统一（Supabase CLI / CI pipeline）？

**请回复**
- 线上 schema 由谁发布
- 通过什么流水线发布
- 是否支持 PR 自动校验 migration

---

### 8) `audit_logs` 保留与归档策略是什么？

**请回复**
- 在线保留时长
- 归档周期
- 成本与负责人

---

## 可直接转发的短消息模板

请协助确认以下 Supabase 对接项，并直接回传 SQL 查询结果：

1. `user_accounts` 列和索引（见文档 P0-1 SQL）
2. 生产是否统一用 `SUPABASE_SERVICE_ROLE_KEY` 执行后端写入（YES/NO + 保护措施）
3. `user_accounts` / `orcid_links` 当前在线 RLS policy 原文（见文档 P0-3 SQL）
4. 是否计划从 email-based 迁移到 `auth.uid()`（YES/NO + 时间）
5. `papers` bucket 当前是 public 还是 private（并说明访问控制）
6. `orcid_links` 是否迁移到 `user_id` 主关联
7. migration 发布流程与 audit_logs 保留策略

