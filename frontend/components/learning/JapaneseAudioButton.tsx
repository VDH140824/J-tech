import { useEffect, useRef, useState } from "react";

export function JapaneseAudioButton({ text }: { text: string }) {
  const [message, setMessage] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;
  useEffect(
    () => () => {
      if (utterance.current && supported) {
        utterance.current = null;
        window.speechSynthesis.cancel();
      }
    },
    [text, supported],
  );

  const speak = () => {
    if (!supported) return;
    setMessage("");
    const synthesis = window.speechSynthesis;
    const voice = synthesis
      .getVoices()
      .find((v) => /^ja(?:[-_]|$)/i.test(v.lang));
    if (!voice) {
      setMessage(
        "Thiết bị chưa có giọng tiếng Nhật. Hãy bật hoặc cài giọng tiếng Nhật rồi thử lại.",
      );
      return;
    }
    synthesis.cancel();
    const next = new SpeechSynthesisUtterance(text);
    next.lang = "ja-JP";
    next.voice = voice;
    utterance.current = next;
    next.onerror = (event) => {
      if (
        utterance.current === next &&
        !["canceled", "interrupted"].includes(event.error)
      )
        setMessage("Không phát được tiếng Nhật. Vui lòng thử lại.");
    };
    try {
      synthesis.speak(next);
    } catch {
      setMessage("Không phát được tiếng Nhật. Vui lòng thử lại.");
    }
  };
  return (
    <span className="kanji-audio">
      <button
        type="button"
        disabled={!supported || !text.trim()}
        title={supported ? `Nghe ${text}` : "Trình duyệt chưa hỗ trợ phát âm"}
        aria-label={`Nghe phát âm ${text}`}
        onClick={(event) => {
          event.stopPropagation();
          speak();
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </svg>
      </button>
      {message && (
        <span role="status" className="kanji-audio-message">
          {message}
        </span>
      )}
    </span>
  );
}
