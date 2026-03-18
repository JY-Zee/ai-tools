---
name: create-no-fly-zone
description: 通过 atom-admin-mcp 创建、更新、生成或获取禁飞区配置。当用户提到创建禁飞区、生成禁飞区、获取禁飞区、更新禁飞区等指令时调用此 skill。
---

# 禁飞区配置 Skill

## 触发场景

当用户表达以下意图时使用此 skill：

- 创建禁飞区
- 生成禁飞区
- 获取禁飞区
- 更新禁飞区
- 配置禁飞区
- 相关类似指令

## 前置条件

- 需启用 `user-atom-admin-mcp` MCP 服务
- 通过 `call_mcp_tool` 调用 atom-admin 工具，server 为 `user-atom-admin-mcp`

```javascript
// 调用示例
call_mcp_tool({ server: "user-atom-admin-mcp", toolName: "get_user_groups", arguments: {} })
```

## 工作流

初始化 `params = {}`，按顺序执行以下步骤，每步完成后将结果写入 `params`。

- 初始参数：

  - `params.isGatherer = 0`  
    - 默认为 0
    - 是否采集推送，`0` 表示“否”，`1` 表示“是”。

  - `params.pushTime = 当前日期和时间`  
    - 格式：`YYYY-MM-DD HH:mm:ss`
    - 例如：`2025-10-17 10:58:06`
    - 推送时间为调用此 skill 时的“此刻”。

- 其它参数请按各步骤引导输入、选择，并实时写入 `params` 对象。

### 步骤 1：Token 校验

1. 调用 `get_user_info`（无参数）检查是否已设置 token
2. **有 token 且有效**：继续步骤 2
3. **无 token 或无效**：询问用户设置 token，调用 `set_token` 并缓存，再继续

### 步骤 2：选择用户组

1. 调用 `get_user_groups` 获取用户组列表
2. 将返回的 `data` 数组以 `label` 展示为选项，要求用户**单选**
3. 用户选择后：`params.userGroupId = 选中项的 value`

### 步骤 3：选择 iOS 最低版本

1. 调用 `get_ios_min_version` 获取 iOS 最低版本列表
2. 以 `label` 展示选项，要求用户**单选**
3. 用户选择后：`params.minIosVersion = 选中项的 label`

### 步骤 4：选择 Android 最低版本

1. 调用 `get_android_min_version` 获取 Android 最低版本列表
2. 以 `label` 展示选项，要求用户**单选**
3. 用户选择后：`params.minAndroidVersion = 选中项的 label`

### 步骤 5：选择带屏控最低版本

1. 调用 `get_screen_control_min_version` 获取带屏控最低版本列表
2. 以 `label` 展示选项，要求用户**单选**
3. 用户选择后：`params.minTabletVersion = 选中项的 label`

### 步骤 6：选择飞机型号

1. 调用 `get_aircraft_models` 获取飞机型号列表
2. 以 `label` 展示选项，要求用户**单选**
3. 用户选择后：`params.deviceId = 选中项的 value`

### 步骤 7：选择飞机固件版本

1. 以 `params.deviceId` 为入参，调用 `get_aircraft_firmware_version` 获取固件版本列表
2. 以 `label` 展示选项，要求用户**单选**
3. 用户选择后：`params.minFlightVersion = 选中项的 label`

### 步骤 8：推送版本号

1. 询问用户填写「推送版本号」
2. 用户输入后：`params.version = 用户输入`

### 步骤 9：备注信息

1. 询问用户填写「备注信息」
2. 用户输入后：`params.remark = 用户输入`

### 步骤 10：自定义禁飞区

1. 询问用户填写「自定义禁飞区」（JSON 字符串）
2. 尝试将字符串解析为 JSON 对象：
   - **解析失败**：提示格式错误，请用户重新输入或选择跳过
   - **解析成功**：`params.customEdit = JSON.stringify(解析后的对象)`
3. 用户选择跳过时，可不设置 `customEdit`

