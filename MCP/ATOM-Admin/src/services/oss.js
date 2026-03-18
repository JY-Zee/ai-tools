/**
 * 阿里云 OSS / STS 相关服务
 */

import OSS from "ali-oss";
import { request } from "../request.js";
import { getAliossRegion, getAliossBucket } from "../../config.js";

/** 缓存的 OSS 凭证数据 */
let ossCredentialsCache = null;

/** OSS 客户端单例 */
let ossClientCache = null;

/**
 * 从凭证对象中解析 accessKeySecret（兼容后端 accessKeySecre 拼写）
 * @param {Record<string, unknown>} cred - STS 返回的凭证对象
 * @returns {string}
 */
function resolveAccessKeySecret(cred) {
  return (
    cred.AccessKeySecret ??
    cred.accessKeySecret ??
    cred.accessKeySecre ??
    ""
  );
}

/**
 * 获取阿里云 OSS 的 STS 临时凭证
 * GET /api/sts/oss，请求成功后缓存 data 并返回
 * @returns {Promise<{ data?: { accessKeyId: string; accessKeySecre: string; expiration: string; securityToken: string }; error?: string }>}
 */
export async function getOssCredentials() {
  const result = await request("api/sts/oss", { method: "GET" });

  if (result.error) return result;

  ossCredentialsCache = result.data;
  return { data: result.data };
}

/**
 * 获取已缓存的 OSS 凭证（不发起请求）
 * @returns {{ accessKeyId: string; accessKeySecre: string; expiration: string; securityToken: string } | null}
 */
export function getCachedOssCredentials() {
  return ossCredentialsCache;
}

/**
 * 初始化阿里云 OSS 客户端（单例）
 * 先获取 STS 临时凭证，成功后创建并缓存 OSS 客户端，支持 refreshSTSToken 自动刷新
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function initAliyunClient() {
  const credResult = await getOssCredentials();
  if (credResult.error) {
    return { error: credResult.error };
  }

  const cred = credResult.data;
  const accessKeyId = cred.AccessKeyId ?? cred.accessKeyId ?? "";
  const accessKeySecret = resolveAccessKeySecret(cred);
  const stsToken = cred.SecurityToken ?? cred.securityToken ?? "";

  if (!accessKeyId || !accessKeySecret || !stsToken) {
    return { error: "STS 凭证不完整，缺少 accessKeyId、accessKeySecret 或 securityToken" };
  }

  ossClientCache = new OSS({
    region: getAliossRegion(),
    accessKeyId,
    accessKeySecret,
    stsToken,
    refreshSTSToken: async () => {
      const info = await getOssCredentials();
      if (info.error || !info.data) {
        throw new Error(info.error ?? "刷新 STS 失败");
      }
      const c = info.data;
      return {
        accessKeyId: c.AccessKeyId ?? c.accessKeyId,
        accessKeySecret: resolveAccessKeySecret(c),
        stsToken: c.SecurityToken ?? c.securityToken,
      };
    },
    refreshSTSTokenInterval: 300000,
    bucket: getAliossBucket(),
  });

  return { success: true };
}

/**
 * 获取已初始化的 OSS 客户端单例
 * @returns {OSS | null} 未初始化时返回 null
 */
export function getOssClient() {
  return ossClientCache;
}

/**
 * 上传禁飞区压缩包到阿里云 OSS
 * @param {string} fileName - 压缩包文件名（如 01.01.002-20260317182131.tar.bz2）
 * @param {string} localFilePath - 本地文件完整路径
 * @returns {Promise<{ success?: boolean; name?: string; error?: string }>}
 */
export async function uploadNoFlyZoneToOss(fileName, localFilePath) {
  const client = getOssClient();
  if (!client) {
    return { error: "OSS 客户端未初始化，请先调用 init_aliyun_client" };
  }

  try {
    const objectName = `/noFlyZone/${fileName}`;
    const result = await client.put(objectName, localFilePath);
    return { success: true, name: result.name ?? objectName };
  } catch (e) {
    return {
      error: e?.message ?? String(e) ?? "上传失败",
    };
  }
}
