import { useEffect, useRef, useState } from "react";

interface Props { word: string; reading?: string | null; }

export function VocabularyPronunciation({ word, reading }: Props) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    const synthesis = window.speechSynthesis;
    const refresh = () => setVoices(synthesis.getVoices());
    refresh();
    synthesis.addEventListener("voiceschanged", refresh);
    return () => synthesis.removeEventListener("voiceschanged", refresh);
  }, [supported]);

  useEffect(() => {
    setError("");
    setSpeaking(false);
    return () => {
      if (current.current) {
        current.current = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [word, reading]);

  const stop = () => {
    current.current = null;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };
  const pronounce = (rate: number) => {
    if (!supported) return;
    stop();
    setError("");
    const utterance = new SpeechSynthesisUtterance(reading?.trim() || word.trim());
    utterance.lang = "ja-JP";
    utterance.rate = rate;
    const japaneseVoices = voices.filter(voice => /^ja(?:[-_]|$)/i.test(voice.lang));
    const voice = japaneseVoices.find(item => item.localService) || japaneseVoices[0];
    if (voices.length && !voice) {
      setError("Thiết bị chưa có giọng tiếng Nhật. Hãy cài giọng tiếng Nhật trong cài đặt ngôn ngữ của hệ điều hành rồi mở lại trình duyệt.");
      return;
    }
    if (voice) utterance.voice = voice;
    current.current = utterance;
    utterance.onend = () => {
      if (current.current !== utterance) return;
      current.current = null;
      setSpeaking(false);
    };
    utterance.onerror = event => {
      if (current.current !== utterance) return;
      current.current = null;
      setSpeaking(false);
      if (event.error !== "canceled" && event.error !== "interrupted") setError("Không phát được giọng tiếng Nhật. Hãy kiểm tra giọng đọc trên thiết bị và thử lại.");
    };
    setSpeaking(true);
    try { window.speechSynthesis.speak(utterance); }
    catch { current.current = null; setSpeaking(false); setError("Không thể khởi động giọng đọc trên trình duyệt này."); }
  };

  return <div className="mod-vocab-pronunciation">
    <div className="mod-chapter-flashcard-actions">
      <button type="button" className="mod-btn-back" disabled={!supported} onClick={() => pronounce(1)} aria-label={`Nghe phát âm ${word}`}>🔊 Nghe phát âm</button>
      <button type="button" className="mod-btn-back" disabled={!supported} onClick={() => pronounce(0.7)}>Nghe chậm</button>
      {speaking && <button type="button" className="mod-btn-back" onClick={stop}>Dừng đọc</button>}
    </div>
    <p aria-live="polite">{!supported ? "Trình duyệt này chưa hỗ trợ đọc văn bản. Hãy dùng Chrome hoặc Edge." : error || (speaking ? "Đang đọc tiếng Nhật…" : "Phát âm tiếng Nhật bằng giọng đọc của thiết bị.")}</p>
  </div>;
}
