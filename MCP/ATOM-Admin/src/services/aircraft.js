/**
 * 飞机型号、固件版本相关服务
 */

import { request } from "../request.js";

/** 获取飞机型号，返回 data 数组，每项增加 label（description + hdVersion）、value（id） */
export async function getAircraftModels() {
  const result = await request("api/device/list?type=1");

  if (result.error) return result;

  const list = Array.isArray(result.data) ? result.data : [];
  const data = list.map((item) => {
    const label = `${item.description ?? ""} ${item.hdVersion ?? ""}`.trim();
    return {
      ...item,
      label,
      value: item.id ?? "",
    };
  });

  return { data };
}

/**
 * 获取飞行器固件版本
 * 接口按 list 返回，无分页参数
 * @param {string} deviceId - 机型号 ID，来自 get_aircraft_models 返回的 value
 */
export async function getAircraftFirmwareVersion(deviceId) {
  const result = await request("api/device/firmware/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "1", deviceId }),
  });

  if (result.error) return result;

  // 接口返回 { list: [] }，取 list 作为数据源
  let list = result.data?.list ?? result.data;
  list = Array.isArray(list) ? list : [];

  const data = list.map((item) => ({
    ...item,
    label: item.version ?? "",
    value: item.id ?? "",
  }));

  return { data };
}
