import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import axios from "axios";
import {
  getChapterKanjiCards,
  saveStudentKanjiProgress,
  type ChapterKanjiCard,
} from "../../api/studentKanjiApi";
import { JapaneseAudioButton } from "../../components/learning/JapaneseAudioButton";

// Structured lines: Japanese word | kana reading | Vietnamese meaning.
// Unstructured legacy lines are kept verbatim, and never passed to speech synthesis.
function examplesFrom(text: string | null) {
  return (text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const structured = parts.length === 3 && parts[0] && parts[1] && parts[2];
      const word = structured ? parts[0] : line;
      const reading = structured ? parts[1] : "";
      const japanese =
        /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆ヶ\s・]+$/u;
      return {
        word,
        reading,
        meaning: structured ? parts.slice(2).join(" | ") : "",
        audio: japanese.test(reading || word) ? reading || word : "",
      };
    });
}

export function StudentKanjiFlashcards({
  chapterId,
  onBack,
  readOnly = false,
}: {
  chapterId: number;
  readOnly?: boolean;
  onBack: () => void;
}) {
  const client = useQueryClient();
  const queryKey = [
    readOnly ? "moderator-chapter-kanji-cards" : "student-chapter-kanji-cards",
    chapterId,
  ];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getChapterKanjiCards(chapterId, signal, readOnly),
  });
  const [deck, setDeck] = useState<ChapterKanjiCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const cards = query.data || [];
  const remembered = cards.filter((card) => card.remembered).length;
  const current = deck?.[index];
  const start = (mode: "all" | "remembered" | "new") => {
    setDeck(
      cards.filter(
        (card) => mode === "all" || card.remembered === (mode === "remembered"),
      ),
    );
    setIndex(0);
    setFlipped(false);
    setError("");
  };
  const move = (next: number) => {
    setIndex(next);
    setFlipped(false);
    setError("");
  };
  const mark = async (value: boolean) => {
    if (readOnly || !current || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await saveStudentKanjiProgress(chapterId, current.id, value);
      client.setQueryData<ChapterKanjiCard[]>(queryKey, (previous) =>
        previous?.map((card) =>
          card.id === current.id ? { ...card, remembered: value } : card,
        ),
      );
      setDeck(
        (previous) =>
          previous?.map((card) =>
            card.id === current.id ? { ...card, remembered: value } : card,
          ) || null,
      );
      setIndex((previous) => previous + 1);
      setFlipped(false);
    } catch {
      setError(
        "Chưa lưu được trạng thái. Thẻ vẫn được giữ lại để bạn thử lại.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (query.isPending) return <p role="status">Đang tải flashcard Kanji…</p>;
  if (query.isError)
    return (
      <div role="alert">
        <p>Không thể tải flashcard của chương.</p>
        <p>
          {axios.isAxiosError(query.error)
            ? query.error.response?.status === 404
              ? "Không tìm thấy API hoặc chương khả dụng. Nếu vừa cập nhật code, hãy khởi động lại backend rồi thử lại."
              : query.error.response?.status === 403
                ? "Tài khoản hiện tại không có quyền xem flashcard này."
                : query.error.response?.status === 401
                  ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                  : !query.error.response
                    ? "Không kết nối được backend. Hãy kiểm tra backend đang chạy và kết nối mạng."
                    : "Máy chủ không xử lý được yêu cầu tải flashcard. Vui lòng thử lại hoặc kiểm tra log backend."
            : "Dữ liệu trả về không hợp lệ. Vui lòng thử lại."}
        </p>
        <button onClick={() => query.refetch()}>Thử lại</button>
        <button onClick={onBack}>
          {readOnly ? "Quay lại chương" : "Quay lại Chữ Hán"}
        </button>
      </div>
    );

  return (
    <div className="kanji-flashcards">
      <button
        type="button"
        className="kanji-text-button"
        disabled={saving}
        onClick={onBack}
      >
        ← {readOnly ? "Quay lại chương" : "Quay lại Chữ Hán"}
      </button>
      {deck && current && (
        <button
          type="button"
          className="kanji-text-button"
          disabled={saving}
          onClick={() => setDeck(null)}
        >
          Chọn nhóm thẻ
        </button>
      )}
      {!deck ? (
        <>
          <h3>Ôn tập Kanji toàn chương</h3>
          <div className="kanji-mode-grid">
            <div className="kanji-mode kanji-mode-new">
              <h4>Từ chưa nhớ</h4>
              <p>({cards.length - remembered} chữ)</p>
              <button
                type="button"
                disabled={cards.length === remembered}
                onClick={() => start("new")}
              >
                HỌC NGAY
              </button>
            </div>
            <div className="kanji-mode kanji-mode-known">
              <h4>Từ đã nhớ</h4>
              <p>({remembered} chữ)</p>
              <button
                type="button"
                disabled={!remembered}
                onClick={() => start("remembered")}
              >
                HỌC LẠI
              </button>
            </div>
          </div>
          <button
            type="button"
            className="kanji-all"
            disabled={!cards.length}
            onClick={() => start("all")}
          >
            HỌC TẤT CẢ KANJI ({cards.length} CHỮ)
          </button>
          {!cards.length && (
            <p role="status">Chương chưa có Kanji được xuất bản.</p>
          )}
        </>
      ) : !current ? (
        <div className="kanji-complete">
          <h3>Bạn đã xem hết {deck.length} thẻ!</h3>
          <p>
            Đã nhớ {remembered}/{cards.length} chữ trong chương.
          </p>
          <button
            type="button"
            className="kanji-primary"
            onClick={() => setDeck(null)}
          >
            Chọn nhóm để ôn tiếp
          </button>
        </div>
      ) : (
        <>
          <div className="kanji-study-counts" aria-live="polite">
            <span>Chưa nhớ: {cards.length - remembered}</span>
            <strong>
              {index + 1} / {deck.length}
            </strong>
            <span>Đã nhớ: {remembered}</span>
          </div>
          <article
            className={`kanji-study-card ${flipped ? "is-flipped" : ""}`}
            tabIndex={saving ? -1 : 0}
            aria-disabled={saving}
            aria-label={flipped ? "Mặt sau flashcard" : "Mặt trước flashcard"}
            aria-describedby="kanji-card-flip-hint"
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (saving || target.closest("button, a, input, select, textarea")) return;
              if (window.getSelection()?.toString()) return;
              setFlipped(value => !value);
            }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || saving) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setFlipped(value => !value);
              }
            }}
          >
            {!flipped ? (
              <div className="kanji-front">
                <div className="kanji-character-audio">
                  <h3 lang="ja">{current.characterText}</h3>
                  <JapaneseAudioButton text={current.characterText} />
                </div>
                <p className="kanji-sino">
                  {current.sinoVietnamese || "Chưa có âm Hán Việt"}
                </p>
                <p className="kanji-hint">
                  Bấm vào thẻ để xem nghĩa, ví dụ và cách nhớ
                </p>
              </div>
            ) : (
              <div className={`kanji-back kanji-back-layout ${current.imageUrl ? "kanji-back-layout--illustrated" : ""}`}>
                <div className="kanji-back-details">
                <div className="kanji-character-audio">
                  <h3>{current.sinoVietnamese || current.characterText}</h3>
                  <span lang="ja">{current.characterText}</span>
                  <JapaneseAudioButton text={current.characterText} />
                </div>
                <p className="kanji-meaning">{current.meaningVi}</p>
                {(current.onyomi || current.kunyomi) && <dl className="kanji-card-readings">
                  {current.onyomi && <div><dt>Âm On</dt><dd lang="ja">{current.onyomi}</dd></div>}
                  {current.kunyomi && <div><dt>Âm Kun</dt><dd lang="ja">{current.kunyomi}</dd></div>}
                </dl>}
                <h4>Ví dụ</h4>
                {examplesFrom(current.examples).length ? (
                  <ol className="kanji-examples">
                    {examplesFrom(current.examples).map((example, i) => (
                      <li key={i}>
                        <span lang={example.meaning ? "ja" : undefined}>
                          {example.word}
                        </span>
                        {example.reading && (
                          <small lang="ja"> ({example.reading})</small>
                        )}
                        {example.audio && (
                          <JapaneseAudioButton text={example.audio} />
                        )}
                        {example.meaning && <p>{example.meaning}</p>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>Chưa có từ ví dụ.</p>
                )}
                {!current.imageUrl && current.mnemonicStory && <section className="kanji-mnemonic">
                  <h4>Cách nhớ</h4><p>{current.mnemonicStory}</p>
                </section>}
                </div>
                {current.imageUrl && (
                  <section className="kanji-mnemonic">
                    <h4>Ảnh minh họa</h4>
                      <img
                        src={current.imageUrl}
                        alt={`Ảnh gợi nhớ chữ ${current.characterText}`}
                        loading="lazy"
                      />
                    {current.mnemonicStory && <><h4>Cách nhớ</h4><p>{current.mnemonicStory}</p></>}
                  </section>
                )}
              </div>
            )}
            <p id="kanji-card-flip-hint" className="kanji-hint kanji-card-flip-hint">
            {flipped ? "xem mặt trước" : "lật thẻ"}
            </p>
          </article>
          {error && (
            <p role="alert" className="kanji-error">
              {error}
            </p>
          )}
          {!readOnly && (
            <div className="kanji-review-actions">
              <button
                type="button"
                className="kanji-not-remembered"
                disabled={saving}
                onClick={() => void mark(false)}
              >
                Chưa nhớ
              </button>
              <button
                type="button"
                className="kanji-remembered"
                disabled={saving}
                onClick={() => void mark(true)}
              >
                Đã nhớ
              </button>
            </div>
          )}
          <div className="kanji-navigation">
            <button
              type="button"
              disabled={saving || index === 0}
              onClick={() => move(index - 1)}
            >
              ← Thẻ trước
            </button>
            <span aria-live="polite">
              {saving
                ? "Đang lưu…"
                : current.remembered
                  ? "Đã đánh dấu nhớ"
                  : "Chưa nhớ"}
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={() => move(index + 1)}
            >
              {index === deck.length - 1 ? "Kết thúc lượt" : "Thẻ tiếp →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
