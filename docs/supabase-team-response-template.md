# Supabase 团队回复模板（可直接粘贴）

> 用途：让对方一次性按固定格式回复，减少来回沟通成本。

## P0

### 1) user_accounts.username 与索引
- 是否存在 `username` 列：
- 列类型 / 可空：
- 唯一索引名：
- 贴出执行结果（必填）：
```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'user_accounts'
order by ordinal_position;

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'user_accounts';
```

### 2) 生产是否统一使用 SUPABASE_SERVICE_ROLE_KEY
- YES / NO：
- 若 YES，保护措施（密钥管理 / 轮换 / 泄露应急）：

### 3) user_accounts / orcid_links 在线 policy 原文
- 请直接粘贴结果：
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

## P1

### 4) email-based -> auth.uid() 迁移计划
- 是否迁移（YES/NO）：
- 负责人：
- 时间窗口：

### 5) papers bucket 配置
- public / private：
- 若 public，访问审计方案：
- 若 private，签名 URL TTL 策略：

### 6) orcid_links 主关联字段
- 继续 user_email / 切换 user_id：
- 预计切换时间：

## P2

### 7) migration 管理流程
- 发布责任人：
- 发布方式（CLI/CI）：
- PR 自动校验是否开启：

### 8) audit_logs 保留策略
- 在线保留时长：
- 归档周期：
- 成本负责人：

## 需要立即决策的技术选项（请二选一）
- A：保留 `username`（短期兼容，最小改动）
- B：移除 `username` 依赖，统一 `email/auth.uid()`（长期一致）
