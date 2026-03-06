---
name: lanhu-ui-json-parser
description: 解析蓝湖页面链接，使用项目根目录 `.lanhuConfig` 中的 cookie 拉取设计 JSON，分析目标图层并结合截图筛选生成组件所需数据。Use when the user provides a Lanhu URL, asks to parse Lanhu JSON, analyze UI layers, extract container data, or generate components from a Lanhu design.
---

# Lanhu UI JSON Parser

## When To Use

在这些场景自动使用这个技能：

- 用户提供蓝湖页面链接，要求解析页面 UI JSON
- 用户要求分析蓝湖设计稿中的某个图层
- 用户希望根据蓝湖 JSON 和截图筛选图层
- 用户希望基于蓝湖设计稿生成前端组件

## Workflow

按下面顺序执行：

1. 检查项目根目录是否存在 `.lanhuConfig`
1. 读取其中的 `cookie`
1. 如果没有 cookie，向用户索取，不要猜测
1. 解析用户提供的蓝湖 URL，提取 `image_id` 和 `project_id`
1. 用下面的接口拉取图片详情

```text
https://lanhuapp.com/api/project/image?dds_status=1&image_id=${image_id}&project_id=${project_id}
```

1. 在请求头中设置 `Cookie`
1. 校验返回数据是否包含 `result.versions`
1. 取 `versions[0].json_url`
1. 下载该 JSON 到 `.lanhuJson/`
1. 文件名使用 `SketchJSONURL${当前日期}.json`
1. 分析 JSON 的根图层和图层树
1. 根据用户指定图层或确认后的候选图层继续分析
1. 结合用户提供的截图筛选出实际出现的图层
1. 保存筛选结果到 `containerJson.json`
1. 一次性收集组件生成所需信息
1. 按项目技术栈和UI框架生成可扩展组件代码，因为第三方UI框架，有自带的class，如果你使用之后发现无符合，需要你自己去修改样式

默认可直接调用这些脚本：

- `node .cursor/skills/lanhu-ui-json-parser/scripts/fetch-lanhu-json.js --url "<lanhu-url>"`
- `node .cursor/skills/lanhu-ui-json-parser/scripts/analyze-lanhu-json.js --layer "<图层名>"`

## Request Rules

### Cookie

- 默认从项目根目录 `.lanhuConfig` 读取 cookie
- 文件内容按下面结构处理：

```js
{
  cookie: 'your lanhu cookie'
}
```

- 如果文件不存在、字段缺失、或 cookie 为空，立即询问用户

### URL Parsing

- 从用户给出的蓝湖 URL 中提取 `image_id` 和 `project_id`
- 如果任一参数缺失，提示用户链接无效并请其重新提供

### Response Validation

- 只接受包含 `result.versions` 的响应
- `versions` 必须是非空列表
- 如果结构不符合预期，明确告诉用户接口返回不符合约定结构

## JSON Analysis Rules

### Root Layer

先分析 `info` 字段：

- `info` 是列表时，使用第一个对象作为页面根图层描述
- `width` 表示设计稿基准宽度，应作为布局参考
- `height` 只作记录，不作为最终实现的核心参考
- `name` 是图层名
- `fills` 描述根图层背景色

`info` 之外的其余 JSON 视为图层树继续分析。

### Target Layer Selection

- 如果用户没有明确指定要分析的图层，先询问用户
- 用户给出图层名后，按全匹配优先搜索
- 图层名可能含有特殊符号，搜索前先做安全转义
- 如果转义后仍找不到，寻找名字最接近的图层并向用户确认
- 未经用户确认，不要把近似图层直接当成目标图层

### Target Layer Fields

找到目标图层后，重点解析：

- `radius`
- `ddsOriginFrame`
- `layerOriginFrame`，仅在 `ddsOriginFrame` 缺失时作为回退
- `fills`
- `font`
- `shadow` 字段：如果目标图层或其样式存在 `shadow`（如 `boxShadow`、`effect` 等），应作为样式属性读取和解析。
  - 将 `shadow` 与 `font` 一样视为重要的样式属性。
  - 解析包括颜色（如 `color.value`）、偏移量（如 `offsetX`, `offsetY`）、模糊半径（`blurRadius`）和透明度（`opacity`）。
  - 生成代码时，自动组装成 CSS（或等效框架下的阴影属性），如 `box-shadow`。
  - 如果有多个阴影，按顺序全部生成。
  - 若结构或类型不明确，需向用户确认具体阴影样式需求。
- `image` 字段：如果图层包含 `image`，则判定为图片类型，应作为图片标签处理（如 `<img>` 或合适的图片组件）。
  - 图片的 URL 优先使用 `image.svgUrl`，若不存在则退回使用 `image.imageUrl`。
  - 图片尺寸使用 `image.size` 字段，读取其 `width` 和 `height`。
  - 生成代码时，自动为图片元素设置合适的 `src`、`width`、`height` 属性。
  - 若有其他图片相关属性（如 `alt`），可结合图层 `name` 补充。

