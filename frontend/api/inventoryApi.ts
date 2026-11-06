import { apiClient } from "../services/api";
import type { StoreItem } from "./storeApi";
export const getInventory = async () => (await apiClient.get<StoreItem[]>("/inventory")).data;
export const setEquipment = async (id: number, equipped: boolean) =>
  (await apiClient.put<StoreItem[]>(`/inventory/${id}/equipment`, { equipped })).data;
