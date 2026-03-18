/**
 * 用户、用户组相关服务
 */

import { request } from "../request.js";

/** 读取用户信息，也可用于校验 token 是否有效 */
export async function getUserInfo() {
  return request("api/sys/user");
}

/** 获取用户组数据，返回 data 数组 */
export async function getUserGroups() {
  return request("api/app/userGroup/list");
}
