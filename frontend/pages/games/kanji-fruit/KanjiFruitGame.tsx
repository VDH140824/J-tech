import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { Link } from "react-router-dom";
import { createGameSessionId, type StudentGameResult } from "../../../api/gameApi";
import { advanceKanjiFruit, chooseKanjiFruit, STARTING_LIVES, startKanjiFruitRound, type FlyingFruit, type KanjiFruitCard, type KanjiFruitRound } from "./kanjiFruitLogic";
import "./KanjiFruitGame.css";

const MUSIC_URL = "https://res.cloudinary.com/keticbsk/video/upload/v1785996208/Japanese_Music_Nh%E1%BA%A1c_Nh%E1%BA%ADt_B%E1%BA%A3n_Hay_Nh%E1%BA%A5t_Nh%E1%BA%A1c_Anime_Bu%E1%BB%93n_Nh%E1%BA%B9_Nh%C3%A0ng_om5uhw.mp3";

interface SlashPoint { x: number; y: number; time: number }
interface CutEffect { id: string; x: number; y: number; fruitType: number; correct: boolean }

function FruitArtwork({ type, seed }: { type: number; seed: string }) {
  const uid = `fruit-${seed.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fruitType = ((type % 4) + 4) % 4;
  const palettes = [
    ["#fff5d9", "#ff5362", "#f10c37", "#a90026"],
    ["#fff2e8", "#ff9eb5", "#fa648c", "#cb315e"],
    ["#f6ffd0", "#b9f04d", "#55c916", "#208d16"],
    ["#fffbd1", "#ffe940", "#ffb900", "#ec7900"],
  ][fruitType];
  const body = [
    "M120 57C108 45 94 41 79 45 48 51 31 77 31 116c0 47 33 88 79 103 4 1 8 0 10-4 2 4 6 5 10 4 46-15 79-56 79-103 0-39-17-65-48-71-15-4-29 0-41 12Z",
    "M120 59C108 45 92 41 75 47 46 58 31 84 34 120c4 43 36 81 82 99 2 1 3 1 4 1s2 0 4-1c46-18 78-56 82-99 3-36-12-62-41-73-17-6-33-2-45 12Z",
    "M120 56C106 44 91 40 75 45 44 53 29 81 31 121c2 45 36 83 80 98 4 1 7 0 9-4 2 4 5 5 9 4 44-15 78-53 80-98 2-40-13-68-44-76-16-5-31-1-45 11Z",
    "M120 70c-31 0-61 16-75 43-20 39-2 90 39 111 11 6 23 9 36 10 13-1 25-4 36-10 41-21 59-72 39-111-14-27-44-43-75-43Z",
  ][fruitType];
  const leaves = fruitType === 3
    ? <g fill={`url(#${uid}-leaf)`} stroke="#cf9220" strokeWidth="4" strokeLinejoin="round"><path d="M117 82C98 62 78 42 64 37c0 22 17 42 52 56Z"/><path d="M117 80C108 53 96 31 81 22c-5 22 8 46 36 68Z"/><path d="M120 78c-5-28-2-51 11-67 15 20 14 44-6 72Z"/><path d="M123 81c13-27 31-46 49-53 1 23-15 45-47 67Z"/><path d="M124 87c25-22 51-32 70-28-11 22-34 36-68 41Z"/><path d="M68 41c19 9 36 22 50 39m-33-53c18 13 29 29 35 49m4-62c8 19 7 39 5 60m37-42c-17 14-29 29-38 47m61-17c-22 7-41 18-58 34" fill="none" stroke="#e9ff8f" strokeWidth="3"/></g>
    : <g fill={`url(#${uid}-leaf)`} stroke="#d69a28" strokeWidth="4" strokeLinejoin="round"><path d="M119 59C95 37 63 25 41 37c13 25 39 38 76 28Z"/><path d="M121 59c24-22 56-34 78-22-13 25-39 38-76 28Z"/><path d="M48 39c24 6 48 17 68 30m76-30c-24 6-48 17-68 30" fill="none" stroke="#edff9b" strokeWidth="3"/></g>;
  const stem = fruitType === 3
    ? <path d="M119 88c-4-17 1-32 12-47" fill="none" stroke={`url(#${uid}-stem)`} strokeWidth="13" strokeLinecap="round"/>
    : <g fill="none" strokeLinecap="round"><path d="M117 76c-5-18 1-34 13-51" stroke={`url(#${uid}-stem)`} strokeWidth="15"/><path d="M116 70c-2-15 3-27 13-40" stroke="#ffe9a4" strokeWidth="3" opacity=".9"/></g>;

  return (
    <svg className="kanji-fruit-art" viewBox="0 0 240 260" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-skin`} cx="29%" cy="19%" r="84%"><stop stopColor={palettes[0]}/><stop offset=".18" stopColor={palettes[1]}/><stop offset=".58" stopColor={palettes[2]}/><stop offset="1" stopColor={palettes[3]}/></radialGradient>
        <linearGradient id={`${uid}-leaf`} x1=".1" x2=".85" y1="0" y2="1"><stop stopColor="#eaff72"/><stop offset=".38" stopColor="#8ee51d"/><stop offset=".72" stopColor="#45b813"/><stop offset="1" stopColor="#17782c"/></linearGradient>
        <linearGradient id={`${uid}-stem`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ffe18a"/><stop offset=".4" stopColor="#a95a1c"/><stop offset="1" stopColor="#542b1a"/></linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
        <linearGradient id={`${uid}-edge`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fff69b"/><stop offset=".3" stopColor="#ffbd19"/><stop offset=".68" stopColor="#e88508"/><stop offset="1" stopColor="#fff47a"/></linearGradient>
      </defs>
      <ellipse cx="120" cy="235" rx="77" ry="13" fill="#071525" opacity=".35" />
      <path d={body} transform="translate(0 3)" fill="#7f2035" opacity=".28" />
      <path d={body} fill={`url(#${uid}-skin)`} stroke="#8f352e" strokeWidth="10" strokeLinejoin="round" />
      <path d={body} fill="none" stroke={`url(#${uid}-edge)`} strokeWidth="7" strokeLinejoin="round" />
      <path d={body} fill="none" stroke="#fff3ad" strokeOpacity=".8" strokeWidth="1.8" strokeLinejoin="round" />
      {leaves}
      {stem}
      <ellipse cx="76" cy="111" rx="13" ry="28" transform="rotate(28 76 111)" fill={`url(#${uid}-shine)`} opacity=".95"/>
      <ellipse cx="56" cy="143" rx="5" ry="9" transform="rotate(28 56 143)" fill="#fff" opacity=".78"/>
      <path d="M169 87c19 14 27 36 25 59" fill="none" stroke="#fff9d9" strokeWidth="3" strokeLinecap="round" opacity=".4"/>
      {fruitType === 1 && <path d="M120 61c-8 28-3 63 1 88 4 28 1 48-1 66" fill="none" stroke="#b93056" strokeWidth="3" strokeLinecap="round" opacity=".58"/>}
      {fruitType === 2 && <path d="M120 65c-5 7-8 13-8 20" fill="none" stroke="#378c1d" strokeWidth="3" strokeLinecap="round" opacity=".7"/>}
      {fruitType === 3 && <g fill="#fff4bd" opacity=".42"><circle cx="70" cy="156" r="2.4"/><circle cx="88" cy="181" r="1.8"/><circle cx="178" cy="153" r="2"/><circle cx="163" cy="190" r="1.7"/><circle cx="54" cy="178" r="1.6"/></g>}
    </svg>
  );
}

function getPosition(event: PointerEvent<HTMLDivElement>, element: HTMLDivElement) {
  const bounds = element.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top, time: performance.now() };
}

function segmentSteps(a: SlashPoint, b: SlashPoint) {
  return Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
}

export function KanjiFruitGame({ title, cards, onExit, onComplete }: {
  title: string;
  cards: KanjiFruitCard[];
  onExit: () => void;
  onComplete: (result: { sessionId: string; correctCount: number; totalCount: number }) => Promise<StudentGameResult>;
}) {
  const [round, setRound] = useState<KanjiFruitRound>(() => startKanjiFruitRound(cards));
  const [rewardMessage, setRewardMessage] = useState("");
  const sessionId = useRef(createGameSessionId());
  const submittedSession = useRef("");
  const [slashing, setSlashing] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const [trail, setTrail] = useState<SlashPoint[]>([]);
  const [cuts, setCuts] = useState<CutEffect[]>([]);
  const previous = useRef<number>();
  const roundRef = useRef(round);
  const arenaRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const fruitButtons = useRef(new Map<string, HTMLButtonElement>());
  const previousPoint = useRef<SlashPoint | null>(null);
  const slashingRef = useRef(false);
  const sliced = useRef(new Set<string>());
  const trailTimer = useRef<number>();

  roundRef.current = round;

  useEffect(() => {
    if (round.phase !== "finished" || submittedSession.current === sessionId.current) return;
    submittedSession.current = sessionId.current;
    setRewardMessage("Đang lưu thành tích…");
    void onComplete({ sessionId: sessionId.current, correctCount: round.answered, totalCount: cards.length })
      .then((result) => setRewardMessage(`Thành tích đã lưu · +${result.coinAwarded} coin`))
      .catch(() => setRewardMessage("Chưa lưu được thành tích. Vui lòng thử lại sau."));
  }, [cards.length, onComplete, round]);

  useEffect(() => {
    if (round.phase !== "playing") return;
    let frame = 0;
    const tick = (now: number) => {
      const delta = previous.current === undefined ? 0 : Math.min(40, now - previous.current);
      previous.current = now;
      setRound((current) => {
        const next = advanceKanjiFruit(current, delta);
        roundRef.current = next;
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); previous.current = undefined; };
  }, [round.phase]);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio || !musicEnabled || round.phase !== "playing") {
      audio?.pause();
      return;
    }
    let active = true;
    audio.volume = 0.14;
    void audio.play().catch(() => {
      if (active) {
        setMusicEnabled(false);
        setMusicError(true);
      }
    });
    return () => {
      active = false;
      audio.pause();
    };
  }, [musicEnabled, round.phase]);

  useEffect(() => () => { if (trailTimer.current) window.clearTimeout(trailTimer.current); }, []);

  function updateRound(update: (current: KanjiFruitRound) => KanjiFruitRound) {
    setRound((current) => {
      const next = update(current);
      roundRef.current = next;
      return next;
    });
  }

  function cutFruit(id: string, point: SlashPoint) {
    if (sliced.current.has(id)) return;
    const current = roundRef.current;
    const fruit = current.fruits.find((item) => item.id === id);
    if (!fruit || current.phase !== "playing") return;
    sliced.current.add(id);
    const next = chooseKanjiFruit(current, id);
    roundRef.current = next;
    setRound(next);
    const cut = { id: `${id}-${Math.round(point.time)}`, x: point.x, y: point.y, fruitType: fruit.fruitType, correct: fruit.correct };
    setCuts((items) => [...items.slice(-5), cut]);
    window.setTimeout(() => setCuts((items) => items.filter((item) => item.id !== cut.id)), 650);
  }

  function testHit(point: SlashPoint) {
    for (const [id, button] of fruitButtons.current) {
      if (sliced.current.has(id) || !roundRef.current.fruits.some((fruit) => fruit.id === id)) continue;
      const bounds = button.getBoundingClientRect();
      const arena = arenaRef.current?.getBoundingClientRect();
      if (!arena) return;
      const left = bounds.left - arena.left - 10;
      const right = bounds.right - arena.left + 10;
      const top = bounds.top - arena.top - 10;
      const bottom = bounds.bottom - arena.top + 10;
      if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) cutFruit(id, point);
    }
  }

  function drawTrail(point: SlashPoint) {
    setTrail((points) => [...points.filter((item) => point.time - item.time < 170), point].slice(-12));
    if (trailTimer.current) window.clearTimeout(trailTimer.current);
    trailTimer.current = window.setTimeout(() => setTrail([]), 190);
  }

  function slashDown(event: PointerEvent<HTMLDivElement>) {
    if (roundRef.current.phase !== "playing" || (event.target as HTMLElement).closest("[data-game-control]")) return;
    event.preventDefault();
    slashingRef.current = true;
    setSlashing(true);
    const point = getPosition(event, event.currentTarget);
    previousPoint.current = point;
    drawTrail(point);
    testHit(point);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture may be unavailable in embedded browsers. */ }
  }

  function slashMove(event: PointerEvent<HTMLDivElement>) {
    if (!slashingRef.current) return;
    const point = getPosition(event, event.currentTarget);
    drawTrail(point);
    const start = previousPoint.current ?? point;
    const steps = segmentSteps(start, point);
    for (let index = 1; index <= steps; index++) {
      const progress = index / steps;
      testHit({ x: start.x + (point.x - start.x) * progress, y: start.y + (point.y - start.y) * progress, time: point.time });
    }
    previousPoint.current = point;
  }

  function slashUp(event?: PointerEvent<HTMLDivElement>) {
    slashingRef.current = false;
    setSlashing(false);
    previousPoint.current = null;
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function keyboardCut(fruit: FlyingFruit) {
    const bounds = fruitButtons.current.get(fruit.id)?.getBoundingClientRect();
    const arena = arenaRef.current?.getBoundingClientRect();
    if (bounds && arena) cutFruit(fruit.id, { x: bounds.left + bounds.width / 2 - arena.left, y: bounds.top + bounds.height / 2 - arena.top, time: performance.now() });
  }

  return (
    <section className="kanji-fruit" aria-labelledby="kanji-fruit-heading">
      <header className="kanji-fruit-heading">
        <div><Link to="/games">← Trò chơi</Link><h1 id="kanji-fruit-heading">Chém Kanji</h1><p>{title}</p></div>
        <button type="button" onClick={onExit}>Chọn bài khác</button>
      </header>
      <div ref={arenaRef} className={`kanji-fruit-arena${slashing ? " is-slashing" : ""}`} onPointerDown={slashDown} onPointerMove={slashMove} onPointerUp={slashUp} onPointerCancel={slashUp} onLostPointerCapture={() => slashUp()}>
        <audio ref={musicRef} src={MUSIC_URL} preload="none" loop />
        <svg className="kanji-fruit-landscape" viewBox="0 0 1920 900" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="scene-sky" x2="0" y2="1"><stop stopColor="#070e45"/><stop offset=".48" stopColor="#2047a2"/><stop offset=".76" stopColor="#ed65a5"/><stop offset="1" stopColor="#ffb568"/></linearGradient>
            <linearGradient id="scene-water" x2="0" y2="1"><stop stopColor="#2365aa"/><stop offset=".55" stopColor="#242c71"/><stop offset="1" stopColor="#101b48"/></linearGradient>
            <linearGradient id="scene-wood" x2="0" y2="1"><stop stopColor="#a75c64"/><stop offset=".16" stopColor="#5a3652"/><stop offset="1" stopColor="#261f3d"/></linearGradient>
            <linearGradient id="scene-fuji" x2="0" y2="1"><stop stopColor="#cfedff"/><stop offset=".18" stopColor="#749dd4"/><stop offset="1" stopColor="#253c78"/></linearGradient>
            <radialGradient id="scene-moon"><stop stopColor="#fffbe2"/><stop offset=".64" stopColor="#c4edff"/><stop offset="1" stopColor="#77caff" stopOpacity=".25"/></radialGradient>
            <linearGradient id="scene-roof" x2="0" y2="1"><stop stopColor="#f8bd64"/><stop offset=".35" stopColor="#d74d68"/><stop offset="1" stopColor="#542858"/></linearGradient>
          </defs>
          <rect width="1920" height="900" fill="url(#scene-sky)"/>
          <circle cx="1730" cy="135" r="80" fill="url(#scene-moon)" opacity=".92"/><circle cx="1704" cy="112" r="10" fill="#91bfd8" opacity=".34"/><circle cx="1755" cy="150" r="16" fill="#91bfd8" opacity=".24"/><circle cx="1725" cy="177" r="7" fill="#91bfd8" opacity=".3"/>
          <g fill="#fff9dc" opacity=".8"><circle cx="420" cy="92" r="2"/><circle cx="590" cy="164" r="1.5"/><circle cx="770" cy="72" r="2"/><circle cx="1020" cy="142" r="1.5"/><circle cx="1258" cy="88" r="2"/><circle cx="1460" cy="204" r="1.5"/><circle cx="1850" cy="255" r="2"/><circle cx="250" cy="244" r="1.5"/><circle cx="1100" cy="235" r="1.5"/></g>
          <path d="M0 514 92 426l84 68 94-152 111 172 118-96 109 104 128-126 111 133 111-207 120 201 89-101 106 109 105-169 88 154 143-114 89 104v188H0Z" fill="#253d7c" opacity=".68"/>
          <path d="m852 436 190-250 200 250-104-93-53 32-42-59-52 48-43-26Z" fill="url(#scene-fuji)" opacity=".95"/>
          <path d="m933 330 109-144 101 144-48-29-28 25-30-41-36 47-31-28Z" fill="#f5f5ed" opacity=".96"/>
          <path d="M0 531c154-48 290-43 421 0 153 50 291 37 443-6 158-45 315-31 446 17 197 70 389 21 610-24v157H0Z" fill="#1c3270"/>
          <path d="M0 590c206-30 357 25 536-3 198-31 339 8 518-12 224-25 394 24 866-15v172H0Z" fill="url(#scene-water)" opacity=".96"/>
          <g fill="#ffc4d8" opacity=".38"><path d="M110 626h170v5H110zm405 28h235v4H515zm590-34h210v5h-210zm376 47h174v4h-174z"/><path d="M324 691h90v3h-90zm564-53h120v3H888zm448 70h210v3h-210z"/></g>
          <g transform="translate(1590 324)" fill="url(#scene-roof)" stroke="#ffd58b" strokeWidth="5" strokeLinejoin="round">
            <path d="M76 6 166 45 181 59 161 58 76 32 1 58 -18 59 -4 45Z"/><path d="M22 58h109v92H22z" fill="#563261"/><path d="m59 156 91 37 14 14-21-2-84-23-67 23-21 2 14-14Z"/><path d="M26 193h98v75H26z" fill="#60365e"/><path d="m67 274 76 30 14 13-21-2-69-17-55 17-21 2 14-13Z"/><path d="M37 307h78v66H37z" fill="#613765"/><path d="m75 378 63 25 12 12-18-2-57-14-43 14-18 2 12-12Z"/><path d="M46 407h59v51H46z" fill="#683866"/><path d="m76 462 49 20 9 10-15-1-43-11-31 11-15 1 9-10Z"/>
          </g>
          <g fill="#ffd98a" opacity=".82"><rect x="1639" y="380" width="8" height="76"/><rect x="1718" y="380" width="8" height="76"/><rect x="1643" y="477" width="8" height="62"/><rect x="1712" y="477" width="8" height="62"/><rect x="1653" y="570" width="8" height="48"/><rect x="1702" y="570" width="8" height="48"/></g>
          <g transform="translate(960 596)" stroke="#f3c56f" strokeWidth="10" fill="none" opacity=".7"><path d="M-82 60V-15h164v75M-103-14h206M-93-15-76-47H76l17 32M0-47v107"/><path d="M-110-14h220" stroke="#ec788c" strokeWidth="18"/></g>
          <g fill="none" stroke="#edb56d" strokeWidth="14" opacity=".78"><path d="M0 650h232l126 116M0 712h164l102 100M1920 642h-230l-124 125M1920 708h-156l-104 105"/><path d="M39 640v146m110-137v112m166-90v94M1880 637v149m-110-138v112m-166-87v95" strokeWidth="10"/></g>
          <rect y="754" width="1920" height="146" fill="url(#scene-wood)"/>
          <g fill="none" stroke="#e6a27d" opacity=".48"><path d="M0 786h1920M0 832h1920M0 876h1920" strokeWidth="4"/><path d="M160 754 95 900m186-146-45 146m177-146-28 146m179-146-12 146m174-146 2 146m174-146 15 146m175-146 27 146m164-146 41 146m155-146 55 146m130-146 72 146" strokeWidth="3"/></g>
          <g fill="#ff9fc9" opacity=".9"><g transform="translate(105 105)"><circle r="21"/><circle cx="20" r="19"/><circle cx="10" cy="18" r="18"/><circle cx="-12" cy="18" r="18"/><circle cx="-21" r="16"/><circle r="7" fill="#ffe59a"/></g><g transform="translate(244 58) scale(.8)"><circle r="20"/><circle cx="20" r="18"/><circle cx="10" cy="18" r="18"/><circle cx="-12" cy="18" r="18"/><circle cx="-21" r="16"/><circle r="7" fill="#ffe59a"/></g><g transform="translate(1808 96) scale(.82)"><circle r="21"/><circle cx="20" r="19"/><circle cx="10" cy="18" r="18"/><circle cx="-12" cy="18" r="18"/><circle cx="-21" r="16"/><circle r="7" fill="#ffe59a"/></g><g transform="translate(1880 171) scale(.64)"><circle r="21"/><circle cx="20" r="19"/><circle cx="10" cy="18" r="18"/><circle cx="-12" cy="18" r="18"/><circle cx="-21" r="16"/><circle r="7" fill="#ffe59a"/></g></g>
          <g fill="#ffd0e2" opacity=".83"><path d="M324 180c24-18 29-44 20-57 26 15 32 42 12 64-12 13-22 13-32-7Z"/><path d="M1440 262c19-17 22-39 14-50 22 12 27 37 10 56-10 11-17 10-24-6Z"/><path d="M690 292c18-16 21-37 13-48 22 12 26 35 10 53-10 10-16 10-23-5Z"/><path d="M1260 120c15-14 18-32 11-42 19 10 23 30 9 45-8 9-14 9-20-3Z"/></g>
        </svg>
        <div className="kanji-fruit-sky" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6, 7].map((petal) => <i key={petal} className={`kanji-fruit-petal petal-${petal}`} />)}</div>
        <div className="kanji-fruit-brand"><span className="kanji-fruit-brand-mark">花</span><span>Hán Việt Thần Tốc<small>Thử thách âm Hán Việt</small></span></div>
        <div className="kanji-fruit-level"><span>{title}</span><b>Câu {round.index} / {round.cards.length}</b></div>
        <div className="kanji-fruit-score"><span className="score-chip"><span>🏆</span><small>ĐIỂM</small><b>{round.score}</b></span><span className="combo-chip"><small>COMBO</small><b>×{round.combo}</b></span><span className="life-chip" aria-label={`${round.lives} tim`}>{"♥".repeat(round.lives)}<span>{"♡".repeat(STARTING_LIVES - round.lives)}</span></span></div>
        <div className="kanji-fruit-controls"><button data-game-control type="button" aria-label={musicEnabled ? "Tắt nhạc nền" : "Bật nhạc nền"} aria-pressed={musicEnabled} title={musicEnabled ? "Tắt nhạc nền" : "Bật nhạc nền"} onClick={() => { setMusicError(false); setMusicEnabled((enabled) => !enabled); }}>{musicEnabled ? "♫" : "♪"}</button><button data-game-control className="kanji-fruit-pause" type="button" aria-label="Tạm dừng" onClick={() => updateRound((current) => ({ ...current, phase: current.phase === "playing" ? "paused" : "playing" }))} disabled={round.phase === "finished"}>Ⅱ</button><button data-game-control type="button" aria-label="Chọn bài khác" onClick={onExit}>⌂</button></div>
        <div className="kanji-fruit-question" key={round.selected?.id ?? "end"}><span className="kanji-fruit-question-prompt">Âm Hán Việt của chữ này là gì?</span><div className="kanji-fruit-question-orb"><strong lang="ja">{round.selected?.kanji ?? "遊"}</strong></div></div>
        {round.fruits.map((fruit) => {
          const x = fruit.x + fruit.drift * fruit.progress + Math.sin(fruit.progress * Math.PI) * fruit.sway;
          const y = 7 + Math.sin(fruit.progress * Math.PI) * fruit.arc - fruit.progress * 12;
          return <button key={fruit.id} ref={(node) => { if (node) fruitButtons.current.set(fruit.id, node); else fruitButtons.current.delete(fruit.id); }} className="kanji-fruit-option" type="button" aria-label={`Chém trái ${fruit.label}`} onClick={(event) => { if (event.detail === 0) keyboardCut(fruit); }} style={{ left: `${x}%`, bottom: `${y}%`, transform: `translate(-50%, 50%) scale(${1 - fruit.progress * .12})` }}>
            <span className="kanji-fruit-label" style={{ fontSize: "clamp(1.05rem, 2.5vw, 1.9rem)" }}>{fruit.label}</span><FruitArtwork type={fruit.fruitType} seed={fruit.id} />
          </button>;
        })}
        {cuts.map((cut) => <div key={cut.id} className={`kanji-fruit-cut${cut.correct ? " is-correct" : " is-wrong"}`} style={{ left: cut.x, top: cut.y }} aria-hidden="true"><span className="cut-half cut-half-top"><FruitArtwork type={cut.fruitType} seed={`${cut.id}-a`} /></span><span className="cut-half cut-half-bottom"><FruitArtwork type={cut.fruitType} seed={`${cut.id}-b`} /></span><b>{cut.correct ? "+100" : "×"}</b>{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ "--particle": index } as CSSProperties} />)}</div>)}
        <svg className="kanji-fruit-slash" aria-hidden="true"><defs><linearGradient id="slash-paint"><stop stopColor="#fff"/><stop offset=".45" stopColor="#8cf4ff"/><stop offset="1" stopColor="#ffd979"/></linearGradient></defs>{trail.length > 1 && <><polyline points={trail.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#4be2ff" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" opacity=".18" /><polyline points={trail.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="url(#slash-paint)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /><polyline points={trail.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>}</svg>
        <div className="kanji-fruit-ground"><span /><span /><span /></div>
        <div className="kanji-fruit-progress"><span style={{ width: `${(round.index - (round.selected ? 1 : 0)) / round.cards.length * 100}%` }} /><b>{round.index - (round.selected ? 1 : 0)} / {round.cards.length}</b><strong>+100</strong><em>♥ +1</em></div>
        {round.phase === "ready" && <div className="kanji-fruit-overlay"><div className="kanji-fruit-guide"><span className="kanji-fruit-guide-icon">⚔️</span><h2>Hướng dẫn</h2><ul><li>Nhìn Kanji ở giữa màn hình.</li><li>Vuốt một đường qua trái cây mang âm Hán Việt đúng để chém.</li><li>Chém đúng được <strong>100 điểm</strong>; chém nhầm hoặc để trái đúng rơi sẽ mất <strong>1 tim</strong>.</li></ul><button type="button" onClick={() => updateRound((current) => ({ ...current, phase: "playing" }))}>Bắt đầu chơi</button></div></div>}
        {round.phase === "paused" && <div className="kanji-fruit-overlay"><div className="kanji-fruit-guide"><span className="kanji-fruit-guide-icon">Ⅱ</span><h2>Đã tạm dừng</h2><p>Lượt chơi của bạn đang được giữ lại.</p><button type="button" onClick={() => updateRound((current) => ({ ...current, phase: "playing" }))}>▶ Tiếp tục</button><button type="button" onClick={onExit}>Chọn nội dung khác</button></div></div>}
        {round.phase === "finished" && <div className="kanji-fruit-overlay"><div className="kanji-fruit-result"><span className="kanji-fruit-result-mark">{round.lives ? "🏆" : "🌸"}</span><h2>{round.lives ? "Hoàn thành!" : "Kết thúc lượt chơi"}</h2><p>{title}</p><div className="kanji-fruit-result-score"><small>Tổng điểm</small><strong>{round.score}</strong></div><div className="kanji-fruit-result-stats"><span><b>{round.answered}</b> Kanji đúng</span><span><b>×{round.bestCombo}</b> combo tốt nhất</span><span><b>{round.missed}</b> quả bỏ lỡ</span></div><p role="status">{rewardMessage}</p><div className="kanji-fruit-result-actions"><button type="button" onClick={() => { const next = startKanjiFruitRound(cards); sessionId.current = createGameSessionId(); submittedSession.current = ""; setRewardMessage(""); roundRef.current = next; sliced.current.clear(); setRound(next); }}>Chơi lại</button><button type="button" onClick={onExit}>Chọn nội dung</button><Link to="/games">Danh sách trò chơi</Link></div></div></div>}
        <p className="kanji-fruit-message" role="status">{musicError ? "Không phát được nhạc nền." : round.message}</p>
      </div>
    </section>
  );
}
