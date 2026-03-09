# Supabase 对接完整指引（Incremental Findings）

> 目标：把当前项目从“内存 fallback / 半对接状态”升级为“可稳定运行的 Supabase 模式”，并明确你已经写入的模块分别需要哪些 Supabase 资源。

---

## 1. 当前项目里哪些模块会用到 Supabase

你目前代码中的这些模块已经存在 Supabase 分支（如果环境变量未配置，则会回退到 memory）：

- **认证/会话相关**
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/session`
- **ORCID**
  - `/api/orcid/start`
  - `/api/orcid/callback`
  - `/api/orcid/status`
- **投稿主流程**
  - `/api/submissions`
  - `/api/submissions/complete`
  - `/api/submissions/:id/status`
  - `/api/submissions/:id/revisions`
  - `/api/submissions/:id/doi`
- **审稿与编辑流程**
  - `/api/reviews/*`
  - `/api/submissions/:id/decision`
  - `/api/production/*`
- **通知 / 安全 / 索引导出 / 审计**
  - `/api/notifications/*`
  - `/api/security/*`
  - `/api/indexing/export/*`

换句话说，你不是“从零接入”，而是“把已经写好的 Supabase 分支补齐 schema + storage + 策略”。

---

## 2. Supabase 项目准备

1. 在 Supabase 新建 Project（建议区域靠近你服务器）。
2. 在 **Project Settings > API** 记录：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 在本项目 `.env.local` 写入：

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> 说明：服务端现在只使用 `SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY`。
> 若缺少 service role key，服务端会自动回退到 memory 模式（避免 anon key 触发 RLS 写入失败）。

---

## 3. 必建数据库表（按你当前代码）

请在 Supabase SQL Editor 依次执行。以下结构与当前项目功能一一对应。

### 3.1 核心投稿表

```sql
create extension if not exists "uuid-ossp";

create table if not exists submissions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  authors text not null,
  abstract text,
  discipline text,
  topic text,
  article_type text,
  status text default 'pending',
  file_url text,
  doi text,
  created_at timestamptz default now()
);

create index if not exists idx_submissions_status on submissions(status);
create index if not exists idx_submissions_created_at on submissions(created_at desc);
```

### 3.2 账号与 ORCID

> 对接统一说明：当前前后端短期兼容方案保留 `username` 字段，并要求唯一索引。

```sql
create table if not exists user_accounts (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  username text unique,
  name text not null,
  password_hash text not null,
  role text default 'author',
  created_at timestamptz default now()
);

create unique index if not exists idx_user_accounts_email on user_accounts(email);
create unique index if not exists idx_user_accounts_username on user_accounts(username) where username is not null;

create table if not exists orcid_links (
  user_email text primary key,
  user_id uuid,
  orcid_id text not null,
  verified boolean default false,
  connected_at timestamptz default now()
);
```

### 3.3 投稿合规与文件审计

```sql
create table if not exists submission_files (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  file_kind text not null,
  file_name text not null,
  file_path text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz default now()
);

create table if not exists consent_logs (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references submissions(id) on delete cascade,
  user_email text not null,
  terms_version text not null,
  author_warranty boolean not null,
  originality_warranty boolean not null,
  ethics_warranty boolean not null,
  privacy_ack boolean not null,
  consented_at timestamptz default now(),
  ip_hash text
);

create table if not exists audit_logs (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  action text not null,
  actor_email text,
  detail text,
  created_at timestamptz default now()
);
```

### 3.4 修订版本 / 审稿 / 决策 / 生产流程

```sql
create table if not exists submission_versions (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  version_index int not null,
  status_snapshot text not null,
  file_url text,
  revision_summary text not null,
  actor_email text not null,
  metadata_json text,
  created_at timestamptz default now()
);

create table if not exists review_assignments (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  reviewer_email text not null,
  editor_email text not null,
  round_index int not null default 1,
  status text not null,
  due_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists review_reports (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  assignment_id uuid not null references review_assignments(id) on delete cascade,
  reviewer_email text not null,
  recommendation text not null,
  summary text not null,
  confidential_note text,
  created_at timestamptz default now()
);

create table if not exists editor_decisions (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  decision text not null,
  mapped_status text not null,
  reason text not null,
  editor_email text not null,
  created_at timestamptz default now()
);

create table if not exists production_jobs (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  stage text not null,
  editor_email text not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists publication_packages (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  package_url text not null,
  checksum text,
  editor_email text not null,
  created_at timestamptz default now()
);
```

### 3.5 通知 / 安全 / 索引导出

```sql
create table if not exists notification_jobs (
  id uuid primary key,
  template_id text not null,
  channel text not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null,
  provider text,
  created_at timestamptz default now()
);

create table if not exists security_events (
  id uuid primary key,
  kind text not null,
  actor_email text,
  ip text,
  route text,
  detail text not null,
  risk_score int,
  created_at timestamptz default now()
);

create table if not exists risk_scores (
  id uuid primary key,
  ip text not null,
  route text not null,
  score int not null,
  decision text not null,
  reasons text,
  created_at timestamptz default now()
);

create table if not exists ip_rate_limits (
  id uuid primary key,
  ip text not null,
  route text not null,
  blocked_until timestamptz not null,
  reason text not null,
  created_at timestamptz default now()
);

create table if not exists indexing_exports (
  id uuid primary key,
  provider text not null,
  submission_id uuid not null references submissions(id) on delete cascade,
  payload_json text not null,
  status text not null,
  created_at timestamptz default now()
);

create table if not exists metadata_snapshots (
  id uuid primary key,
  submission_id uuid not null references submissions(id) on delete cascade,
  provider text not null,
  snapshot_json text not null,
  created_at timestamptz default now()
);
```

---

## 4. Storage 对接（投稿文件）

`/api/submissions/complete` 会尝试写入 Supabase Storage bucket：`papers`。

### 4.1 创建 bucket

在 Supabase Storage 新建 bucket：

- name: `papers`
- 建议先 private（生产更安全）

### 4.2 对象路径建议

建议对象 key 保持当前后端风格：

- `submissions/{submission_id}/manuscript/...`
- `submissions/{submission_id}/cover-letter/...`
- `submissions/{submission_id}/supporting/...`

### 4.3 访问策略

当前代码会尝试生成 public URL。若你要更安全：

- 改为 private bucket + 短时签名 URL（后续可做）
- 在下载接口内进行权限校验后签名返回

---

## 5. RLS（行级权限）建议

你当前服务端多数是 Service Role 调用，所以短期可先上线；但生产建议尽快补 RLS。

建议策略：

1. `submissions`：
   - author 仅能读写自己投稿（需补 `owner_user_id` 字段可选）
   - editor 可全量读写
2. `review_*`：
   - reviewer 仅可见与自己 assignment 关联记录
   - editor 可全量
3. `security_*` / `audit_*`：
   - 普通用户不可直接读
   - 仅 editor/admin 可读

> 如果暂时没接 Supabase Auth 用户体系，先由服务端 API 控制权限；RLS 可在下一阶段补齐。

---

## 6. 从 memory 迁移到 Supabase 的执行顺序（推荐）

1. 先配环境变量（第 2 节）
2. 执行 SQL schema（第 3 节）
3. 建立 storage bucket（第 4 节）
4. 本地运行并验证（第 7 节）
5. 通过后，再逐步收敛 memory fallback（生产禁写）

---

## 7. 最小验证清单（你可以逐条打勾）

- [ ] `POST /api/auth/register` 返回 `mode: supabase`（或不再是 memory）
- [ ] `POST /api/auth/login` 能读取 `user_accounts`
- [ ] `/api/orcid/status` 可读写 `orcid_links`
- [ ] `POST /api/submissions/complete` 后：
  - [ ] `submissions` 有记录
  - [ ] `submission_files` 有文件元数据
  - [ ] Storage `papers` 中有对象
- [ ] `POST /api/submissions/:id/revisions` 有版本记录
- [ ] `POST /api/reviews/assign` 有 `review_assignments` 记录
- [ ] `POST /api/security/risk-check` 有 `risk_scores/security_events` 记录

---

## 8. 部署注意事项

- 生产环境必须配置：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 避免把 `SERVICE_ROLE_KEY` 暴露到前端。
- 建议增加启动时配置校验（缺失关键 env 时直接 fail fast）。
- 对于历史 memory 数据：若有需要，单独写迁移脚本导入 Supabase。

---

## 9. 你接下来可以直接做的下一步

1. 我可以继续给你补一份 `supabase/migrations/001_init.sql`（把上面 SQL 收敛成迁移文件）。
2. 然后再补 `scripts/verify-supabase.ts`，自动跑一遍关键 API 健康检查。
3. 最后把“生产禁用 memory 写入”做成环境开关（如 `REQUIRE_DB=true`）。

如果你同意，我下一步就按这三项继续落地。
