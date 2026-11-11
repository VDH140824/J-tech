import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  acceptRainComposition, advanceRainRound, cardProgress, rainReading,
  roundScore, startRainRound, typeRainCharacters,
  STARTING_LIVES, type RainRound, type RainWord,
} from "./vocabularyRainGame";
import "./VocabularyRainGame.css";

const MUSIC_URL =
  "https://res.cloudinary.com/keticbsk/video/upload/v1785996208/Japanese_Music_Nh%E1%BA%A1c_Nh%E1%BA%ADt_B%E1%BA%A3n_Hay_Nh%E1%BA%A5t_Nh%E1%BA%A1c_Anime_Bu%E1%BB%93n_Nh%E1%BA%B9_Nh%C3%A0ng_om5uhw.mp3";

interface VocabularyRainGameProps {
  title: string;
  words: RainWord[];
  onExit: () => void;
}

const RainCardContent = memo(function RainCardContent({ word, typedCount }: { word: RainWord; typedCount: number }) {
  const characters = Array.from(rainReading(word));
  return (
    <>
      <span className="jtech-rain-card-meaning">{word.meaning}</span>
      <span className="jtech-rain-card-hint" lang="ja">
        {characters.map((character, index) => {
          if (index < typedCount) return <strong className="jtech-rain-typed" key={index}>{character}</strong>;
          if (index === 0) return <strong key={index}>{character}</strong>;
          return <span className="jtech-rain-blank" key={index}>_</span>;
        })}
      </span>
    </>
  );
});

