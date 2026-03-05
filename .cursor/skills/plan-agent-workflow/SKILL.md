---
name: plan-agent-workflow
description: Enforces Plan and Agent workflows: trace call sites of modified functions/variables and list before/after in steps; backup plan as md in project root; no unrelated edits or file deletion without asking; basic error handling; update readme/changelog or save changes with plan-{YYYYMMDD}-{HHmmss}-{short-desc}.md. Use when setting a Plan, when using Agent to implement changes, or when the user refers to Plan/Agent workflow or plan backup.
---

# Plan 与 Agent 工作流规范

## 一、Plan 模式

### 1. 修改处与调用方

在涉及**修改**的地方：

1. **查找被修改的符号**：列出被修改的函数、变量或类型。
2. **查找调用处**：在项目内搜索这些符号的被引用位置。
3. **判断是否需联动修改**：若签名、返回值、参数或行为发生变化，在被调用的地方阅读上下文，判断是否需要同步修改或优化。
4. **如需修改**：在被调用处做好对应修改或优化，并在实施步骤中体现。

### 2. 实施步骤中的对比

列出实施步骤时，**遇到修改点**尽量给出「修改前 / 修改后」对比，例如：

```markdown
### 步骤 3：调整 getUserName 返回值类型

- **修改前**：`function getUserName(): string`
- **修改后**：`function getUserName(): string | null`
- **调用处**：`pages/Profile.tsx` 第 42 行，已增加空值判断：`const name = getUserName() ?? '未知';`
```

### 3. Plan 备份

将当前 Plan 备份为项目根目录下的一个 md 文件：

- **命名规则**：`plan-{YYYYMMDD}-{HHmmss}-{简短描述}.md`
- **简短描述**：从 Plan 标题或第一段概括，用英文或拼音，单词用连字符。
- **示例**：`plan-20250305-143022-fix-binmanage-edit-modal.md`、`plan-20250305-150000-add-login-validation.md`

---

## 二、Agent 模式

执行修改时遵守：

1. **不扩大修改范围**：不修改与当前任务无关的代码；不擅自做「顺带优化」，如需优化须先询问用户。
2. **不擅自删文件**：任何文件删除前须询问用户确认。
3. **基本容错**：代码需做基本的空值、边界与异常校验，避免明显运行时错误。

---

## 三、Plan 与 Agent 共同收尾

在 Plan 或 Agent 任务**结束前**尽量完成：

1. **查找项目记录文件**：如 `README.md`、`CHANGELOG.md`、`docs/变更记录.md` 等记录项目变更的文件。
2. **更新或保存改动**：
   - 若有 changelog/readme，将本次改动的要点更新进去；或
   - 若无合适位置，可将本次改动要点保存为独立文件。
3. **命名规则**（与 Plan 备份一致）：
   - 文件名：`plan-{YYYYMMDD}-{HHmmss}-{简短描述}.md`
   - 简短描述：从 plan 标题或第一段概括，英文或拼音，单词用连字符。

---

## 四、检查清单

**Plan 结束时**：

- [ ] 对每个修改点已查找被修改符号的调用处
- [ ] 需要联动的地方已在步骤中说明并给出修改前/后对比
- [ ] 已在项目根目录保存 plan 备份，文件名符合 `plan-{YYYYMMDD}-{HHmmss}-{简短描述}.md`

**Agent 执行时**：

- [ ] 未修改无关代码，未擅自删除文件
- [ ] 新增/修改代码具备基本容错

**收尾**：

- [ ] 已尝试更新 readme/changelog 或保存改动要点，命名符合规范
