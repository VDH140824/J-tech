import { create } from "zustand";
import type { StoreItem } from "../api/storeApi";
export const useEquipmentStore = create<{
  items: StoreItem[];
  setItems: (items: StoreItem[]) => void;
}>((set) => ({ items: [], setItems: (items) => set({ items }) }));
