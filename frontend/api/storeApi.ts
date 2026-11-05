import { apiClient } from "../services/api";
export interface StoreItem {
  id: number;
  name: string;
  description: string | null;
  item_type: string;
  image_url: string;
  coin_price: number;
  status: string;
  owned?: boolean | number;
  balance?: number | null;
  is_equipped?: boolean | number;
  theme_config?: string | Record<string, string> | null;
}
export const getStoreCatalog = async () =>
  (await apiClient.get<{ items: StoreItem[]; balance: number | null }>("/store")).data;
export const getStoreItem = async (id: number) =>
  (await apiClient.get<StoreItem>(`/store/${id}`)).data;
export const redeemItem = async (id: number, expectedPrice: number, requestId: string) =>
  (
    await apiClient.post<{ reference: number; amount: number; balance: number }>(
      `/store/${id}/redeem`,
      { expectedPrice, requestId },
    )
  ).data;
