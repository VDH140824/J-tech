import { useCallback, useSyncExternalStore } from "react";

const STORAGE_PREFIX = "jtech-campus-prayers:v1:";
const counts = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();
const unsaved = new Set<string>();

function parseCount(value: string | null) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

function readStoredCount(key: string): number | undefined {
  try { return parseCount(window.localStorage.getItem(key)); }
  catch { return undefined; }
}

function getCount(key: string | null) {
  if (!key) return 0;
  if (!counts.has(key)) counts.set(key, readStoredCount(key) ?? 0);
  return counts.get(key)!;
}

function latestCount(key: string) {
  return unsaved.has(key) ? getCount(key) : readStoredCount(key) ?? getCount(key);
}

function saveCount(key: string, count: number) {
  counts.set(key, count);
  try { window.localStorage.setItem(key, String(count)); unsaved.delete(key); }
  catch { unsaved.add(key); }
  listeners.get(key)?.forEach((notify) => notify());
}

export function earnsCampusPrayer(correct: number, total: number) {
  return Number.isSafeInteger(correct) && Number.isSafeInteger(total)
    && total > 0 && correct >= 0 && correct <= total && correct * 2 >= total;
}

// Local demo progress belongs to the signed-in account on this browser.
export function useCampusPrayer(accountId: number | undefined) {
  const key = accountId !== undefined && Number.isSafeInteger(accountId) && accountId > 0
    ? `${STORAGE_PREFIX}${accountId}` : null;
  const snapshot = useCallback(() => getCount(key), [key]);
  const subscribe = useCallback((notify: () => void) => {
    if (!key) return () => {};
    const subscribers = listeners.get(key) ?? new Set<() => void>();
    listeners.set(key, subscribers);
    subscribers.add(notify);
    const stored = readStoredCount(key);
    if (stored !== undefined && !unsaved.has(key)) counts.set(key, stored);
    const storageChanged = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || (event.key !== key && event.key !== null)) return;
      counts.set(key, parseCount(event.key === null ? null : event.newValue));
      unsaved.delete(key);
      subscribers.forEach((listener) => listener());
    };
    window.addEventListener("storage", storageChanged);
    return () => {
      subscribers.delete(notify);
      if (!subscribers.size) listeners.delete(key);
      window.removeEventListener("storage", storageChanged);
    };
  }, [key]);
  const prayerCount = useSyncExternalStore(subscribe, snapshot, () => 0);
  const awardPrayer = useCallback((correct: number, total: number) => {
    if (!key || !earnsCampusPrayer(correct, total)) return false;
    const current = latestCount(key);
    if (current >= Number.MAX_SAFE_INTEGER) return false;
    saveCount(key, current + 1);
    return true;
  }, [key]);
  const spendPrayer = useCallback(() => {
    if (!key) return false;
    const current = latestCount(key);
    if (current < 1) return false;
    saveCount(key, current - 1);
    return true;
  }, [key]);
  return { prayerCount, awardPrayer, spendPrayer };
}
