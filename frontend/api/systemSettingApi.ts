import { apiClient } from "../services/api";
import type { SystemSettings, SystemSettingResponse, SystemAnnouncementData } from "../types/systemSetting";

export async function getSystemSettings(signal?: AbortSignal): Promise<SystemSettingResponse> {
  const { data } = await apiClient.get<SystemSettingResponse>("/admin/settings", { signal });
  return data;
}

export async function updateSystemSettings(settings: SystemSettings): Promise<SystemSettingResponse> {
  const { data } = await apiClient.put<SystemSettingResponse>("/admin/settings", settings);
  return data;
}

export async function getSystemAnnouncement(signal?: AbortSignal): Promise<SystemAnnouncementData> {
  const { data } = await apiClient.get<SystemAnnouncementData>("/system/announcement", { signal });
  return data;
}
