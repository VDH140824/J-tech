import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../services/api";
import { CAMPUS_MAP_ID, emptyCampusNetwork, isCampusPose, type CampusConnectionStatus, type CampusMessage, type CampusPeer, type CampusPose, type SeatReply } from "./campusMultiplayer";

function socketUrl() {
  const explicit = import.meta.env.VITE_CAMPUS_WS_URL;
  if (explicit) return explicit;
  const base = new URL(String(apiClient.defaults.baseURL ?? "/api"), window.location.href);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = `${base.pathname.replace(/\/$/, "")}/campus/ws`;
  base.search = ""; base.hash = "";
  return base.toString();
}
function requestId() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function numberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === "number" && Number.isFinite(item)));
}

export function useCampusMultiplayer(accountId: number | undefined) {
  const token = useAuthStore((state) => state.accessToken);
  const hasToken = !!token;
  const network = useRef(emptyCampusNetwork());
  const socket = useRef<WebSocket | null>(null);
  const latestPose = useRef<CampusPose | null>(null);
  const teleport = useRef(false);
  const [status, setStatus] = useState<CampusConnectionStatus>("connecting");
  const [roster, setRoster] = useState<number[]>([]);
  const [messages, setMessages] = useState<CampusMessage[]>([]);
  const [selfName, setSelfName] = useState("");
  const [notice, setNotice] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [retryVersion, setRetryVersion] = useState(0);
  const reconnect = useCallback(() => setRetryVersion((value) => value + 1), []);

  useEffect(() => {
    const net = network.current;
    let disposed = false;
    let retryTimer: number | undefined;
    let attempts = 0;
    let lastReceived = Date.now();
    let lastSent = "";
    let current: WebSocket | null = null;
    latestPose.current = null;
    net.selfId = accountId ?? null;
    net.connected = false; net.peers.clear(); net.seats = {}; net.doors = {}; net.ownSeatId = null; net.spawn = null; net.seatReply = null; net.pendingDoors.clear();
    setRoster([]); setMessages([]); setSelfName(""); setNotice("");
    const updateRoster = () => setRoster([...net.peers.keys()]);
    const rawSend = (packet: unknown) => {
      if (!current || current.readyState !== WebSocket.OPEN || current.bufferedAmount > 128 * 1024) return false;
      try { current.send(JSON.stringify(packet)); return true; } catch { return false; }
    };
    const send = (packet: unknown) => net.connected && rawSend(packet);
    net.publish = (pose) => {
      const previous = latestPose.current;
      if (previous && Math.hypot(pose.x - previous.x, pose.y - previous.y, pose.z - previous.z) > 8) teleport.current = true;
      latestPose.current = pose;
    };
    net.door = (id, angle) => {
      if (net.pendingDoors.has(id) || !send({ type: "door", id, angle })) return false;
      net.pendingDoors.set(id, Date.now()); return true;
    };
    net.reserveSeat = (seatId) => {
      const id = requestId();
      net.seatReply = null;
      const state = latestPose.current ? { ...latestPose.current, seatId: null, gesture: null } : undefined;
      return send({ type: "seat", seatId, requestId: id, state }) ? id : null;
    };
    net.releaseSeat = () => {
      net.ownSeatId = null; net.seatReply = null;
      send({ type: "seat", seatId: null, requestId: requestId() });
    };
    function applySeats(value: unknown) {
      net.seats = numberRecord(value);
      net.ownSeatId = Object.entries(net.seats).find(([, owner]) => owner === net.selfId)?.[0] ?? null;
    }
    function applyPlayer(value: unknown) {
      const peer = value as CampusPeer;
      if (!peer || !Number.isSafeInteger(peer.id) || typeof peer.name !== "string" || !isCampusPose(peer.state)) return;
      if (peer.id === net.selfId) { setSelfName((previous) => previous === peer.name ? previous : peer.name); return; }
      const previous = net.peers.get(peer.id);
      net.peers.set(peer.id, { ...peer, receivedAt: performance.now() });
      if (!previous || previous.name !== peer.name) updateRoster();
    }
    function retry() {
      if (disposed) return;
      setStatus("reconnecting");
      retryTimer = window.setTimeout(connect, Math.min(15000, 1000 * 2 ** Math.min(attempts++, 4)) + Math.random() * 250);
    }
    function connect() {
      if (disposed) return;
      const accessToken = useAuthStore.getState().accessToken;
      if (!accountId || !accessToken) { setStatus("unauthorized"); return; }
      setStatus(attempts ? "reconnecting" : "connecting");
      try { current = new WebSocket(socketUrl()); } catch { setNotice("Không thể kết nối phòng chung. Kiểm tra địa chỉ server."); retry(); return; }
      socket.current = current;
      const connection = current;
      connection.onopen = () => { if (!disposed) rawSend({ type: "auth", token: useAuthStore.getState().accessToken, mapId: CAMPUS_MAP_ID }); };
      connection.onmessage = (event) => {
        if (disposed || current !== connection) return;
        lastReceived = Date.now();
        try {
          const packet = JSON.parse(String(event.data));
          switch (packet.type) {
            case "welcome":
              if (packet.mapId !== CAMPUS_MAP_ID || packet.selfId !== accountId) { connection.close(4410, "map_mismatch"); setStatus("map-mismatch"); return; }
              net.connected = true; net.selfId = packet.selfId; net.peers.clear(); net.doors = numberRecord(packet.doors); applySeats(packet.seats);
              const ownPlayer = Array.isArray(packet.players) ? packet.players.find((player: CampusPeer) => player.id === net.selfId) : null;
              if (ownPlayer && isCampusPose(ownPlayer.state)) net.spawn = { x: ownPlayer.state.x, y: ownPlayer.state.y, z: ownPlayer.state.z };
              if (Array.isArray(packet.players)) packet.players.forEach(applyPlayer);
              updateRoster(); setSelfName(String(packet.name)); setCapacity(Number(packet.capacity) || 30);
              setMessages(Array.isArray(packet.messages) ? packet.messages.slice(-100) : []);
              setStatus("online"); setNotice(""); attempts = 0; lastSent = ""; teleport.current = true;
              break;
            case "joined": applyPlayer(packet.player); break;
            case "left": net.peers.delete(packet.id); updateRoster(); break;
            case "snapshot": if (Array.isArray(packet.players)) packet.players.forEach(applyPlayer); break;
            case "doors": net.doors = numberRecord(packet.doors); net.pendingDoors.clear(); break;
            case "seats": applySeats(packet.seats); break;
            case "seatResult":
              net.seatReply = packet as SeatReply;
              if (packet.granted) net.ownSeatId = packet.seatId;
              break;
            case "chat": {
              const message = packet.message as CampusMessage;
              if (message && Number.isSafeInteger(message.id) && typeof message.text === "string" && typeof message.name === "string") {
                setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message].slice(-100));
              }
              break;
            }
            case "error":
              setNotice(String(packet.message ?? "Không thực hiện được thao tác."));
              if (String(packet.code).startsWith("DOOR")) net.pendingDoors.clear();
              break;
          }
        } catch { setNotice("Server gửi dữ liệu không hợp lệ. Đang kết nối lại…"); connection.close(1002, "invalid_message"); }
      };
      connection.onclose = (event) => {
        if (disposed || current !== connection) return;
        net.connected = false; net.peers.clear(); net.seats = {}; net.ownSeatId = null; net.seatReply = null; net.pendingDoors.clear(); updateRoster();
        if (event.code === 4409) { setStatus("replaced"); setNotice("Tài khoản đã mở map ở tab hoặc máy khác."); }
        else if (event.code === 4429) { setStatus("full"); setNotice("Map đã đủ người. Bạn có thể thử vào lại sau."); }
        else if (event.code === 4410) { setStatus("map-mismatch"); setNotice("Phiên bản map đã thay đổi. Hãy tải lại trang."); }
        else if (event.code === 4403) { setStatus("unauthorized"); setNotice("Tài khoản hiện không được phép vào phòng chung."); }
        else if (event.code === 4401) {
          setStatus("reconnecting");
          void apiClient.get("/users/me").then(() => { if (!disposed) retry(); }).catch(() => { if (!disposed) { setStatus("unauthorized"); setNotice("Phiên đăng nhập hết hạn. Hãy đăng nhập lại."); } });
        } else retry();
      };
      connection.onerror = () => { if (!disposed) setNotice("Mất kết nối với phòng chung. Đang thử kết nối lại…"); };
    }
    if (accountId && hasToken) connect(); else setStatus("offline");
    const stateTimer = window.setInterval(() => {
      if (!net.connected || !latestPose.current) return;
      const pose = latestPose.current;
      const rounded = { ...pose, x: +pose.x.toFixed(3), y: +pose.y.toFixed(3), z: +pose.z.toFixed(3), yaw: +pose.yaw.toFixed(3), speed: +pose.speed.toFixed(2) };
      const signature = JSON.stringify(rounded);
      if (signature !== lastSent || teleport.current) {
        if (send({ type: "state", state: { ...rounded, teleport: teleport.current } })) { lastSent = signature; teleport.current = false; }
      }
      for (const [id, time] of net.pendingDoors) if (Date.now() - time > 3000) net.pendingDoors.delete(id);
    }, 100);
    const heartbeat = window.setInterval(() => {
      if (!net.connected) return;
      if (Date.now() - lastReceived > 30000) current?.close(4000, "heartbeat_timeout");
      else send({ type: "heartbeat" });
    }, 10000);
    return () => {
      disposed = true; window.clearTimeout(retryTimer); window.clearInterval(stateTimer); window.clearInterval(heartbeat);
      net.connected = false; net.peers.clear(); net.pendingDoors.clear(); net.ownSeatId = null;
      if (socket.current === current) socket.current = null;
      current?.close(1000, "left_map");
    };
  }, [accountId, hasToken, retryVersion]);

  useEffect(() => {
    if (token && network.current.connected && socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: "reauth", token }));
  }, [token]);

  const sendChat = useCallback((text: string) => {
    const connection = socket.current;
    if (!network.current.connected || !connection || connection.readyState !== WebSocket.OPEN || connection.bufferedAmount > 128 * 1024) return false;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 300) return false;
    try { connection.send(JSON.stringify({ type: "chat", text: trimmed, clientId: requestId() })); return true; } catch { return false; }
  }, []);
  return { network, status, roster, messages, selfName, notice, capacity, reconnect, sendChat };
}
