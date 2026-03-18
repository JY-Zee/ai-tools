/**
 * 版本相关服务
 * iOS/Android/带屏控最低版本
 */

import { request } from "../request.js";

/**
 * 按平台获取 appPush 列表
 * @param {number} platform - 1: iOS, 2: Android, 3: 带屏控
 * @returns {Promise<{ data?: Array; error?: string }>}
 */
async function getAppPushListByPlatform(platform) {
  const result = await request("api/appPush/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform }),
  });

  if (result.error) return result;

  const list = Array.isArray(result.data) ? result.data : [];
  const data = list.map((item) => ({
    ...item,
    label: item.version ?? "",
    value: item.id ?? "",
  }));

  return { data };
}

/** 获取 iOS 最低版本 */
export async function getIosMinVersion() {
  return getAppPushListByPlatform(1);
}

/** 获取 Android 最低版本 */
export async function getAndroidMinVersion() {
  return getAppPushListByPlatform(2);
}

/** 获取带屏控最低版本 */
export async function getScreenControlMinVersion() {
  return getAppPushListByPlatform(3);
}
