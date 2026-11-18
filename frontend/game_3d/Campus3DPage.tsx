import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Html, useGLTF, useProgress } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody, TrimeshCollider } from "@react-three/rapier";
import { ACESFilmicToneMapping } from "three";
import { useAuthStore } from "../store/authStore";
import { CampusPlayer, type CampusInput } from "./CampusPlayer";
import { CampusDoors, type DoorInteraction, type DoorPrompt } from "./CampusDoors";
import { CampusEnvironment } from "./CampusEnvironment";
import type { CampusTime } from "./campusLighting";
import { CampusSeatInteraction } from "./CampusSeatInteraction";
import { CampusComputer } from "./CampusComputer";
import { CampusGoose } from "./CampusGoose";
import { CampusFortuneTable, EMPTY_FORTUNE_STATUS, type FortuneInteraction, type FortuneStatus } from "./CampusFortuneTable";
import { CampusToadInteraction, EMPTY_TOAD_STATUS, getCampusToadSite, type ToadInteraction, type ToadStatus } from "./CampusToadInteraction";
import { useCampusPrayer } from "./campusPrayer";
import { useCampusMultiplayer } from "./useCampusMultiplayer";
import { CampusRemotePlayers } from "./CampusRemotePlayers";
import { CampusChat } from "./CampusChat";
import type { CampusNetwork } from "./campusMultiplayer";
import type { CampusSeat, SeatingControl } from "./campusSeating";
import { prepareCampusWorld } from "./campusWorld";
import campusUrl from "./models/map_fptu.glb?url";
import "./Campus3DPage.css";

function MapNotice({ error = false }: { error?: boolean }) {
  return (
    <div className="campus-3d-notice" role={error ? "alert" : "status"}>
      <strong>{error ? "Không thể mở bản đồ 3D" : "Trình duyệt chưa hỗ trợ hiển thị 3D"}</strong>
      <p>{error
        ? "Hãy kiểm tra kết nối mạng và thử tải lại trang."
        : "Hãy bật tăng tốc đồ họa hoặc thử trình duyệt khác."}</p>
      <button type="button" onClick={() => window.location.reload()}>Tải lại trang</button>
    </div>
  );
}

class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <MapNotice error /> : this.props.children;
  }
}

function LoadingMap() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="campus-3d-loading" role="status" aria-live="polite">
        <span className="campus-3d-spinner" aria-hidden="true" />
        <strong>Đang tải bản đồ… {Math.round(progress)}%</strong>
        <span>Lần tải đầu có thể mất một chút thời gian.</span>
      </div>
    </Html>
  );
}

function CampusScene({ name, resetVersion, input, onControlFocus, doorInteraction, onDoorPrompt, time, seating, activeSeat, onNearbySeat, onSeatedChange, awardPrayerOnce, fortuneInteraction, spendPrayer, onFortuneStatus, toadInteraction, onToadStatus, network, roster }: {
  name: string;
  resetVersion: number;
  input: MutableRefObject<CampusInput>;
  onControlFocus: (active: boolean) => void;
  doorInteraction: MutableRefObject<DoorInteraction>;
  onDoorPrompt: (prompt: DoorPrompt | null) => void;
  time: CampusTime;
  seating: MutableRefObject<SeatingControl>;
  activeSeat: CampusSeat | null;
  onNearbySeat: (seat: CampusSeat | null) => void;
  onSeatedChange: (seat: CampusSeat | null, message?: string) => void;
  awardPrayerOnce: (sessionId: string) => boolean;
  fortuneInteraction: MutableRefObject<FortuneInteraction>;
  spendPrayer: () => boolean;
  onFortuneStatus: (status: FortuneStatus) => void;
  toadInteraction: MutableRefObject<ToadInteraction>;
  onToadStatus: (status: ToadStatus) => void;
  network: MutableRefObject<CampusNetwork>;
  roster: number[];
}) {
  const { scene } = useGLTF(campusUrl);
  const campus = useMemo(() => prepareCampusWorld(scene), [scene]);
  const toadSite = useMemo(() => getCampusToadSite(campus), [campus]);
  const { min, max } = campus.bounds;
  const halfWidth = (max.x - min.x) / 2;
  const halfDepth = (max.z - min.z) / 2;
  const middleX = (min.x + max.x) / 2;
  const middleZ = (min.z + max.z) / 2;

  return (
    <Physics timeStep={1 / 60} interpolate={false} updatePriority={-50}>
      <primitive object={campus.object} dispose={null} />
      <RigidBody type="fixed" colliders={false}>
        <TrimeshCollider args={[campus.vertices, campus.indices]} />
        <CuboidCollider args={[0.5, 30, halfDepth + 1]} position={[min.x - 0.5, 10, middleZ]} />
        <CuboidCollider args={[0.5, 30, halfDepth + 1]} position={[max.x + 0.5, 10, middleZ]} />
        <CuboidCollider args={[halfWidth + 1, 30, 0.5]} position={[middleX, 10, min.z - 0.5]} />
        <CuboidCollider args={[halfWidth + 1, 30, 0.5]} position={[middleX, 10, max.z + 0.5]} />
      </RigidBody>
      <CampusPlayer campus={campus} name={name} resetVersion={resetVersion} input={input} onControlFocus={onControlFocus} doorInteraction={doorInteraction} seating={seating} onSeatedChange={onSeatedChange} toadSite={toadSite} toadInteraction={toadInteraction} network={network} />
      <CampusRemotePlayers roster={roster} network={network} />
      <CampusDoors doors={campus.doors} interaction={doorInteraction} onPrompt={onDoorPrompt} network={network} />
      <CampusSeatInteraction seats={campus.seats} player={doorInteraction} control={seating} onNearby={onNearbySeat} network={network} />
      <CampusEnvironment time={time} campus={campus} player={doorInteraction} />
      <CampusGoose campus={campus} player={doorInteraction} />
      <CampusFortuneTable campus={campus} player={doorInteraction} seating={seating} interaction={fortuneInteraction} spendPrayer={spendPrayer} onStatus={onFortuneStatus} />
      <CampusToadInteraction site={toadSite} player={doorInteraction} seating={seating} interaction={toadInteraction} onStatus={onToadStatus} />
      {activeSeat && <CampusComputer key={activeSeat.id} seat={activeSeat} control={seating} awardPrayerOnce={awardPrayerOnce} />}
    </Physics>
  );
}

