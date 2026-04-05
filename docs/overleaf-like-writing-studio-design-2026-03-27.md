# Overleaf 风格写作台设计案（面向期刊场景）

> 日期：2026-03-27

## 1. 目标
将当前写作台升级为“类 Overleaf 协作编辑器”，支持：
- 实时协作编辑（多人）
- 版本历史与回滚
- 引用管理与参考文献格式化
- 一键提交到投稿系统
- AI 协作（润色、结构建议、审稿回复草拟）

---

## 2. 信息架构（页面级）

### 2.1 `/write`（项目列表）
- 草稿项目卡片：标题、最近编辑、协作者、状态
- 新建项目（模板：研究论文/综述/短通讯）

### 2.2 `/write/[projectId]`（主编辑器）
- 左栏：项目文件树（`main.md`、`figures/`、`references.bib`）
- 中栏：Markdown/LaTeX 编辑区（支持协同）
- 右栏：实时预览（排版 + 引用）
- 底栏：编译/导出状态、冲突提示

### 2.3 `/write/[projectId]/history`
- 按时间线查看版本快照
- 支持 diff 对比与一键回滚

### 2.4 `/write/[projectId]/submit`
- 将稿件结构化映射到投稿字段
- 校验清单（文件、伦理声明、作者信息）
- 一键提交到 `/submit`

---

## 3. 核心能力分层

### L1 协同编辑层
- 文档模型：CRDT（Yjs/Automerge）
- 实时同步：WebSocket / Durable Objects
- 冲突解决：CRDT 原生合并

### L2 学术写作层
- 引用管理：BibTeX/CSL
- 模板系统：不同稿件类型章节模板
- 图表资产管理：图注、编号、跨引用

### L3 AI 协作层
- 模型发现：先调用用户 API 检索可用模型
- 能力插件：摘要重写、段落润色、审稿意见回复草稿
- 合规控制：敏感信息屏蔽开关、提示词审计日志

### L4 投稿集成层
- 从写作项目抽取 metadata
- 自动生成投稿包（正文、附录、cover letter）
- 提交后回写 submission_id 与时间线事件

---

## 4. 数据模型建议

- `writing_projects`：项目主表（owner、title、status）
- `writing_documents`：文档内容（latest snapshot）
- `writing_ops`：协同操作日志（CRDT ops）
- `writing_versions`：版本快照
- `writing_collaborators`：协作者权限
- `writing_exports`：导出记录（pdf/docx/tex）
- `writing_ai_logs`：AI 调用审计（provider/model/prompt hash）

---

## 5. API 规划（建议）

- `POST /api/write/projects`
- `GET /api/write/projects`
- `GET /api/write/projects/:id`
- `POST /api/write/projects/:id/ops`
- `GET /api/write/projects/:id/history`
- `POST /api/write/projects/:id/revert`
- `POST /api/write/projects/:id/export`
- `POST /api/write/projects/:id/submit`

AI相关：
- `POST /api/public/ai-models`（已实现）
- `POST /api/public/ai-collab`（已实现）
- `POST /api/public/draft-assistant`（已实现）
- `POST /api/write/projects/:id/ai-actions`（下一步）

---

## 6. 三阶段实施计划

### Phase A（2~3 周）
- 项目列表 + 单人编辑器 + 自动保存
- 模型检索与 AI 辅助草稿（已有能力整合进项目）

### Phase B（3~4 周）
- 协作者邀请与权限
- 版本历史、diff、回滚
- 引用管理（BibTeX）

### Phase C（3~4 周）
- 实时协同（CRDT + WS）
- 投稿一键提交整合
- 导出与模板体系完善

---

## 7. 验收指标（关键）
- 新建项目到首稿完成时间下降 30%
- 返修轮次平均耗时下降 20%
- AI 协助使用率 > 40%
- 写作台到投稿转化率持续提升