export function VocabularyRainGame({ title, words, onExit }: VocabularyRainGameProps) {
  const [round, setRound] = useState<RainRound | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const music = useRef<HTMLAudioElement>(null);
  const answerField = useRef<HTMLInputElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const composing = useRef(false);
  const compositionCardId = useRef<number | undefined>(undefined);
  const committedComposition = useRef("");
  const spokenMisses = useRef(0);
  const utterances = useRef(new Set<SpeechSynthesisUtterance>());
  const phase = round?.phase;
  const canType = phase === "playing" && !!round?.lives;
  const inputRevision = round?.inputRevision ?? 0;
  const missed = round?.missed;

  useEffect(() => {
    if (!missed || missed.length <= spokenMisses.current) return;
    const newMisses = missed.slice(spokenMisses.current);
    spokenMisses.current = missed.length;
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    const synthesis = window.speechSynthesis;
    const voices = synthesis.getVoices();
    const japanese = voices.filter((voice) => /^ja(?:[-_]|$)/i.test(voice.lang));
    const voice = japanese.find((item) => item.localService) ?? japanese[0];
    if (voices.length && !voice) return;

    const pending = utterances.current;
    for (const word of newMisses) {
      const speech = new SpeechSynthesisUtterance(rainReading(word));
      speech.lang = "ja-JP";
      speech.rate = 0.9;
      if (voice) speech.voice = voice;
      speech.onend = speech.onerror = () => { pending.delete(speech); };
      pending.add(speech);
      synthesis.speak(speech);
    }
  }, [missed]);

  useEffect(() => {
    const pending = utterances.current;
    return () => {
      if (pending.size) window.speechSynthesis.cancel();
      pending.clear();
    };
  }, []);

  useEffect(() => {
    const audio = music.current;
    if (!audio || !musicEnabled || phase !== "playing") return;
    let active = true;
    audio.volume = 0.18;
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
  }, [musicEnabled, phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    let frame: number;
    let previous: number | undefined;
    const tick = (now: number) => {
      const delta = previous === undefined ? 0 : now - previous;
      previous = now;
      setRound((current) => current && advanceRainRound(current, delta));
      frame = requestAnimationFrame(tick);
    };
    const pauseWhenHidden = () => {
      if (document.hidden) {
        setRound((current) => current?.phase === "playing" ? { ...current, phase: "paused" } : current);
      }
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [phase]);

  useLayoutEffect(() => {
    composing.current = false;
    compositionCardId.current = undefined;
    if (answerField.current) answerField.current.value = "";
    if (canType) answerField.current?.focus({ preventScroll: true });
    if (phase === "paused") continueButton.current?.focus();
    if (phase === "finished") resultHeading.current?.focus();
  }, [canType, inputRevision, phase]);

  function start() {
    if (utterances.current.size) window.speechSynthesis.cancel();
    utterances.current.clear();
    spokenMisses.current = 0;
    setRound(startRainRound(words));
  }

  function commitInput(value: string) {
    if (!canType || !value.trim()) return;
    setRound((current) => current?.inputRevision === inputRevision ? typeRainCharacters(current, value) : current);
  }

  function commitComposition(value: string) {
    const cardId = compositionCardId.current;
    setRound((current) =>
      current && (cardId === undefined || current.typing?.cardId === cardId)
        ? acceptRainComposition(current, value, inputRevision)
        : current,
    );
  }

  function togglePause() {
    setRound((current) => {
      if (current?.phase === "playing") return { ...current, phase: "paused" };
      if (current?.phase === "paused") return { ...current, phase: "playing" };
      return current;
    });
  }

  function toggleMusic() {
    setMusicError(false);
    setMusicEnabled((enabled) => !enabled);
  }

  return (
    <section className="jtech-rain" aria-labelledby="rain-game-title">
      <audio ref={music} src={MUSIC_URL} preload="none" loop />
      <div className="jtech-rain-heading">
        <div className="jtech-rain-title">
          <span className="jtech-rain-title-icon" aria-hidden="true">雨</span>
          <div><h1 id="rain-game-title">Mưa Từ Vựng</h1><p>{title}</p></div>
        </div>
        <button type="button" onClick={onExit}>← Chọn bài khác</button>
      </div>
      {musicError && <p role="status">Không phát được nhạc nền. Bạn có thể bấm Nhạc nền để thử lại.</p>}
      <div className="jtech-rain-panel">
        <div className="jtech-rain-arena">
          <div className="jtech-rain-water" aria-hidden="true" />
          {round && (
            <div className="jtech-rain-score">
              <span className="jtech-rain-pill"><span aria-hidden="true">🏆</span> {roundScore(round)} điểm</span>
              <span className="jtech-rain-pill">Đúng {round.correct}/{words.length}</span>
              <span className="jtech-rain-pill jtech-rain-lives" aria-label={`${round.lives} trên ${STARTING_LIVES} tim`}>
                <span aria-hidden="true">{"♥".repeat(round.lives)}<span className="jtech-rain-empty-lives">{"♥".repeat(STARTING_LIVES - round.lives)}</span></span>
              </span>
            </div>
          )}
          <div className="jtech-rain-controls">
            {phase === "playing" && (
              <button type="button" onClick={togglePause} aria-label="Tạm dừng" title="Tạm dừng">Ⅱ</button>
            )}
            <button
              type="button"
              aria-pressed={musicEnabled}
              aria-label="Nhạc nền"
              title={musicEnabled ? "Tắt nhạc nền" : "Bật nhạc nền"}
              onClick={toggleMusic}
            >
              {musicEnabled ? "♫" : "♪"}
            </button>
          </div>
          {(phase === "playing" || phase === "paused") && round && (
            <div className="jtech-rain-field">
              {round.active.map((card) => {
                if (!round.lives) return null;
                const progress = cardProgress(card, round.elapsed) * 100;
                const typing = round.typing;
                const isTarget = typing?.cardId === card.word.id;
                const typedCount = isTarget ? typing.count : 0;
                return (
                  <div className="jtech-rain-lane" key={card.word.id} style={{ left: `${card.lane * 100 / 3}%` }}>
                    <div
                      className={`jtech-rain-card${isTarget ? " jtech-rain-card-target" : ""}`}
                      style={{ top: `${progress}%`, transform: `translateY(-${progress}%)` }}
                    >
                      <RainCardContent word={card.word} typedCount={typedCount} />
                    </div>
                  </div>
                );
              })}
              {round.reveals.map((reveal) => (
                <div
                  className="jtech-rain-lane jtech-rain-reveal-lane"
                  key={reveal.word.id}
                  style={{ left: `${reveal.lane * 100 / 3}%` }}
                >
                  <span
                    className={`jtech-rain-reveal jtech-rain-reveal-${reveal.kind}`}
                    lang="ja"
                    style={{ top: `${reveal.progress * 100}%`, transform: `translateY(-${reveal.progress * 100}%)` }}
                  >
                    {rainReading(reveal.word)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!round && (
            <div className="jtech-rain-overlay">
              <h2>Cách chơi</h2>
              <ol className="jtech-rain-instructions">
                <li>Bật bàn phím tiếng Nhật và đọc nghĩa trên thẻ. Ví dụ <strong>Tôi</strong> · <span lang="ja">わ _ _</span>.</li>
                <li>Gõ <span lang="ja">わ</span> để chọn thẻ, rồi gõ <span lang="ja">た</span> và <span lang="ja">し</span>. Chữ đúng chuyển xanh. Nếu gõ sai, bạn có thể gõ lại chữ đó.</li>
                <li>Nếu nhiều thẻ có cùng chữ đầu, game chọn thẻ gần đáy nhất. Gõ hết thẻ viền vàng để nhận <strong>10 điểm</strong> và chuyển từ.</li>
                <li>Thẻ chạm đáy làm mất <strong>1 tim</strong>. Đáp án hiện màu đỏ và được đọc nếu trình duyệt có giọng tiếng Nhật.</li>
              </ol>
              <p>Kana đúng chuyển xanh và ô gõ tự làm trống. Gõ tiếp ngay mà không cần nhấn Enter.</p>
              <button className="jtech-rain-primary" type="button" onClick={start}>Vào chơi</button>
            </div>
          )}
          {phase === "paused" && (
            <div className="jtech-rain-overlay">
              <h2>Đã tạm dừng</h2>
              <button className="jtech-rain-primary" ref={continueButton} type="button" onClick={togglePause}>Tiếp tục</button>
            </div>
          )}
          {phase === "finished" && round && (
            <div className="jtech-rain-overlay jtech-rain-result">
              <h2 ref={resultHeading} tabIndex={-1}>{round.lives ? "Hoàn thành ván chơi" : "Đã hết tim"}</h2>
              <p>{roundScore(round)} điểm · Đúng {round.correct}/{words.length} từ</p>
              {!!round.missed.length && (
                <div className="jtech-rain-missed">
                  <h3>Từ đã bỏ lỡ</h3>
                  <ul>{round.missed.map((item) => (
                    <li key={item.id}>{item.meaning} · <span lang="ja">{item.reading || item.word}</span></li>
                  ))}</ul>
                </div>
              )}
              <div className="jtech-rain-result-actions">
                <button className="jtech-rain-primary" type="button" onClick={start}>Chơi lại</button>
                <Link to="/games">Danh sách trò chơi</Link>
              </div>
            </div>
          )}
        </div>
        {(phase === "playing" || phase === "paused") && (
          <div className="jtech-rain-form">
            <label htmlFor="rain-answer">Gõ tiếng Nhật</label>
            <div className="jtech-rain-input">
              <input
                key={inputRevision}
                id="rain-answer" ref={answerField} lang="ja"
                placeholder="かな" autoComplete="off" spellCheck={false}
                disabled={!canType}
                onInput={(event) => {
                  const field = event.currentTarget;
                  if (field !== answerField.current) return;
                  const native = event.nativeEvent as InputEvent;
                  // Read the live input even if the IME resumed on a replacement field without compositionstart.
                  if (native.isComposing || native.inputType === "insertCompositionText" || composing.current) {
                    if (!composing.current) compositionCardId.current = round?.typing?.cardId;
                    composing.current = true;
                    commitComposition(field.value);
                    return;
                  }
                  if (native.inputType !== "insertFromComposition" && field.value !== committedComposition.current) {
                    commitInput(field.value);
                  }
                  committedComposition.current = "";
                  field.value = "";
                }}
                onCompositionStart={(event) => {
                  if (event.currentTarget !== answerField.current) return;
                  composing.current = true;
                  compositionCardId.current = round?.typing?.cardId;
                }}
                onCompositionEnd={(event) => {
                  const field = event.currentTarget;
                  if (field !== answerField.current || !composing.current) return;
                  composing.current = false;
                  const value = event.data;
                  committedComposition.current = value;
                  commitComposition(value);
                  field.value = "";
                  queueMicrotask(() => { committedComposition.current = ""; });
                }}
              />
            </div>
            <p className="jtech-rain-feedback" role="status">{round?.feedback}</p>
          </div>
        )}
      </div>
    </section>
  );
}
