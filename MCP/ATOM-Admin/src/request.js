/**
 * 统一请求工具
 * 封装 baseUrl、Token header、响应解析、错误处理
 */

import { baseUrl } from "../config.js";
import { getToken } from "./token.js";

/**
 * 发起请求
 * @param {string} path - API 路径，如 /user/info
 * @param {RequestInit} [options] - fetch 选项
 * @returns {Promise<{ data?: unknown; error?: string }>} 成功返回 { data }，失败返回 { error }
 */
export async function request(path, options = {}) {
  const url = `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const headers = {
    ...options.headers,
    Token: getToken() ?? "",
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 502) {
      return { error: "服务未启动 (502)" };
    }

    if (res.status === 401) {
      return { error: "认证失败 (401)，请检查 token 是否有效" };
    }

    let json;
    try {
      json = await res.json();
    } catch {
      return { error: `响应解析失败 (${res.status})` };
    }

    if (json.code !== 0) {
      const msg = json.msg ?? "请求失败";
      return { error: msg };
    }

    return { data: json.data };
  } catch (err) {
    const msg = err?.message ?? String(err);
    return { error: `请求异常: ${msg}` };
  }
}
