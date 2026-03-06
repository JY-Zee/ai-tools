## ai-tools 说明

记录在本仓库中为 Cursor / AI 助手准备的各类 **Rules** 与 **Skills**，用于在日常开发中复用固定流程或脚手架能力。

- **位置约定**：
  - 规则文件：`.cursor/rules/**`
  - 技能文件：`.cursor/skills/**/SKILL.md`
- **使用方式**：当你在 Cursor 中与 AI 对话时，只要对话内容满足某个 skill 的「使用条件」，AI 就会自动读取对应的 `SKILL.md` 并按规范执行；你也可以在聊天里直接点名某个能力，例如“用蓝湖解析工具帮我生成组件”。

---

## 可用 Skills 列表

- **plan-agent-workflow**：规划 + 执行改动的工作流规范
- **lanhu-ui-json-parser**：蓝湖 UI JSON 解析与组件生成
- **react-component-template**：标准化 React forwardRef 组件模板
- **create-query-list-page**：基于 ZProTable 的查询列表页脚手架

下面分别说明它们的 **使用条件** 和 **使用方式**。

---

## plan-agent-workflow

- **功能**：定义「Plan 模式」和「Agent 模式」的协同规范，要求：
  - 修改前先列出被改动的函数 / 变量，并检查调用方；
  - 在步骤中说明修改前后差异；
  - 将计划备份为 `plan-YYYYMMDD-HHmmss-xxx.md`；
  - 结束时尽量更新 `README` / `CHANGELOG` 或生成变更说明。
- **适用场景（使用条件）**：
  - 需要做 **中大型改动**，希望有清晰的实施计划；
  - 你在对话中提到「先做个 Plan」「按 Plan 执行」之类的需求；
  - 希望对关键修改点有「修改前 / 修改后」对比和调用方追踪。
- **使用方式**：
  - 在对话中明确说明：  
    - **示例 1**：*“先帮我用 Plan 模式规划一下重构步骤，再用 Agent 模式按步骤改代码。”*  
    - **示例 2**：*“这次改动比较大，按 plan-agent-workflow 的规则来。”*
  - AI 会自动：
    - 生成可执行的 Plan 步骤；
    - 在执行修改时严格限定范围，不做无关优化；
    - 在项目根目录写入 `plan-*.md` 备份或变更说明（如有需要）。

---

## lanhu-ui-json-parser

- **功能**：解析蓝湖页面链接，拉取并分析设计 JSON，结合截图筛选图层，然后按项目技术栈生成前端组件代码。
- **前置条件**：
  - 项目根目录存在 `.lanhuConfig` 文件，内容形如：
    ```js
    {
      cookie: 'your lanhu cookie',
      scale: 1
    }
    ```
  - `cookie` 为你的蓝湖登录 Cookie；`scale` 为设计稿与实际尺寸的倍率（缺省视为 `1`）。
- **适用场景（使用条件）**：
  - 你提供了 **蓝湖页面链接**，希望：
    - 解析页面 UI JSON；
    - 分析某个容器 / 图层；
    - 结合 UI 截图筛选真实出现的图层；
    - 根据蓝湖设计稿快速生成 React / 其他前端组件。
- **Chat 内使用方式**：
  - 在对话中给出蓝湖链接并描述目标：
    - **示例 1**：*“这是蓝湖链接，帮我拉取 JSON 并分析主容器。”*  
    - **示例 2**：*“根据这个蓝湖页面和截图，生成一个 React 表单组件。”*
  - AI 会按 `SKILL.md` 里的流程：
    - 使用 `.lanhuConfig` 的 `cookie`、`scale`；
    - 解析链接中的 `image_id` 和 `project_id`；
    - 下载 JSON 到 `.lanhuJson/SketchJSONURL-*.json`；
    - 分析根图层 / 目标图层，生成 `containerJson.json` 和组件代码草稿。
- **命令行辅助（可选）**：
  - 你也可以在项目根目录手动执行脚本：
    ```bash
    # 下载设计 JSON
    node .cursor/skills/lanhu-ui-json-parser/scripts/fetch-lanhu-json.js --url "<lanhu-url>"

    # 分析指定图层
    node .cursor/skills/lanhu-ui-json-parser/scripts/analyze-lanhu-json.js --layer "<图层名>"
    ```

