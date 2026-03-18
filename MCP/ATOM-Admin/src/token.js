/**
 * Token 缓存（内存 + 本地文件）
 * token 由外部通过 set_token 工具设置，同时写入本地
 * 启动时从本地加载并校验，无效则清除
 */

import fs from "fs";
import path from "path";
import os from "os";

let cachedToken = null;

/** 本地 token 文件路径：~/.atom-admin-mcp/token.json */
const getTokenFilePath = () =>
  path.join(os.homedir(), ".atom-admin-mcp", "token.json");

/**
 * 写入 token 到本地文件
 * @param {string} token - 要持久化的 token
 */
function saveToLocal(token) {
  const filePath = getTokenFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify({ token }), "utf8");
}

/**
 * 从本地文件读取 token 到内存
 * @returns {boolean} 是否成功加载到 token
 */
export function loadFromLocal() {
  const filePath = getTokenFilePath();
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const token = parsed?.token;
    if (typeof token === "string" && token) {
      cachedToken = token;
      return true;
    }
  } catch {
    // 文件损坏或格式错误，忽略
  }
  return false;
}

/**
 * 清除内存和本地 token
 */
export function clearToken() {
  cachedToken = null;
  const filePath = getTokenFilePath();
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // 删除失败时仅清内存
    }
  }
}

/** 设置 token（内存 + 本地） */
export function setToken(token) {
  cachedToken = token ?? null;
  if (cachedToken) {
    saveToLocal(cachedToken);
  } else {
    clearToken();
  }
}

/** 获取 token */
export function getToken() {
  return cachedToken;
}

/** 是否已设置 token */
export function hasToken() {
  return !!cachedToken;
}