### 步骤 11：创建与发布

#### 11.1 展示并确认

1. 向用户展示完整 `params` 对象
2. 询问用户是否继续执行创建与发布
3. **用户选择不继续**：结束流程，保留已展示的 params 供参考
4. **用户选择继续**：执行 11.2

#### 11.2 创建禁飞区记录

1. 调用 `create_no_fly_zone_record`，传入 params（含 pushTime、isGatherer）
2. 保存返回的 `data.id` 为 `recordId`
3. **失败**：展示错误信息，结束流程
4. **成功**：继续 11.3

#### 11.3 打包并上传

1. 若 OSS 未初始化，先调用 `init_aliyun_client`
2. 调用 `package_upload_no_fly_zone_data`，传入 `{ version: params.version }`
3. 保存返回的 `fileName`（如 `01.01.002-20260317182131.tar.bz2`）
4. **失败**：展示错误信息，说明 recordId 已创建但未完成上传，结束流程
5. **成功**：继续 11.4

#### 11.4 更新文件路径

1. 构造 `pathOss = /noFlyZone/{fileName}`
2. 调用 `update_no_fly_zone_record_path`，传入 `{ id: recordId, pathOss }`
3. **失败**：展示错误信息，说明 recordId、fileName 已生成但路径未更新，结束流程
4. **成功**：继续 11.5

#### 11.5 设置启用状态

1. 询问用户「是否启用该禁飞区记录」
2. 根据用户选择，调用 `set_no_fly_zone_record_status`，传入 `{ id: recordId, enabled: true/false }`
3. **失败**：展示错误信息
4. **成功**：继续 11.6

#### 11.6 完成

向用户展示执行结果摘要：recordId、version、fileName、启用状态。

**错误处理**：任一步骤失败时，向用户展示错误信息，并说明已完成的步骤与未完成的步骤。若用户选择「不继续」或中途失败，仍保留已展示的 params 供用户参考。

## MCP 工具对照表

| 步骤 | 工具名 | 入参 |
|------|--------|------|
| 1 | `get_user_info` | `{}` |
| 1 | `set_token` | `{ token: string }` |
| 2 | `get_user_groups` | `{}` |
| 3 | `get_ios_min_version` | `{}` |
| 4 | `get_android_min_version` | `{}` |
| 5 | `get_screen_control_min_version` | `{}` |
| 6 | `get_aircraft_models` | `{}` |
| 7 | `get_aircraft_firmware_version` | `{ deviceId: string }` |
| 11 | `create_no_fly_zone_record` | params 对象（含 pushTime、isGatherer） |
| 11 | `init_aliyun_client` | `{}`（可选，OSS 未初始化时） |
| 11 | `package_upload_no_fly_zone_data` | `{ version: params.version }` |
| 11 | `update_no_fly_zone_record_path` | `{ id: recordId, pathOss: "/noFlyZone/{fileName}" }` |
| 11 | `set_no_fly_zone_record_status` | `{ id: recordId, enabled: true/false }` |

## params 最终结构示例

```json
{
  "isGatherer": "0",
  "pushTime": "2025-10-17 10:58:06",
  "userGroupId": "用户组 id",
  "minIosVersion": "iOS 版本 label",
  "minAndroidVersion": "Android 版本 label",
  "minTabletVersion": "带屏控版本 label",
  "deviceId": "飞机型号 id",
  "minFlightVersion": "固件版本 label",
  "version": "推送版本号",
  "remark": "备注信息",
  "customEdit": "{\"...\": \"...\"}"
}
```

## 注意事项

- 所有选项展示均使用 `label`，缓存时按步骤说明使用 `label` 或 `value`
- 步骤 7 依赖步骤 6 的 `deviceId`，必须按顺序执行
- 自定义禁飞区 JSON 解析失败时，允许用户跳过，不强制填写
- 步骤 11 依赖 NoFlyZoneOrigin 目录存在；打包上传前需确保 OSS 已初始化（可先调用 `init_aliyun_client`）
