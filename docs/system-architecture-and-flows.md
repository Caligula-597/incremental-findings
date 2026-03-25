# Incremental Findings 功能架构与流程总览（当前实现）

> 适用范围：当前仓库 `main` 代码中已实现/已接线能力（含内存回退与 Supabase 模式）。

## 1. 总体架构

- **前端层（Next.js App Router 页面）**
  - 公共展示：`/`（首页）、`/community`（使命与计划）、`/papers/[id]`
  - 用户中心：`/login`、`/account`、`/account/submissions/[id]`
  - 投稿入口：`/submit`
  - 编辑空间：`/editor`
- **API 层（Next Route Handlers）**
  - 认证与身份：`/api/auth/*`、`/api/orcid/*`
  - 投稿与发布：`/api/submissions/*`、`/api/production/*`
  - 审稿流程：`/api/reviews/*`、`/api/editor/*`
  - 安全与治理：`/api/security/*`、`/api/ethics/*`
  - 公共可读接口：`/api/public/*`
- **领域服务层（lib）**
  - 投稿、版本、文件、审稿、编辑、通知、索引、治理、运行模式、速率限制、会话等。
- **存储层**
  - 优先 Supabase（Postgres + Storage）
  - 未配置时可回退到内存/运行时存储目录（用于本地 Demo）

## 2. 功能模块拆分

### 2.1 认证与账号模块

- 用户注册采用“验证码先验证再建号”模式：
  1) `POST /api/auth/register/request-code` 发送验证码；
  2) `POST /api/auth/register` 校验验证码并创建账户。
- 登录会话：`POST /api/auth/login`、`GET /api/auth/session`、`POST /api/auth/logout`。
- 编辑登录支持两条路径：
  - 环境访问码 `editor_code`
  - 邀请码 `invite_code`
- 编辑登录可请求角色（如 managing editor），并结合 allowlist 策略判断。

### 2.2 ORCID 绑定模块

- 提供 `start -> callback -> status` 标准流程：
  - `GET /api/orcid/start`
  - `GET /api/orcid/callback`
  - `GET /api/orcid/status`
- 另有 `GET /api/orcid/diagnostics` 仅输出安全诊断信息（不泄露密钥）。

### 2.3 投稿与活动模块

- 投稿方式：
  - 基础字段（title/authors/abstract/分类）
  - 合规同意（terms version、warranty 等）
  - 文件包（manuscript + cover letter + supporting）
- 活动主题（Campaign）：
  - 学术区 + 自由创作区双轨主题
  - 首页、社区页、投稿页均有入口与主题引导
  - `campaign_theme` 会写入投稿元数据。
- 投稿完成接口：`POST /api/submissions/complete`
  - 含签名字段：`author_signature`、`coauthor_signatures`、`all_authors_authorized`
  - 返回并记录存储诊断信息（`storage_diagnostics`）

### 2.4 审稿与编辑模块

- 编辑工作台：`/editor`
- 审稿主流程：
  1) 分配审稿人：`POST /api/reviews/assign`
  2) 审稿邀请响应：`POST /api/reviews/invitations/:id/respond`
  3) 提交审稿报告：`POST /api/reviews/:id/submit-report`
  4) 编辑决策：`POST /api/submissions/:id/decision`
- 编辑配套：
  - 邀请与申请：`/api/editor/invites`、`/api/editor/applications`
  - 历史与任务：`/api/editor/history`、`/api/editor/assignments`
  - 评审看板：`/api/editor/review-board*`

### 2.5 生产发布与索引模块

- 生产流程：
  - `POST /api/production/:id/start`
  - `POST /api/production/:id/proof`
  - `POST /api/production/:id/publish-package`
- 发布与 DOI：
  - `POST /api/submissions/:id/publish`
  - `POST /api/submissions/:id/doi`
- 索引导出：
  - `GET /api/indexing/export`
  - `POST /api/indexing/export/:provider`

### 2.6 安全、风控与治理

- 速率限制：认证、验证码、风控等关键接口均接入限流。
- 风险检查：`POST /api/security/risk-check`
- 安全事件与封禁：`GET /api/security/events`、`POST /api/security/block`
- 伦理案例：`GET/POST /api/ethics/cases`、`PATCH /api/ethics/cases/:id`
- 治理与运行诊断：`/api/public/operations-governance`、`/api/public/supabase-health` 等。

## 3. 关键端到端流程（E2E）

### 3.1 新用户入站

1. 访问 `/login` 或 `/submit`
2. 请求邮箱验证码
3. 验证成功后完成注册
4. 登录后获得会话
5. 可在 `/account` 查看投稿与身份信息

### 3.2 投稿到发表

1. 作者在 `/submit` 选择分区（academic / entertainment）
2. 可选活动主题 `campaign_theme`
3. 填写元数据 + 合规确认 + 电子签名 + 上传文件
4. `POST /api/submissions/complete` 创建投稿、写文件记录、写审计日志
5. 编辑在 `/editor` 分派审稿并推进状态
6. 决策通过后进入 production 阶段
7. 生成 publish package，必要时分配 DOI
8. 文章进入公开列表与详情页

### 3.3 编辑认证与权限

1. 编辑访问 `/login`
2. 通过 `editor_code` 或 `invite_code` 登录
3. 如请求 managing role，需通过 allowlist 判定
4. 登录后可访问编辑接口与工作台

## 4. 运行模式与配置基线

- 推荐生产配置：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SESSION_SECRET`
  - `EDITOR_ACCESS_CODE`（若不完全依赖邀请体系）
- 可选功能配置：
  - `TRUST_PROXY_IP_HEADERS`
  - 验证码与限流相关 `AUTH_*` / `EMAIL_VERIFICATION_*`
  - `SUPPORT_CONTACT_EMAIL`
- 运行模式检查：
  - `GET /api/public/supabase-health` 查看当前是否处于 supabase 模式。

## 5. 对外能力（Public APIs）

平台已提供面向外部的公开信息接口，覆盖：

- 期刊画像、评审政策、期刊标准
- 平台 readiness / 模块 readiness / 集成要求
- 公共投稿列表与 citation 导出
- 运维治理快照

可用于：门户展示、外部聚合、后续平台集成。

## 6. 当前边界与注意事项

- 部分能力在本地可回退到内存/本地运行时存储，仅用于开发演示。
- 生产环境建议强制 Supabase 模式并完成迁移、RLS 与备份策略。
- 目前已具备完整“投稿-审稿-编辑-发布”的主干流程，但仍有专业化深化空间（见 `docs/next-phase-improvement-plan.md`）。
