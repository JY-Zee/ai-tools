/**
 * ATOM-Admin MCP 配置项
 * baseUrl 可通过环境变量 ATOM_ADMIN_BASE_URL 覆盖
 */

export const baseUrl =
  process.env.ATOM_ADMIN_BASE_URL ?? "http://192.168.1.114:8088";

/** 环境与 OSS 映射（dev/test/prod 对应不同 region、bucket，预留扩展） */
const ENV_OSS_MAP = {
  dev: { region: "oss-cn-shenzhen", bucket: "potensic-atom-test" },
  test: { region: "oss-cn-shenzhen", bucket: "potensic-atom-test" },
  prod: { region: "oss-cn-shenzhen", bucket: "potensic-atom-prod" },
};

/** 当前环境缓存，默认 dev */
let envCache = "dev";

/**
 * 设置环境并全局缓存
 * @param {string} env - 环境：'dev' | 'test' | 'prod'
 */
export function setEnv(env) {
  const normalized = String(env).toLowerCase();
  if (ENV_OSS_MAP[normalized]) {
    envCache = normalized;
  }
}

/**
 * 获取当前环境
 * @returns {string} 'dev' | 'test' | 'prod'
 */
export function getEnv() {
  return envCache;
}

/**
 * 根据当前环境获取 OSS region
 * @returns {string}
 */
export function getAliossRegion() {
  return ENV_OSS_MAP[envCache]?.region ?? "oss-cn-shenzhen";
}

/**
 * 根据当前环境获取 OSS bucket
 * @returns {string}
 */
export function getAliossBucket() {
  return ENV_OSS_MAP[envCache]?.bucket ?? "potensic-atom-test";
}
