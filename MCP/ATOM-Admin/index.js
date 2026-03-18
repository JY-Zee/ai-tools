#!/usr/bin/env node
/**
 * ATOM-Admin MCP 服务器入口
 * 通过 stdio 与 Cursor 等 MCP 客户端通信，提供 Atom 管理台数据访问能力
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { setToken, loadFromLocal, clearToken, hasToken } from "./src/token.js";
import {
  getUserInfo,
  getUserGroups,
} from "./src/services/user.js";
import {
  getIosMinVersion,
  getAndroidMinVersion,
  getScreenControlMinVersion,
} from "./src/services/version.js";
import {
  getAircraftModels,
  getAircraftFirmwareVersion,
} from "./src/services/aircraft.js";
import {
  queryNoFlyZoneRecords,
  createNoFlyZoneRecord,
  crawlNoFlyZoneData,
  packageUploadNoFlyZoneData,
  updateNoFlyZoneRecordPath,
  setNoFlyZoneRecordStatus,
  pushNoFlyZoneRecordToAll,
} from "./src/services/noFlyZone.js";
import {
  getOssCredentials,
  getCachedOssCredentials,
  initAliyunClient,
} from "./src/services/oss.js";
import { setEnv } from "./config.js";
import moment from "moment";

const server = new McpServer({
  name: "atom-admin",
  version: "1.0.0",
});

/** 统一返回 MCP 格式 */
const toContent = (result) => ({
  content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
});

// 1. 设置并缓存 token
server.tool(
  "set_token",
  "设置并缓存 token，供后续接口调用使用",
  { token: z.string().describe("认证 token") },
  async ({ token }) => {
    setToken(token);
    return toContent({ success: true });
  }
);

// 2. 读取用户信息
server.tool(
  "get_user_info",
  "读取用户信息",
  {},
  async () => toContent(await getUserInfo())
);

// 2.1 获取阿里云 OSS 的 STS 临时凭证
server.tool(
  "get_oss_credentials",
  "获取阿里云 OSS 的 STS 临时凭证，GET /api/sts/oss，成功后缓存 data 并返回 accessKeyId、accessKeySecre、expiration、securityToken",
  {},
  async () => toContent(await getOssCredentials())
);

// 2.2 获取已缓存的 OSS 凭证（不发起请求）
server.tool(
  "get_cached_oss_credentials",
  "获取已缓存的 OSS 凭证，不发起网络请求。若尚未调用 get_oss_credentials 则返回 null",
  {},
  async () => toContent({ data: getCachedOssCredentials() })
);

// 2.3 设置环境
server.tool(
  "set_env",
  "设置环境并全局缓存，影响 aliossRegion、aliossBucket 等配置",
  {
    env: z
      .enum(["dev", "test", "prod"])
      .describe("环境：dev 开发、test 测试、prod 生产"),
  },
  async ({ env }) => {
    setEnv(env);
    return toContent({ success: true });
  }
);

// 2.4 初始化阿里云 OSS 客户端
server.tool(
  "init_aliyun_client",
  "初始化阿里云 OSS 客户端（单例）。先获取 STS 临时凭证，成功后创建并缓存 OSS 客户端",
  {},
  async () => toContent(await initAliyunClient())
);

// 3. 获取用户组数据
server.tool(
  "get_user_groups",
  "获取用户组数据",
  {},
  async () => toContent(await getUserGroups())
);

// 4. 获取 iOS 最低版本
server.tool(
  "get_ios_min_version",
  "获取 iOS 最低版本",
  {},
  async () => toContent(await getIosMinVersion())
);

// 5. 获取 Android 最低版本
server.tool(
  "get_android_min_version",
  "获取 Android 最低版本",
  {},
  async () => toContent(await getAndroidMinVersion())
);

// 6. 获取带屏控最低版本
server.tool(
  "get_screen_control_min_version",
  "获取带屏控最低版本",
  {},
  async () => toContent(await getScreenControlMinVersion())
);

// 7. 获取飞机型号
server.tool(
  "get_aircraft_models",
  "获取飞机型号",
  {},
  async () => toContent(await getAircraftModels())
);

// 8. 获取飞行器固件版本
server.tool(
  "get_aircraft_firmware_version",
  "获取飞行器固件版本",
  {
    deviceId: z.string().describe("机型号 ID，来自 get_aircraft_models 返回的 value"),
  },
  async ({ deviceId }) => toContent(await getAircraftFirmwareVersion(deviceId))
);

// 9. 查询禁飞区记录
server.tool(
  "query_no_fly_zone_records",
  "查询禁飞区记录，支持可选分页与筛选",
  {
    page: z.number().optional().describe("页码"),
    pageSize: z.number().optional().describe("每页条数"),
  },
  async (params) => toContent(await queryNoFlyZoneRecords(params))
);

