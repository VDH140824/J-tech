import { useCallback, useSyncExternalStore } from "react";

const STORAGE_PREFIX = "jtech-campus-prayers:v1:";
const counts = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

interface PrayerState {
  count: number;
  rewardedSessions: string[];
}

function parseState(value: string | null): PrayerState {
  try {
    const stored = value === null ? 0 : JSON.parse(value);
    // The demo stored a bare number at this key.
    if (Number.isSafeInteger(stored) && stored >= 0) {
      return { count: stored, rewardedSessions: [] };
    }
    if (Number.isSafeInteger(stored?.count) && stored.count >= 0 && Array.isArray(stored.rewardedSessions)) {
      return {
        count: stored.count,
        rewardedSessions: stored.rewardedSessions.filter((session: unknown) => typeof session === "string"),
      };
    }
  } catch {
    // Ignore unreadable progress.
  }
  return { count: 0, rewardedSessions: [] };
}

function readState(key: string): PrayerState | undefined {
  try { return parseState(window.localStorage.getItem(key)); }
  catch { return undefined; }
}

function getCount(key: string | null) {
  if (!key) return 0;
  if (!counts.has(key)) counts.set(key, readState(key)?.count ?? 0);
  return counts.get(key)!;
}

function saveState(key: string, state: PrayerState) {
  try { window.localStorage.setItem(key, JSON.stringify(state)); }
  catch { return false; }
  counts.set(key, state.count);
  listeners.get(key)?.forEach((notify) => notify());
  return true;
}

// Fortune turns belong to the signed-in account on this browser.
export function useCampusPrayer(accountId: number | undefined) {
  const key = accountId !== undefined && Number.isSafeInteger(accountId) && accountId > 0
    ? `${STORAGE_PREFIX}${accountId}` : null;
  const snapshot = useCallback(() => getCount(key), [key]);
  const subscribe = useCallback((notify: () => void) => {
    if (!key) return () => {};
    const subscribers = listeners.get(key) ?? new Set<() => void>();
    listeners.set(key, subscribers);
    subscribers.add(notify);
    const stored = readState(key);
    if (stored) counts.set(key, stored.count);
    const storageChanged = (event: StorageEvent) => {
      if ((event.key !== key && event.key !== null) || event.storageArea !== window.localStorage) return;
      counts.set(key, parseState(event.key === null ? null : event.newValue).count);
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
  const awardPrayerOnce = useCallback((sessionId: string) => {
    if (!key) return false;
    const state = readState(key);
    if (!state) return false;
    if (state.rewardedSessions.includes(sessionId)) return true;
    if (state.count >= Number.MAX_SAFE_INTEGER) return false;
    return saveState(key, {
      count: state.count + 1,
      rewardedSessions: [...state.rewardedSessions, sessionId],
    });
  }, [key]);
  const spendPrayer = useCallback(() => {
    if (!key) return false;
    const state = readState(key);
    if (!state || state.count < 1) return false;
    return saveState(key, { ...state, count: state.count - 1 });
  }, [key]);
  return { prayerCount, awardPrayerOnce, spendPrayer };
}