字体读取规则：

- 从 `font` 字段中读取字体信息
- `font.size` 作为字体大小
- `font.font` 或 `font.displayName` 作为字体名称
- `font.color.value` 作为字体颜色
- `font.line` 作为行高
- `font.align` 作为文本对齐方式（如 `left`、`center`、`right`）
- `font.spacing` 或 `font.kerning` 作为字间距
- `font.content` 作为文本内容
- `font.styles` 数组中可能包含富文本样式，需逐段解析
- `font.styles[].decorationLine` 作为文本装饰（如 `underline`、`line-through`、`none`）
- `font.verticalAlignment` 作为垂直对齐方式
- 生成代码时，自动组装成 CSS 字体属性（如 `font-size`、`font-family`、`color`、`line-height`、`text-align`、`letter-spacing`）

定位信息读取规则：

- 优先使用 `ddsOriginFrame`
- 若不存在，退回使用 `layerOriginFrame`
- 从中读取 `width`、`height`、`x`、`y`

颜色读取规则：

- 从 `fills` 中读取背景填充
- `color.value` 作为颜色值
- `opacity` 作为透明度

阴影读取规则：

- 从 `shadow` 数组中读取阴影信息
- `color.value` 作为阴影颜色
- `offsetX`、`offsetY` 作为偏移量
- `blurRadius` 作为模糊半径
- `spread` 作为扩展半径
- `opacity` 作为透明度
- `type` 区分外阴影和内阴影（如 `内阴影`）
- 多个阴影按数组顺序依次生成

图片读取规则：

- 从 `image` 字段中读取图片信息
- 优先使用 `image.svgUrl`，若不存在则使用 `image.imageUrl`
- `image.size.width` 和 `image.size.height` 作为图片尺寸
- 图层 `name` 可作为 `alt` 属性补充

## Child Layer Filtering

根据目标图层的定位框，在 `info` 列表和图层树中筛选所有位于该图层范围内的其他图层，作为候选图层列表。

然后执行交互：

1. 向用户索要 UI 截图
2. 识别截图中的文案或图案
3. 与候选图层列表对比
4. 仅保留截图中实际出现的图层
5. 保存结果到 `containerJson.json`

## Component Generation Intake

在开始生成代码前，一次性向用户确认以下内容：

- 组件名
- 组件状态和交互需求
- 技术栈
- UI 框架
- 其他补充要求

如果仓库结构中已经能推断技术栈或 UI 框架，先自行判断；只有无法判断时再询问用户。

## Code Generation Rules

生成组件时遵守以下约束：

- 以图层为基本单位组织结构，一个图层可映射为一个元素或一个组件
- 如果存在 `font` 字段，解析文字样式
- 使用子图层与根图层的 `x`、`y` 差值，推导布局中的 `margin` 或 `padding`
- 布局优先使用 Flex，必要时使用 Grid
- 以用户给定的组件名创建文件夹
- 在组件目录内输出主体代码
- 对复杂区域或关联紧密的图层自动拆分子组件
- 子组件放在 `components/` 目录下
- 代码需要便于后续修改数据结构、状态和交互

## Output Expectations

执行这个技能时，优先产出这些结果：

- 下载后的蓝湖 JSON 文件
- 根图层分析结果
- 目标图层分析结果
- 截图筛选后的 `containerJson.json`
- 按指定技术栈生成的组件代码

## Utility Scripts

### Download design JSON

执行：

```bash
node .cursor/skills/lanhu-ui-json-parser/scripts/fetch-lanhu-json.js --url "<lanhu-url>"
```

行为：

- 从项目根目录 `.lanhuConfig` 读取 cookie
- 解析 `image_id` 和 `project_id`
- 请求蓝湖接口并校验 `result.versions[0].json_url`
- 下载 JSON 到 `.lanhuJson/`

### Analyze target layer

执行：

```bash
node .cursor/skills/lanhu-ui-json-parser/scripts/analyze-lanhu-json.js --layer "<图层名>"
```

行为：

- 自动读取最新的 `SketchJSONURL*` 文件，或使用 `--file` 指定文件
- 输出根图层摘要
- 按图层名精确匹配目标图层
- 未找到时输出最接近的候选图层名
- 生成候选 `containerJson.json`

## Additional Resources

- 更多命令示例见 [examples.md](examples.md)

## Example Triggers

- “分析这个蓝湖链接，帮我拿到页面 JSON”
- “读取蓝湖设计稿，找到某个容器图层”
- “结合截图筛一下哪些图层真正出现了”
- “根据蓝湖 JSON 帮我生成 React 组件”
