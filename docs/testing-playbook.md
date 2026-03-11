# Testing Playbook（统一测试手册）

> 目标：把当前项目的测试方式集中到一个文档，方便你后续做统一测评与验收。

## 0) 测试准备

### 环境要求
- Node.js 20+
- npm 10+
- 可用的本地端口 `3000`
- 如需联调 Supabase：准备 `.env.local`（可参考 `.env.example`）

### 安装依赖
```bash
npm install
```

---

## 1) 自动化基础门禁（建议每次提交都跑）

### 1.1 迁移清单校验
```bash
npm run verify:migrations
```
**通过标准**：输出 `[migrations] ok (...)`。

### 1.2 静态检查
```bash
npm run lint
npm run typecheck
```
**通过标准**：无 ESLint 错误；TypeScript 无错误。

### 1.3 生产构建检查
```bash
npm run build
```
**通过标准**：`Compiled successfully` 且构建完成。

---

## 2) 本地 Smoke 自动化（关键链路）

> 覆盖：public readiness + register/login/session + editor login。

### 2.1 启动服务并执行 smoke
```bash
EDITOR_ACCESS_CODE=review-demo npm run start -- --hostname 127.0.0.1 --port 3000
```
新开终端执行：
```bash
SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= \
SMOKE_BASE_URL=http://127.0.0.1:3000 SMOKE_EDITOR_CODE=review-demo npm run smoke
```

**通过标准**：
- `[smoke] /api/public/supabase-health ok`
- `[smoke] /api/public/journal-standards ok`
- `[smoke] /api/public/integrations/requirements ok`
- `[smoke] /api/auth/register ok`
- `[smoke] /api/auth/login ok`
- `[smoke] /api/auth/session ok`
- `[smoke] /api/auth/editor-login ok`
- `[smoke] success`

---

## 3) 手工 API 验收（按业务模块）

## 3.1 Public readiness
```bash
curl -s http://127.0.0.1:3000/api/public/supabase-health | jq
curl -s http://127.0.0.1:3000/api/public/journal-standards | jq
curl -s http://127.0.0.1:3000/api/public/integrations/requirements | jq
curl -s http://127.0.0.1:3000/api/public/operations-governance | jq
```
**关注点**：字段完整、无 500、治理信息与文档一致。

## 3.2 作者身份链路
1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `GET /api/auth/session`

示例：
```bash
curl -i -c cookies.txt -X POST http://127.0.0.1:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"QA User","email":"qa1@example.com","password":"QaPass#123","username":"qa_user_1"}'

curl -i -c cookies.txt -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"qa1@example.com","password":"QaPass#123"}'

curl -i -b cookies.txt http://127.0.0.1:3000/api/auth/session
```
**通过标准**：session 返回当前用户信息。

## 3.3 编辑登录安全
- 非生产可用 demo code：`review-demo`
- 生产环境必须配置 `EDITOR_ACCESS_CODE`，否则返回 `503`

示例：
```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/editor-login \
  -H 'content-type: application/json' \
  -d '{"email":"editor@example.com","name":"QA Editor","editor_code":"review-demo"}'
```

## 3.4 投稿与发布最小链路
1. 作者创建投稿（`POST /api/submissions`）
2. 编辑推进状态（`PATCH /api/submissions/:id/status`）
3. 发布/分配 publication ID（`POST /api/submissions/:id/publish` + `POST /api/submissions/:id/doi`）
4. 公共引用导出（`/api/public/submissions/:id/citation?format=bibtex|ris|csl-json|jats`）

**通过标准**：
- 状态流转符合预期
- 引用导出 4 种格式均可返回

## 3.5 审稿制度与伦理流程
- 审稿政策：`GET /api/public/review-policy`
- 审稿分配：`POST /api/reviews/assign`（校验 COI / reviewer-author separation）
- 伦理 case：`GET/POST /api/ethics/cases`、`PATCH /api/ethics/cases/:id`

**通过标准**：
- 冲突审稿人被拒绝（409/400）
- 伦理 case 可创建、更新、查询

---

## 4) UAT 场景回归（产品视角）

按 `docs/uat-runbook.md` 执行 A/B/C 三组场景：
- A 作者流（注册、登录、ORCID、投稿）
- B 编辑流（编审、发布、引用下载）
- C 公共可观测接口

建议每次预发布至少完整执行 1 次。

---

## 5) 发布前统一检查（建议直接复制执行）

```bash
npm run verify:migrations && \
npm run lint && \
npm run typecheck && \
npm run build
```

然后启动服务并执行 smoke：
```bash
EDITOR_ACCESS_CODE=review-demo npm run start -- --hostname 127.0.0.1 --port 3000
```
新开终端：
```bash
SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= \
SMOKE_BASE_URL=http://127.0.0.1:3000 SMOKE_EDITOR_CODE=review-demo npm run smoke
```

最终配合 `docs/release-checklist.md` 打勾发布。

---

## 6) 测试记录模板（建议）

每次测试输出一份记录：
- 测试环境（commit SHA、URL、NODE_ENV、是否 Supabase）
- 执行人 + 时间
- 自动化命令结果
- 手工验收结果（通过/失败）
- 缺陷列表（严重级别、复现步骤、截图/日志）
- 是否满足发布条件（是/否）


## 7) Anti-abuse / 限流测试（新增）

### 7.1 登录限流快速验证
把阈值临时调低后压测：
```bash
AUTH_LOGIN_RATE_LIMIT_MAX=3 AUTH_LOGIN_RATE_LIMIT_WINDOW_MS=60000 npm run dev
```
新开终端连续请求登录接口（可用错误密码）：
```bash
for i in {1..5}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:3000/api/auth/login \
    -H 'content-type: application/json' \
    -d '{"identifier":"rate-test@example.com","password":"badpass"}'
done
```
**通过标准**：前几次返回 `401`，超过阈值后返回 `429`，且响应包含 `Retry-After`。

### 7.2 编辑登录限流验证
同理调低：`EDITOR_LOGIN_RATE_LIMIT_MAX=2`，连续提交错误 editor code，确认触发 `429`。

### 7.3 风险检查接口限流验证
调低 `SECURITY_RISK_CHECK_RATE_LIMIT_MAX`，连续调用 `/api/security/risk-check`，确认触发 `429`。