---

## react-component-template

- **功能**：根据组件名，快速生成一个 **forwardRef 模式** 的标准 React 函数组件模板，内含 `{ComponentName}Props` 与 `{ComponentName}Ref`。
- **适用场景（使用条件）**：
  - 需要新建页面 / 组件，想直接从统一的 forwardRef 模板开始；
  - 希望 Props / Ref 接口命名统一规范。
- **使用方式**：
  - 在对话中说明组件名与需求：
    - **示例 1**：*“帮我用 react-component-template 生成一个 UserList 组件的模板。”*  
    - **示例 2**：*“我要新建一个 ProfileForm 组件，用标准 forwardRef 模板。”*
  - AI 会按模板生成类似代码（示意）：
    ```tsx
    import { forwardRef, Ref, useImperativeHandle } from 'react';

    export interface UserListProps {}

    export interface UserListRef {}

    const UserList = (props: UserListProps, ref: Ref<UserListRef> | undefined) => {
      useImperativeHandle(ref, () => ({}));
      return <div>123</div>;
    };

    export default forwardRef(UserList);
    ```
  - 你可以指定：
    - 文件路径（如 `src/pages/UserList/index.tsx`）；
    - 是否额外生成样式文件等。

---

## create-query-list-page

- **功能**：基于 `ZProTable` 自动生成 **查询列表页面脚手架**，包含：
  - 页面主文件：`index.tsx`
  - 接口层：`service.ts`
  - 静态变量与类型：`constants.ts`
  - 页面私有组件目录：`components/`
- **默认目录结构**：
  ```text
  src/pages/{PageName}/
    ├── index.tsx
    ├── service.ts
    ├── constants.ts
    └── components/
  ```
- **适用场景（使用条件）**：
  - 你的项目已使用 `ZProTable` 组件（通常在 `@/components/ZProTable`）；
  - 需要快速搭一个「增删改查列表」或纯查询列表页；
  - 已有后端接口，返回结构可通过 `list` / `total` 等字段抽象为 `TableRes<T>`。
- **创建页面前需要准备的信息**：
  - **必需**：
    - 页面名称（`PageName`，用于文件夹和组件名，如 `UserManage`）；
    - 页面标题（菜单 / 面包屫等展示文本）；
    - 接口 URL（例如 `/api/user/list`）；
    - 请求方法（GET / POST 等）；
    - 表格字段列表：
      - 字段标题 `title`
      - 字段 key `dataIndex`
      - `valueType`（可省略，默认 `text`）
      - 列宽 `width`（可省略，默认 `200`）
      - 是否参与搜索 `hideInSearch`
  - **可选**：
    - `TableRes` 泛型类型（不指定则默认 `any`）；
    - 数据 / 总数字段路径（默认 `list` / `total`）；
    - 行 key（默认 `id`）；
    - 是否作为内嵌组件插入到现有页面中。
- **Chat 内使用方式**：
  - 在对话中提供上述信息，例如：
    - *“帮我用 create-query-list-page 生成一个 UserManage 查询页，接口是 `/api/user/list`，POST 方法，字段有用户名、手机号、创建时间（dateTimeRange）。”*
  - AI 会：
    - 在 `src/pages/{PageName}/` 下创建 `index.tsx` / `service.ts` / `constants.ts` / `components/`；
    - 在 `index.tsx` 中配置 `ZProTable`、`columns`、查询转换逻辑；
    - 在 `service.ts` 中封装 `getTable` 请求；
    - 在 `constants.ts` 中定义 `ColumnType` 与 `TableRes<T>`。

---

## 如何扩展新的 Rules / Skills

- **新增 Rule**：
  - 在 `.cursor/rules/` 下新建对应目录和 `*.md` 说明文件；
  - 约定清楚：适用场景、执行要求、限制项等。
- **新增 Skill**：
  - 在 `.cursor/skills/{skill-name}/SKILL.md` 中定义：
    - `name` / `description`；
    - **When to Use**（触发条件）；
    - **Workflow**（具体步骤）；
    - 所需脚本 / 配置文件路径。
- **推荐做法**：
  - 所有需要复用的「长流程」都优先抽成 Skill，并在此 `README` 中补充简要说明和使用条件。
