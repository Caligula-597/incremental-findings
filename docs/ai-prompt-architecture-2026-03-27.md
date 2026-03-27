# AI 提示词架构（反幻觉与客观真实性优先）

## 核心原则
1. **结构优先于事实断言**：先给可写作结构，不给未验证事实。
2. **不确定即标注**：统一标注 `NEEDS_VERIFICATION/需验证`。
3. **证据链要求**：每个章节建议至少包含一个核验提示。
4. **禁止伪造**：禁止编造文献、机构、数据、统计结论。
5. **最小伤害输出**：优先保守表述，不输出高置信但不可证实语句。

## 统一 Prompt 分层
- System 层：角色、合规、输出格式、禁止项。
- Task 层：主题、学科、稿件类型、章节数量。
- Safety 层：反幻觉规则 + 核验标签策略。
- Output 层：严格 JSON schema（abstract/sections/markdown）。

## 章节 notes 规范
每个章节的 `notes` 至少包含：
- 关键论点（1 条）
- 需要的数据/证据（1 条）
- 核验动作（1 条）

## 事实审核流程（建议）
1. 生成初稿
2. 抽取事实断言（claims）
3. 对 claims 打标签：`verified / needs_verification / uncertain`
4. 对未验证断言降级措辞或删除
5. 生成可审计日志（provider/model/prompt hash）

## 下一步
- 增加 claim-level 结构化输出（claim + confidence + verification_source）
- 接入 Crossref/PubMed/DOAJ 检索作外部核验
- 对“高风险陈述”增加人工复核门禁