// 10. 创建禁飞区记录
server.tool(
  "create_no_fly_zone_record",
  `创建禁飞区记录，PUT /api/app/infoPush/noFlyZone，返回 id 和 version。
参数说明：
- userGroupId: 用户组id，必填
- minIosVersion: iOS最低版本，必填
- minAndroidVersion: Android最低版本，必填
- minTabletVersion: 带屏控最低版本，必填
- deviceId: 飞机型号id，必填
- minFlightVersion: 固件版本，必填
- version: 推送版本号，必填
- remark: 备注信息，必填
- customEdit: 自定义禁飞区 JSON 字符串（可选，留空则自动生成）
- id: 禁飞区记录id，必填
- pushTime: 推送时间（可选，默认当前时间，格式如 2026-03-17 16:37:31）
- isGatherer: 固定为 0，无需传入
示例参数：
{
  "userGroupId": "用户组id",
  "minIosVersion": "01.00.003",
  "minAndroidVersion": "01.00.003",
  "minTabletVersion": "01.00.003",
  "deviceId": "PTL-FC001",
  "minFlightVersion": "01.00.003",
  "version": "01.01.002",
  "remark": "本次创建描述",
  "customEdit": "{\"areas\":[]}"
  "id": "禁飞区记录id"
}
`,
  {
    userGroupId: z.string().describe("用户组ID（必填）").default(""),
    minIosVersion: z.string().describe("iOS最低版本（必填）").default(""),
    minAndroidVersion: z.string().describe("Android最低版本（必填）").default(""),
    minTabletVersion: z.string().describe("带屏控最低版本（必填）").default(""),
    deviceId: z.string().describe("飞机型号ID（必填）").default(""),
    minFlightVersion: z.string().describe("固件版本（必填）").default(""),
    version: z.string().describe("推送版本号（必填）").default(""),
    remark: z.string().describe("备注信息（必填）").default(""),
    customEdit: z.string().optional().describe("自定义禁飞区 JSON 字符串（可选，留空则自动生成）"),
    id: z.string().describe("禁飞区记录id").default(""),
    pushTime: z.string().optional().describe("推送时间（可选，默认当前时间，格式如 2026-03-17 16:37:31）"),
  },
  async (params) => {
    const payload = {
      ...params,
      isGatherer: 0,
      pushTime: params.pushTime ?? moment().format("YYYY-MM-DD HH:mm:ss"),
    };
    return toContent(await createNoFlyZoneRecord(payload));
  }
);

// 11. 爬取禁飞区数据
server.tool(
  "crawl_no_fly_zone_data",
  "爬取禁飞区数据",
  {},
  async () => toContent(await crawlNoFlyZoneData())
);

// 12. 更新禁飞区记录的文件路径
server.tool(
  "update_no_fly_zone_record_path",
  "更新禁飞区记录的文件路径，POST /api/app/infoPush/noFlyZone/updatePath",
  {
    id: z.string().describe("禁飞区记录 id"),
    pathOss: z.string().describe("文件路径（OSS 路径）"),
  },
  async ({ id, pathOss }) =>
    toContent(await updateNoFlyZoneRecordPath({ id, pathOss }))
);

// 13. 打包/上传禁飞区数据包
server.tool(
  "package_upload_no_fly_zone_data",
  "打包/上传禁飞区数据包：复制 NoFlyZoneOrigin 为 dist，压缩为 version-timestamp.tar.bz2 并上传至 OSS /noFlyZone/",
  {
    version: z.string().describe("版本号，如 01.01.002"),
  },
  async ({ version }) => toContent(await packageUploadNoFlyZoneData(version))
);

// 14. 设置禁飞区记录启用状态（启用/禁用）
server.tool(
  "set_no_fly_zone_record_status",
  "设置禁飞区记录启用状态，PUT /api/app/infoPush/noFlyZone，body: { id, status }，enabled 为 true 时启用(status=1)，false 时禁用(status=0)",
  {
    id: z.union([z.string(), z.number()]).describe("记录 ID"),
    enabled: z.boolean().describe("true 启用，false 禁用"),
  },
  async ({ id, enabled }) => toContent(await setNoFlyZoneRecordStatus(id, enabled))
);

// 15. 全员推送禁飞区记录
server.tool(
  "push_no_fly_zone_record_to_all",
  "全员推送禁飞区记录，PUT /api/app/infoPush/noFlyZone，body: { id, userGroupId: 0 }",
  { id: z.union([z.string(), z.number()]).describe("记录 ID") },
  async ({ id }) => toContent(await pushNoFlyZoneRecordToAll(id))
);

/** 启动时从本地加载 token 并校验，无效则清除 */
async function initTokenValidation() {
  loadFromLocal();
  if (!hasToken()) return;
  const result = await getUserInfo();
  if (result?.error) {
    clearToken();
    console.error("atom-admin: 本地 token 已失效，已清除缓存");
  }
}

async function main() {
  await initTokenValidation();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("atom-admin MCP server running on stdio");
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
