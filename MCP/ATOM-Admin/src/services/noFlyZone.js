/**
 * 禁飞区相关服务
 * 查询、创建、爬取、打包上传、启用/禁用
 */

import fs from "fs";
import { request } from "../request.js";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import moment from "moment";
import {
  getOssClient,
  initAliyunClient,
  uploadNoFlyZoneToOss,
} from "./oss.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** 查询禁飞区记录 */
export async function queryNoFlyZoneRecords(options = {}) {
  return { placeholder: true, ...options };
}

/**
 * 创建禁飞区记录
 * @param {Object} params - 创建禁飞区参数
 * @param {string} params.userGroupId - 用户组 id
 * @param {string} params.iosMinVersion - iOS 版本 label
 * @param {string} params.minAndroidVersion - Android 版本 label
 * @param {string} params.minTabletVersion - 带屏控版本 label
 * @param {string} params.deviceId - 飞机型号 id
 * @param {string} params.minFlightVersion - 固件版本 label
 * @param {string} params.version - 推送版本号
 * @param {string} params.remark - 备注信息
 * @param {string} [params.customEdit] - 自定义禁飞区 JSON 字符串（可选）
 * 
 * @returns {Promise<{ data?: { id: string; version: string }; error?: string }>}
 *
 * params 入参结构示例:
 * {
 *   userGroupId: "用户组 id",
 *   iosMinVersion: "iOS 版本 label",
 *   minAndroidVersion: "Android 版本 label",
 *   minTabletVersion: "带屏控版本 label",
 *   deviceId: "飞机型号 id",
 *   minFlightVersion: "固件版本 label",
 *   version: "推送版本号",
 *   remark: "备注信息",
 *   customEdit: "{\"...\": \"...\"}" // 可选
 * }
 */
export async function createNoFlyZoneRecord(params = {}) {
  // 业务上必需的字段做兜底（表单层已校验，这里为二次兜底防异常）
  const {
    userGroupId = "",
    minAndroidVersion = "",
    minTabletVersion = "",
    deviceId = "",
    minFlightVersion = "",
    pushTime = "",
    isGatherer = "",
    version = "",
    remark = "",
    customEdit,
    minIosVersion = "",
    id,
  } = params;

  const payload = {
    userGroupId,
    minAndroidVersion,
    minTabletVersion,
    deviceId,
    minFlightVersion,
    version,
    remark,
    pushTime,
    isGatherer,
    minIosVersion,
    ...(id ? { id } : {}),
    ...(customEdit ? { customEdit } : {}),
  };

  // 如有 id 字段则用 PUT，否则用 POST
  const method = id ? "PUT" : "POST";
  const result = await request("api/app/infoPush/noFlyZone", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (result.error) return result;
  return { data: result.data };
}

/**
 * 爬取禁飞区数据
 * 调用 src/tools/index.js 执行爬取任务，完成后返回成功
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function crawlNoFlyZoneData() {
  const toolsPath = path.join(__dirname, "..", "tools", "index.cjs");

  return new Promise((resolve) => {
    const child = spawn("node", [toolsPath], {
      cwd: path.join(__dirname, "..", ".."),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          error: stderr || `爬取进程退出码: ${code}`,
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        error: `启动爬取任务失败: ${err?.message ?? String(err)}`,
      });
    });
  });
}

/**
 * 打包并上传禁飞区数据包到 OSS
 * @param {string} version - 版本号，如 01.01.002
 * @returns {Promise<{ success?: boolean; fileName?: string; error?: string }>}
 */
export async function packageUploadNoFlyZoneData(version) {
  const baseDir = path.join(__dirname, "..", "..");
  const originDir = path.join(baseDir, "NoFlyZoneOrigin");
  const distDir = path.join(baseDir, "dist");

  // 1. 判断本地是否存在 NoFlyZoneOrigin 文件夹
  if (!fs.existsSync(originDir) || !fs.statSync(originDir).isDirectory()) {
    return { error: "NoFlyZoneOrigin 文件夹不存在" };
  }

  // 2. 在同目录下复制 NoFlyZoneOrigin，命名为 dist（先删除已存在的 dist）
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.cpSync(originDir, distDir, { recursive: true });

  // 3. 压缩成 .tar.bz2，文件名：version-timestamp.tar.bz2
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const fileName = `${version}-${timestamp}.tar.bz2`;
  const archivePath = path.join(baseDir, fileName);

  const tarResult = await new Promise((resolve) => {
    const tar = spawn("tar", ["-cjf", archivePath, "dist"], {
      cwd: baseDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    tar.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    tar.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ error: stderr || `压缩失败，退出码: ${code}` });
      }
    });

    tar.on("error", (err) => {
      resolve({
        error: `执行 tar 失败: ${err?.message ?? String(err)}，请确保系统已安装 tar 且支持 bzip2`,
      });
    });
  });

  if (tarResult.error) {
    return { error: tarResult.error };
  }

  // 4. 检查本地是否真的存在压缩后的文件
  if (!fs.existsSync(archivePath) || !fs.statSync(archivePath).isFile()) {
    return { error: "压缩文件生成失败，本地未找到文件" };
  }

  // 5. 确保 OSS 客户端已初始化
  if (!getOssClient()) {
    const initResult = await initAliyunClient();
    if (initResult.error) {
      return { error: `OSS 初始化失败: ${initResult.error}` };
    }
  }

  // 6. 调用上传阿里云 OSS 服务方法
  const uploadResult = await uploadNoFlyZoneToOss(fileName, archivePath);

  if (uploadResult.error) {
    return { error: `上传失败: ${uploadResult.error}` };
  }

  // 清理临时 dist 目录和本地压缩包（可选，按需保留）
  try {
    if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });
  } catch {
    // 忽略清理失败
  }

  return { success: true, fileName };
}

/**
 * 更新禁飞区记录的文件路径
 * @param {Object} params - 入参
 * @param {string} params.id - 禁飞区记录 id
 * @param {string} params.pathOss - 文件路径（OSS 路径）
 * @returns {Promise<{ data?: unknown; error?: string }>} 成功返回 { data }，失败返回 { error }
 */
export async function updateNoFlyZoneRecordPath({ id, pathOss }) {
  const result = await request("api/app/infoPush/noFlyZone/updatePath", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, pathOss, status: 0 }),
  });
  if (result.error) return result;
  return { data: result.data ?? { success: true } };
}

/**
 * 设置禁飞区记录启用状态
 * PUT /api/app/infoPush/noFlyZone，body: { id, status }
 * @param {string|number} id - 记录 id
 * @param {boolean} enabled - true 启用(status=1)，false 禁用(status=0)
 * @returns {Promise<{ data?: unknown; error?: string }>}
 */
export async function setNoFlyZoneRecordStatus(id, enabled) {
  const status = enabled ? 1 : 0;
  const result = await request("api/app/infoPush/noFlyZone", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: String(id), status }),
  });
  if (result.error) return result;
  return { data: result.data ?? { success: true } };
}

/**
 * 全员推送禁飞区记录
 * PUT /api/app/infoPush/noFlyZone，body: { id, userGroupId: "0" }
 * @param {string|number} id - 记录 id
 * @returns {Promise<{ data?: unknown; error?: string }>}
 */
export async function pushNoFlyZoneRecordToAll(id) {
  const result = await request("api/app/infoPush/noFlyZone", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: String(id), userGroupId: "0" }),
  });
  if (result.error) return result;
  return { data: result.data ?? { success: true } };
}
