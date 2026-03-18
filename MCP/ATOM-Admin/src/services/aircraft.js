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
 * @param {string} deviceId - 机型号 ID，来自 get_aircraft_models 返回的 value
 */
export async function getAircraftFirmwareVersion(deviceId) {
  const result = await request("api/device/firmware/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "1", deviceId }),
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
