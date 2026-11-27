import { useEffect, useRef, useState } from "react";
import "./ScriptSpeechButton.css";

const RATES = [0.8, 1] as const;

function speechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((v) => /^ja(?:[-_]|$)/i.test(v.lang));
}

/**
 * Phát cả đoạn tiếng Nhật: dùng file audio nếu có, nếu không thì đọc bằng giọng ja-JP của trình duyệt.
 */
export function ScriptSpeechButton({ text, audioUrl }: { text: string; audioUrl?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [message, setMessage] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const supported = Boolean(audioUrl) || speechSupported();

  const stop = () => {
    if (audio.current) {
      audio.current.pause();
      audio.current.currentTime = 0;
    }
    if (utterance.current && speechSupported()) {
      utterance.current = null;
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  };

  // Dừng khi rời trang hoặc chuyển sang đoạn khác.
  useEffect(() => stop, [text, audioUrl]);

  // Một số trình duyệt nạp danh sách giọng muộn; gọi getVoices sớm để lần bấm đầu có giọng.
  useEffect(() => {
    if (!audioUrl && speechSupported()) window.speechSynthesis.getVoices();
  }, [audioUrl]);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate;
  }, [rate]);

  const play = () => {
    setMessage("");
    if (audioUrl) {
      const element = audio.current;
      if (!element) return;
      element.playbackRate = rate;
      element.currentTime = 0;
      element.play().then(
        () => setPlaying(true),
        () => setMessage("Không phát được file nghe. Vui lòng thử lại."),
      );
      return;
    }
    if (!speechSupported()) return;
    const voice = japaneseVoice();
    if (!voice) {
      setMessage("Thiết bị chưa có giọng tiếng Nhật. Hãy bật hoặc cài giọng tiếng Nhật rồi thử lại.");
      return;
    }
    const synthesis = window.speechSynthesis;
    const next = new SpeechSynthesisUtterance(text);
    next.lang = "ja-JP";
    next.voice = voice;
    next.rate = rate;
    next.onend = () => {
      if (utterance.current === next) {
        utterance.current = null;
        setPlaying(false);
      }
    };
    next.onerror = (event) => {
      if (utterance.current !== next) return;
      utterance.current = null;
      setPlaying(false);
      if (!["canceled", "interrupted"].includes(event.error))
        setMessage("Không phát được tiếng Nhật. Vui lòng thử lại.");
    };
    utterance.current = next;
    setPlaying(true);
    const start = () => {
      // Bỏ qua nếu người học đã bấm Dừng hoặc rời trang trong lúc chờ.
      if (utterance.current !== next) return;
      try {
        synthesis.speak(next);
      } catch {
        utterance.current = null;
        setPlaying(false);
        setMessage("Không phát được tiếng Nhật. Vui lòng thử lại.");
      }
    };
    // Edge/Chrome đôi khi đọc lại cả đoạn khi speak() chạy ngay sau cancel(); chỉ hủy khi còn đang đọc
    // và đợi trình duyệt dừng hẳn rồi mới đọc, để mỗi lần bấm chỉ phát đúng một lượt.
    if (synthesis.speaking || synthesis.pending) {
      synthesis.cancel();
      window.setTimeout(start, 150);
    } else {
      start();
    }
  };

  return (
    <div className="script-speech">
      {audioUrl && (
        <audio ref={audio} src={audioUrl} preload="none" onEnded={() => setPlaying(false)} />
      )}
      <button
        type="button"
        className="script-speech-play"
        disabled={!supported || !text.trim()}
        aria-pressed={playing}
        onClick={playing ? stop : play}
      >
        <span aria-hidden="true">{playing ? "■" : "▶"}</span>
        {playing ? "Dừng" : "Nghe đoạn hội thoại"}
      </button>
      <div className="script-speech-rate" role="group" aria-label="Tốc độ phát">
        {RATES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={rate === value}
            disabled={playing && !audioUrl}
            onClick={() => setRate(value)}
          >
            {value}x
          </button>
        ))}
      </div>
      {!supported && (
        <p role="status" className="script-speech-message">
          Trình duyệt chưa hỗ trợ phát âm tiếng Nhật.
        </p>
      )}
      {message && (
        <p role="status" className="script-speech-message">
          {message}
        </p>
      )}
    </div>
  );
}
