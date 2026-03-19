# ATOM-Admin MCP

基于 Model Context Protocol (MCP) 的 Atom 管理台数据访问服务，通过 stdio 与 Cursor 等 MCP 客户端通信，提供用户组、版本、飞机型号、禁飞区等数据的查询与操作能力。

## 项目结构

```
MCP/ATOM-Admin/
├── index.js              # MCP 服务器入口，注册所有工具
├── config.js             # 配置：baseUrl、环境、OSS region/bucket
├── package.json
├── README.md
├── src/
│   ├── request.js        # 统一请求封装（baseUrl、Token、错误处理）
│   ├── token.js          # Token 缓存（内存 + ~/.atom-admin-mcp/token.json）
│   ├── services/         # 业务服务层
│   │   ├── user.js       # 用户、用户组
│   │   ├── version.js    # iOS/Android/带屏控最低版本
│   │   ├── aircraft.js   # 飞机型号、固件版本
│   │   ├── noFlyZone.js  # 禁飞区：创建、打包上传、启用/禁用
│   │   └── oss.js        # 阿里云 OSS：STS 凭证、上传
│   └── tools/            # 本地脚本（非 MCP 工具）
│       ├── index.cjs     # 禁飞区数据爬取脚本
│       └── group.cjs     # 给禁飞区数据分组相关
├── data.json             # 禁飞区源数据
├── NoFlyZoneOrigin/      # 已分类禁飞区源数据（CN/AF/HK/MO/TW.json），打包上传时使用
└── *.tar.bz2             # 打包生成的禁飞区压缩包
```

## 功能概览

| 模块 | 功能 |
|------|------|
| **认证** | Token 设置、缓存、校验 |
| **用户** | 用户信息、用户组列表 |
| **版本** | iOS/Android/带屏控最低版本列表 |
| **飞机** | 飞机型号、固件版本 |
| **禁飞区** | 创建记录、爬取数据、打包上传 OSS、更新路径、启用/禁用、全员推送 |
| **OSS** | STS 凭证、OSS 客户端初始化、禁飞区包上传 |

## MCP 工具一览

### 认证与配置

| 工具名 | 功能 |
|--------|------|
| `set_token` | 设置并缓存 token，供后续接口使用 |
| `get_user_info` | 读取用户信息，也可用于校验 token |
| `set_env` | 设置环境（dev/test/prod），影响 OSS region、bucket |
| `init_aliyun_client` | 初始化阿里云 OSS 客户端（单例） |
| `get_oss_credentials` | 获取 OSS STS 临时凭证 |
| `get_cached_oss_credentials` | 获取已缓存的 OSS 凭证（不发起请求） |

### 用户与版本

| 工具名 | 功能 |
|--------|------|
| `get_user_groups` | 获取用户组列表 |
| `get_ios_min_version` | 获取 iOS 最低版本列表 |
| `get_android_min_version` | 获取 Android 最低版本列表 |
| `get_screen_control_min_version` | 获取带屏控最低版本列表 |
| `get_aircraft_models` | 获取飞机型号列表 |
| `get_aircraft_firmware_version` | 根据 deviceId 获取固件版本列表 |

### 禁飞区

| 工具名 | 功能 |
|--------|------|
| `query_no_fly_zone_records` | 查询禁飞区记录（支持分页） |
| `create_no_fly_zone_record` | 创建禁飞区记录（POST），返回 id、version |
| `crawl_no_fly_zone_data` | 爬取禁飞区数据（调用本地脚本） |
| `package_upload_no_fly_zone_data` | 打包 NoFlyZoneOrigin 为 tar.bz2 并上传 OSS |
| `update_no_fly_zone_record_path` | 更新禁飞区记录的 OSS 文件路径 |
| `set_no_fly_zone_record_status` | 设置启用/禁用状态 |
| `push_no_fly_zone_record_to_all` | 全员推送禁飞区记录 |

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ATOM_ADMIN_BASE_URL` | 后端 API 地址 | `http://192.168.1.114:8088` |

### Token

- 通过 `set_token` 设置，会持久化到 `~/.atom-admin-mcp/token.json`
- 启动时自动加载并校验，无效则清除
- 所有接口请求在 Header 中携带 `Token`

### 环境与 OSS

- `set_env` 可切换 dev/test/prod
- dev/test：`oss-cn-shenzhen`，bucket `potensic-atom-test`
- prod：`oss-cn-shenzhen`，bucket `potensic-atom-prod`

## 配合使用的 MCP 与 Skill

### Cursor MCP 配置

在 Cursor 设置中启用 `user-atom-admin-mcp`，指向本项目的 `index.js`：

```json
{
  "mcpServers": {
    "user-atom-admin-mcp": {
      "command": "node",
      "args": ["D:/demo/ai-tools/MCP/ATOM-Admin/index.js"]
    }
  }
}
```

### create-no-fly-zone Skill

项目根目录 `.cursor/skills/create-no-fly-zone/SKILL.md` 定义了禁飞区创建工作流，依赖 `user-atom-admin-mcp` 的以下工具：

| 步骤 | 工具 |
|------|------|
| Token 校验 | `get_user_info`、`set_token` |
| 选择用户组 | `get_user_groups` |
| 选择版本 | `get_ios_min_version`、`get_android_min_version`、`get_screen_control_min_version` |
| 选择飞机 | `get_aircraft_models`、`get_aircraft_firmware_version` |
| 创建与发布 | `create_no_fly_zone_record`、`init_aliyun_client`、`package_upload_no_fly_zone_data`、`update_no_fly_zone_record_path`、`set_no_fly_zone_record_status` |

当用户说「创建禁飞区」「生成禁飞区」等时，AI 会按 Skill 流程引导用户选择参数，并调用上述工具完成创建、打包、上传、启用。

## 如何使用

### 1. 安装依赖

```bash
cd MCP/ATOM-Admin
npm install
```

### 2. 设置 Token

在 Cursor 中通过 AI 对话调用 `set_token`，或手动在 `~/.atom-admin-mcp/token.json` 写入：

```json
{ "token": "你的 token" }
```

Token 从 Atom 管理台登录后获取。

### 3. 启动 MCP 服务

- **开发调试**：`npm run dev`（使用 MCP Inspector）
- **生产**：由 Cursor 等 MCP 客户端自动启动

### 4. 调用示例

在 Cursor 中可直接说：

- 「创建禁飞区」→ 触发 create-no-fly-zone Skill
- 「获取用户组」→ 调用 `get_user_groups`
- 「获取飞机型号」→ 调用 `get_aircraft_models`

## 代码职责说明

| 文件 | 职责 |
|------|------|
| `index.js` | MCP 入口，用 Zod 定义工具参数，调用 services 层 |
| `config.js` | baseUrl、环境、OSS 映射 |
| `src/request.js` | 统一 fetch 封装，自动加 Token，解析 code/msg |
| `src/token.js` | Token 内存缓存 + 本地持久化 |
| `src/services/user.js` | 用户、用户组 API |
| `src/services/version.js` | 各平台最低版本 API |
| `src/services/aircraft.js` | 飞机型号、固件版本 API |
| `src/services/noFlyZone.js` | 禁飞区 CRUD、爬取、打包上传、启用/禁用 |
| `src/services/oss.js` | STS 凭证、OSS 客户端、禁飞区包上传 |
| `src/tools/index.cjs` | 禁飞区数据爬取（独立进程） |

## 依赖

- Node.js >= 18
- `@modelcontextprotocol/sdk`：MCP 协议
- `ali-oss`：阿里云 OSS 上传
- `moment`：时间格式化
- `zod`：参数校验

## License

MIT
