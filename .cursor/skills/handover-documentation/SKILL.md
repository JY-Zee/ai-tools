---
name: handover-documentation
description: Generates customer handover docs for web routes (one document per route) or API docs for Node backends. Use when the user asks for 交接文档、handover documentation、路由文档、页面交接、或后端接口文档；when documenting the whole system versus a single route.
---

# 系统/页面交接文档

## 使用范围

| 场景 | 行为 |
|------|------|
| **整站 Web** | 按路由拆分：每个路由（或每个独立 `path`）一份文档，**禁止**把所有页面塞进一个超长文件。可按目录分批输出（如 `docs/handover/school/`）。另须按下一节「整站 / 系统级对接文档（补充）」提供目录结构总览与架构图（若有或可推断）。 |
| **单一路由** | 仅生成该路由对应的一份文档。 |
| **Node 等后端** | 输出接口文档（可按模块/路由文件拆分，避免单文件过长）。 |

## 整站 / 系统级对接文档（补充）

当用户要求为**整个系统**（非单一路由）产出交接/对接文档时，在「按路由拆分」的单页文档之外，还须满足下列之一或组合（无则写「无」并说明）：

1. **主要目录结构**：基于仓库真实布局，用**树形**（常用 `tree` 摘要或手工缩进）或**表格**列出核心业务目录及职责（如 `src/pages`、`src/services`、`src/utils`、`config`、`.umirc` 等）。只列与理解系统相关的层级，避免整库逐文件罗列；与 `README` / 现有文档冲突时以源码为准并标注。
2. **系统架构图**：若仓库或团队已有架构说明（`README`、设计文档、`docs/architecture`、Confluence 等），**摘录要点并配图**（可转写为 Markdown **Mermaid**：`flowchart`、`C4Context` 简化版等）。若无现成图，可根据代码分层（页面 → 组件 → `service`/请求封装 → 后端/第三方）整理一张**推断架构图**，并在图下注明「来源：代码推断，需架构/负责人确认」，禁止虚构不存在的中间层。
3. **落地位置**：目录结构与架构综述可放在**独立总览文档**（如 `docs/handover/HANDOVER_system-overview.md` 或用户指定的入口 `CUSTOMER_HANDOVER.md` 中的置顶章节），并在各域子目录的路由文档中通过链接引用，避免重复粘贴大段相同内容。

## 前置：对齐项目

1. 确认框架与路由来源（本仓库多为 Umi Max：`.umirc.ts` 的 `routes`）。
2. 阅读目标页面入口（如 `src/pages/<Name>/index.tsx`）及同目录 `service.ts`、`constants.ts`。
3. 搜索：`history.push` / `history.replace` / `Link` / `<a href` / `window.location` / 第三方 SDK 初始化 / `localStorage` / `sessionStorage` / `umi` 的 `useIntl` 或 `formatMessage`。

## Web 单页文档必含章节

按以下顺序组织（无内容则写「无」并说明依据）：

1. **标题**：`# <path 或 name> 交接文档` + 一句话职责摘要。
2. **URL 与路由配置**：访问路径、`name`、组件别名与真实文件路径；从 `.umirc.ts`（或 `config/routes`）摘抄 `routes` 片段。
3. **页面组件与文件结构**：表格列出入口组件、service、样式、子组件目录等。
4. **页面入参**：动态路由 `:id`、URL query、hash、**state 跳转带入**（`history.push(path, state)`）；参数类型、必填、默认值、谁写入。
5. **页面逻辑**：首屏请求顺序、关键副作用、权限/登录、主要状态机；适度拆条。**必须**在本节用**流程图**概括主路径（含关键分支与失败/重试），便于读者一眼看清；推荐 Markdown 内嵌 **Mermaid**（`flowchart` / `sequenceDiagram` 等），与文字说明配套；逻辑极简单时可一张小图 + 简短列表，仍不得省略图示。
6. **跳转与其他页面**：去向（路径 + 触发条件）、是否带 query/state；外链单独一节。
7. **SDK 与外部脚本**：脚本地址、初始化时机、全局对象（如 `window.xxx`）、环境差异。
8. **对全局的影响**：`localStorage` / `sessionStorage` / cookie、`initialState`、`model`、全局事件、修改 `document.title`、埋微信/第三方桥等。
9. **多语言**：`useIntl` / `formatMessage` / 文案文件路径；声明实际提供的语言与默认语言（可与 `locale` 配置对照）。
10. **代码摘录**：关键 5–20 行引用真实文件（用 Cursor 代码引用格式或带路径的代码块），避免大段粘贴。

**质量要求**：表格 + 列表为主；**页面逻辑章节须含流程图**（见上第 5 条）；不确定处标注「需产品/后端确认」；禁止编造未在代码中出现的接口路径。

## Web 输出文件命名建议

- 单路由：`<HANDOVER_ROOT>/HANDOVER_<routeName>.md` 或 `handover-<path-segment>.md`（`/` 改为 `-`）。
- 多路由：`docs/handover/<area>/HANDOVER_<name>.md`，与业务域分子目录。

`<HANDOVER_ROOT>` 若用户未指定，默认项目根目录或现有 `CUSTOMER_HANDOVER.md` 同级，并与用户确认。

## Node / 后端接口文档必含章节

按接口条目组织（每个接口一个小节或表格一行扩展）：

| 项 | 说明 |
|----|------|
| **方法与路径** | `GET /api/...` |
| **入参** | path / query / body 字段、类型、必填 |
| **认证** | header、token、中间件 |
| **调用链** | controller → service → 外部 HTTP / 队列 |
| **数据库** | 表名、关键 SQL 或 ORM 方法（仅摘要） |
| **成功响应** | HTTP 状态、JSON 结构示例 |
| **错误** | 业务码、常见失败原因 |
| **代码摘录** | handler 或 route 注册处若干行 |

数据来源：`routes`/`router` 注册文件、controller、service、DAO；不要猜测未实现的字段。

## 工作流检查清单

```
- [ ] 路由/接口列表与源码一致
- [ ] 每文档仅覆盖一个 path（Web）或一组清晰划分的 API（后端）
- [ ] 入参、跳转、存储、多语、SDK 五类已逐项填写或标无
- [ ] Web 页面逻辑章节已含流程图（与源码行为一致）
- [ ] 含至少一处可核对源码的短摘录
- [ ] （整站）已提供主要目录结构总览，且（在存在或可推断时）含系统架构图或推断架构图（Mermaid），来源/待确认已标注
```

## 项目内示例

- 空白骨架见 [examples.md](examples.md)。
- 完整单路由写法可参考项目根目录的 `CUSTOMER_HANDOVER.md`（`/customer` 页）。