export default function Campus3DPage() {
  const user = useAuthStore((state) => state.user);
  const multiplayer = useCampusMultiplayer(user?.id);
  const { prayerCount, awardPrayerOnce, spendPrayer } = useCampusPrayer(user?.id);
  // Match the account name displayed in the main navigation, never a game alias.
  const playerName = multiplayer.selfName || user?.fullName?.trim() || user?.displayName?.trim() || user?.email || "Học viên";
  const [resetVersion, setResetVersion] = useState(0);
  const [controlFocused, setControlFocused] = useState(false);
  const [time, setTime] = useState<CampusTime>("day");
  const input = useRef<CampusInput>({ buttons: new Set() });
  const doorInteraction = useRef<DoorInteraction>({ body: null, collider: null, request: 0 });
  const [doorPrompt, setDoorPrompt] = useState<DoorPrompt | null>(null);
  const seating = useRef<SeatingControl>({ nearby: null, active: null, sitRequest: 0, exitRequest: 0, screenExpanded: false, expandRequest: 0 });
  const [nearbySeat, setNearbySeat] = useState<CampusSeat | null>(null);
  const [activeSeat, setActiveSeat] = useState<CampusSeat | null>(null);
  const [seatMessage, setSeatMessage] = useState("");
  const seatedChange = useCallback((seat: CampusSeat | null, message = "") => {
    setActiveSeat(seat);
    setSeatMessage(message);
  }, []);
  const viewport = useRef<HTMLDivElement>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatTyping = useCallback((blocked: boolean) => {
    input.current.blocked = blocked;
    if (blocked) input.current.buttons.clear();
  }, []);
  const onlineCount = multiplayer.status === "online" ? multiplayer.roster.length + 1 : 0;
  const connectionText = {
    online: `${onlineCount}/${multiplayer.capacity} người đang trong map`, connecting: "Đang vào phòng chung…", reconnecting: "Đang kết nối lại phòng chung…",
    offline: "Chưa kết nối phòng chung", full: "Map đã đủ người", replaced: "Tài khoản đang ở tab/máy khác",
    unauthorized: "Cần đăng nhập lại để vào phòng chung", "map-mismatch": "Hãy tải lại phiên bản map mới",
  }[multiplayer.status];
  const fortuneInteraction = useRef<FortuneInteraction>({ request: 0 });
  const [fortuneStatus, setFortuneStatus] = useState<FortuneStatus>(EMPTY_FORTUNE_STATUS);
  const [dismissedFortuneDrawId, setDismissedFortuneDrawId] = useState(0);
  const toadInteraction = useRef<ToadInteraction>({ request: 0, cancel: 0, action: "touch", activeAction: null, phase: "idle", message: "" });
  const [toadStatus, setToadStatus] = useState<ToadStatus>(EMPTY_TOAD_STATUS);
  const toadBusy = toadStatus.phase !== "idle";
  const showToadPanel = !activeSeat && (toadStatus.nearby || toadBusy);
  const fortuneBusy = fortuneStatus.phase === "shaking" || fortuneStatus.phase === "falling";
  const showFortuneResult = !!fortuneStatus.fortune && fortuneStatus.drawId !== dismissedFortuneDrawId;
  const showFortunePanel = !showToadPanel && !activeSeat && (fortuneStatus.nearby || fortuneBusy || (showFortuneResult && !doorPrompt && !nearbySeat));

  const focusMap = useCallback(() => {
    viewport.current?.querySelector("canvas")?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!mapExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyDown = (event: KeyboardEvent) => {
      // The computer has its own overlay and Escape handler above the map.
      if (event.defaultPrevented || input.current.blocked || seating.current.screenExpanded || document.fullscreenElement) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (toadInteraction.current.phase !== "idle") toadInteraction.current.cancel++;
        else setMapExpanded(false);
        focusMap();
      } else if (event.key === "Tab") {
        const controls = [...(viewport.current?.querySelectorAll<HTMLElement>(
          'canvas[tabindex], button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
        ) ?? [])].filter((element) => element.getClientRects().length > 0);
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        const outsideMap = !viewport.current?.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || outsideMap)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || outsideMap)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyDown);
    };
  }, [mapExpanded, focusMap]);

  const releaseButton = (code: string) => { input.current.buttons.delete(code); };

  return (
    <section className="campus-3d-page" aria-labelledby="campus-3d-title">
      <Link className="campus-3d-back" to="/games">← Danh sách trò chơi</Link>
      <header className="campus-3d-header">
        <div>
          <h1 id="campus-3d-title">FPTU Campus 3D</h1>
          <p>Nhập vai vào khuôn viên cùng nhân vật của bạn.</p>
        </div>
        <div className="campus-3d-toolbar">
          <div className="campus-prayer-count" role="status" aria-live="polite">
            <span>Lượt khấn Cóc Tiến Sĩ</span><strong>{prayerCount}</strong>
          </div>
          <div className="campus-time-selector" role="group" aria-label="Chọn thời gian trong map">
            <button type="button" aria-pressed={time === "day"} onClick={() => setTime("day")}>
              <span aria-hidden="true">☀</span> Ban ngày
            </button>
            <button type="button" aria-pressed={time === "night"} onClick={() => setTime("night")}>
              <span aria-hidden="true">☾</span> Ban đêm
            </button>
          </div>
          <button className="campus-3d-reset" type="button" onClick={() => setResetVersion((value) => value + 1)}>
            Về điểm xuất phát
          </button>
        </div>
      </header>
      <div className="campus-3d-stage">
        <div ref={viewport} id="campus-map-viewport" className={`campus-3d-viewport campus-has-chat${mapExpanded ? " campus-3d-viewport-expanded" : ""}${chatOpen ? " campus-chat-open" : ""}`}
          role={mapExpanded ? "dialog" : "region"} aria-modal={mapExpanded || undefined} aria-label="Bản đồ khuôn viên FPTU 3D">
          <MapErrorBoundary>
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [0, 5, 10], fov: 55, near: 0.05, far: 500 }}
              gl={{
                antialias: true,
                powerPreference: "high-performance",
                toneMapping: ACESFilmicToneMapping,
                toneMappingExposure: 1.05,
              }}
              fallback={<MapNotice />}
            >
              <Suspense fallback={<LoadingMap />}>
                <CampusScene key={user?.id} name={playerName} resetVersion={resetVersion} input={input} onControlFocus={setControlFocused} doorInteraction={doorInteraction} onDoorPrompt={setDoorPrompt} time={time} seating={seating} activeSeat={activeSeat} onNearbySeat={setNearbySeat} onSeatedChange={seatedChange} awardPrayerOnce={awardPrayerOnce} fortuneInteraction={fortuneInteraction} spendPrayer={spendPrayer} onFortuneStatus={setFortuneStatus} toadInteraction={toadInteraction} onToadStatus={setToadStatus} network={multiplayer.network} roster={multiplayer.roster} />
              </Suspense>
            </Canvas>
          </MapErrorBoundary>
          <button className="campus-map-fullscreen" type="button" aria-expanded={mapExpanded} aria-controls="campus-map-viewport"
            title={mapExpanded ? "Thu nhỏ bản đồ (Esc)" : "Mở rộng bản đồ toàn màn hình"}
            onClick={() => { setMapExpanded((expanded) => !expanded); focusMap(); }}>
            <span aria-hidden="true">⛶</span> {mapExpanded ? "Thu nhỏ (Esc)" : "Toàn màn hình"}
          </button>
          <CampusChat status={multiplayer.status} messages={multiplayer.messages} selfId={user?.id} count={onlineCount} capacity={multiplayer.capacity}
            notice={multiplayer.notice} onSend={multiplayer.sendChat} onReconnect={multiplayer.reconnect} onOpenChange={setChatOpen}
            onTyping={chatTyping} onClose={focusMap} />
          {showToadPanel && <div className="campus-toad-prompt" role="group" aria-label="Tương tác với Cóc Tiến Sĩ">
            <strong>Cóc Tiến Sĩ</strong>
            <span>Tương tác miễn phí</span>
            <button type="button" disabled={toadBusy} onClick={() => {
              toadInteraction.current.action = "touch";
              toadInteraction.current.request++;
              focusMap();
            }}>Chạm Cóc Tiến Sĩ</button>
            <button type="button" disabled={toadBusy} onClick={() => {
              toadInteraction.current.action = "pray";
              toadInteraction.current.request++;
              focusMap();
            }}>Chắp tay vái</button>
            {toadBusy && <>
              <small role="status">{toadStatus.phase === "approaching" ? "Đang bước tới điểm chạm…" : toadStatus.action === "pray" ? "Đang chắp tay vái Cóc Tiến Sĩ…" : "Đang chạm Cóc Tiến Sĩ…"}</small>
              <button className="campus-toad-cancel" type="button" onClick={() => { toadInteraction.current.cancel++; focusMap(); }}>Dừng tương tác</button>
            </>}
            {!toadBusy && toadStatus.message && <small role="status">{toadStatus.message}</small>}
          </div>}
          {showFortunePanel && <aside className="campus-fortune-panel" aria-label="Rút thăm Cóc Tiến Sĩ">
            <header>
              <strong>Trùm trường · Rút thăm</strong>
              {showFortuneResult && <button className="campus-fortune-close" type="button" aria-label="Đóng nội dung quẻ" onClick={() => { setDismissedFortuneDrawId(fortuneStatus.drawId); focusMap(); }}>×</button>}
            </header>
            <span className="campus-fortune-balance">Bạn có {prayerCount} lượt khấn · Mỗi lần rút dùng 1 lượt</span>
            {fortuneBusy && <div className="campus-fortune-progress" role="status">
              <span>{fortuneStatus.phase === "shaking" ? "Cốc đang rung… (khoảng 4 giây)" : "Quẻ đang rơi xuống bàn…"}</span>
              <span className="campus-fortune-progress-track" aria-hidden="true"><i /></span>
            </div>}
            {showFortuneResult && fortuneStatus.fortune && <div className="campus-fortune-result" role="status">
              <span>QUẺ SỐ {String(fortuneStatus.fortune.id).padStart(2, "0")} / 50</span>
              <h2>{fortuneStatus.fortune.title}</h2>
              <p>{fortuneStatus.fortune.content}</p>
            </div>}
            {fortuneStatus.message && <p className="campus-fortune-message" role="status">{fortuneStatus.message}</p>}
            {fortuneStatus.nearby && <>
              <button className="campus-fortune-draw" type="button" disabled={fortuneBusy || prayerCount < 1} onClick={() => { fortuneInteraction.current.request++; focusMap(); }}>
                {fortuneBusy ? "Đang rút thăm…" : "Rút thăm · 1 lượt khấn"}
              </button>
              {!fortuneBusy && prayerCount < 1 && <small>Làm bài kiểm tra đúng từ 50% số câu để nhận lượt khấn.</small>}
            </>}
          </aside>}
          {doorPrompt && !activeSeat && !nearbySeat && !showFortunePanel && !showToadPanel && (
            <div className="campus-door-prompt" role="group" aria-label="Tương tác cửa">
              <span>{doorPrompt.label}</span>
              <button
                type="button"
                disabled={doorPrompt.disabled}
                onClick={() => {
                  doorInteraction.current.request++;
                  viewport.current?.querySelector("canvas")?.focus({ preventScroll: true });
                }}
              >
                {doorPrompt.action}<kbd>E</kbd>
              </button>
              {doorPrompt.blocked && <small role="status">Hãy bước ra khỏi lối xoay của cửa.</small>}
            </div>
          )}
          {!activeSeat && nearbySeat && !showFortunePanel && !showToadPanel && (
            <div className="campus-seat-prompt" role="group" aria-label="Chỗ ngồi trống">
              <span>{nearbySeat.label} · Bàn máy tính trống</span>
              <button type="button" onClick={() => {
                seating.current.sitRequest++;
                viewport.current?.querySelector("canvas")?.focus({ preventScroll: true });
              }} disabled={!!seating.current.pendingSeatId}>Ngồi xuống <kbd>F</kbd></button>
              {seatMessage && <small role="status">{seatMessage}</small>}
            </div>
          )}
          {activeSeat && (
            <div className="campus-seated-tools" role="group" aria-label="Điều khiển khi ngồi">
              <span>Đang ngồi · {activeSeat.label}</span>
              <button type="button" onClick={() => { seating.current.expandRequest++; }}>Phóng to màn hình máy tính</button>
              <button type="button" onClick={() => { seating.current.exitRequest++; }}>Thoát chỗ ngồi</button>
              {seatMessage && <small role="alert">{seatMessage}</small>}
            </div>
          )}
          <div className="campus-player-status" aria-live="polite">
            <strong>{playerName}</strong>
            <span className="campus-connection-state" data-state={multiplayer.status} title={multiplayer.notice || connectionText}>{connectionText}</span>
            <span>{activeSeat ? "Chọn Làm bài kiểm tra trên màn hình máy tính" : toadBusy ? "Nhấn phím di chuyển hoặc Dừng tương tác để kết thúc" : controlFocused ? "WASD để di chuyển · Giữ Shift để chạy" : "Bấm vào bản đồ để điều khiển nhân vật"}</span>
          </div>
          {!activeSeat && <div className="campus-player-pad" role="group" aria-label="Nút di chuyển nhân vật">
            {[
              { code: "KeyW", label: "Đi tới", symbol: "↑", className: "forward" },
              { code: "KeyA", label: "Đi trái", symbol: "←", className: "left" },
              { code: "KeyS", label: "Đi lùi", symbol: "↓", className: "back" },
              { code: "KeyD", label: "Đi phải", symbol: "→", className: "right" },
              { code: "ShiftLeft", label: "Giữ để chạy", symbol: "Chạy", className: "run" },
            ].map(({ code, label, symbol, className }) => (
              <button
                key={code}
                type="button"
                className={`campus-player-pad-${className}`}
                aria-label={label}
                onPointerDown={(event) => {
                  event.preventDefault();
                  focusMap();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  input.current.buttons.add(code);
                }}
                onPointerUp={() => releaseButton(code)}
                onPointerCancel={() => releaseButton(code)}
                onLostPointerCapture={() => releaseButton(code)}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    input.current.buttons.add(code);
                  }
                }}
                onKeyUp={() => releaseButton(code)}
                onBlur={() => releaseButton(code)}
              >{symbol}</button>
            ))}
          </div>}
        </div>
      </div>
      <p className="campus-3d-help">
        WASD / phím mũi tên: di chuyển · Giữ Shift: chạy · Kéo chuột: xoay camera · Cuộn: thu phóng.
        <span>Bấm “Toàn màn hình” ở góc phải map để mở rộng. Bấm “Thu nhỏ” hoặc nhấn Esc để trở về.</span>
        <span>Trên màn hình cảm ứng: dùng các nút mũi tên để đi, kéo trên map để xoay và chụm hai ngón để thu phóng.</span>
        <span>Đến gần cửa phòng, bấm “Mở cửa” hoặc nhấn E để mở/đóng. Lên tầng bằng cầu thang.</span>
        <span>Đến bàn máy tính trống và nhấn F để ngồi. Chọn “Thoát chỗ ngồi” hoặc nhấn Esc để đứng dậy.</span>
        <span>Đến gần Trùm trường hoặc bàn thăm, bấm “Rút thăm”. Mỗi lượt khấn đổi được 1 quẻ ngẫu nhiên.</span>
        <span>Đến phía trước Cóc Tiến Sĩ để chạm tượng hoặc chắp tay vái miễn phí. Nhấn phím di chuyển hoặc Esc để dừng động tác.</span>
        <span>Bấm Chat ở góc phải để trò chuyện với người chơi trong map. Khi đang gõ tin nhắn, các phím di chuyển được tạm dừng.</span>
      </p>
    </section>
  );
}
