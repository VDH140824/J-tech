import { useEffect } from "react";
import { getInventory } from "../../api/inventoryApi";
import { useAuthStore } from "../../store/authStore";
import { useEquipmentStore } from "../../store/equipmentStore";
export function RewardEquipment() {
  const user = useAuthStore((s) => s.user);
  const items = useEquipmentStore((s) => s.items);
  useEffect(() => {
    let active = true;
    const load = () => {
      if (user?.role?.replace("ROLE_", "") !== "STUDENT" && user?.roleId !== 1) return;
      void getInventory()
        .then((data) => {
          if (active) useEquipmentStore.getState().setItems(data);
        })
        .catch(() => {});
    };
    useEquipmentStore.getState().setItems([]);
    load();
    window.addEventListener("equipment-changed", load);
    return () => {
      active = false;
      window.removeEventListener("equipment-changed", load);
    };
  }, [user?.id]);
  useEffect(() => {
    const item = items.find((i) => i.item_type === "THEME" && i.is_equipped);
    if (!item?.theme_config) return;
    let config: Record<string, string>;
    try {
      config =
        typeof item.theme_config === "string" ? JSON.parse(item.theme_config) : item.theme_config;
    } catch {
      return;
    }
    const allowed = [
      "--primary",
      "--primary-hover",
      "--primary-light",
      "--primary-border",
      "--bg-main",
      "--bg-surface",
    ];
    const previous = new Map<string, string>();
    for (const [key, value] of Object.entries(config))
      if (allowed.includes(key) && typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)) {
        previous.set(key, document.documentElement.style.getPropertyValue(key));
        document.documentElement.style.setProperty(key, value);
      }
    return () =>
      previous.forEach((value, key) => {
        if (value) document.documentElement.style.setProperty(key, value);
        else document.documentElement.style.removeProperty(key);
      });
  }, [items]);
  return null;
}
