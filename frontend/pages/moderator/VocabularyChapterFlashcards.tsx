import { useEffect, useState } from "react";
import { getChapterVocabularyCards, type ChapterVocabularyCard } from "../../api/vocabularyApi";
import { miniTestError } from "../../api/vocabularyMiniTestApi";
import { VocabularyPronunciation } from "./VocabularyPronunciation";
import "./VocabularyMiniTests.css";

interface Props { chapterId: number; chapterNo: number; courseName: string; onBack: () => void; }
export function VocabularyChapterFlashcards({ chapterId, chapterNo, courseName, onBack }: Props) {
  const [cards, setCards] = useState<ChapterVocabularyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [lessonFilter, setLessonFilter] = useState("ALL");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    getChapterVocabularyCards(chapterId, controller.signal).then(data => { if (!controller.signal.aborted) { setCards(data); setIndex(0); setFlipped(false); } })
      .catch(failure => { if (!controller.signal.aborted) setError(miniTestError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [chapterId, retry]);
  const visible = cards.filter(card => lessonFilter === "ALL" || String(card.lessonId) === lessonFilter);
  const card = visible[index];
  const lessons = [...new Map(cards.map(item => [item.lessonId, { id: item.lessonId, no: item.lessonNo, title: item.lessonTitle }])).values()].sort((left, right) => left.no - right.no);
  const move = (value: number) => { setIndex(value); setFlipped(false); };
  const shuffle = () => {
    const next = [...cards];
    for (let position = next.length - 1; position > 0; position--) {
      const selected = Math.floor(Math.random() * (position + 1));
      [next[position], next[selected]] = [next[selected], next[position]];
      
    }
    setCards(next); move(0);
  };
  return <div className="admin-page-container">
    <div className="mod-chapter-back-row"><button className="mod-btn-back" onClick={onBack}>← Danh sách bài Vocab</button><span className="mod-chapter-breadcrumb-pill">{courseName} / Chương {chapterNo} / Flashcard</span></div>
    <div className="admin-page-header"><div className="admin-header-titles"><h2 className="admin-main-title">Flashcard từ vựng chương {chapterNo}</h2><p className="admin-main-subtitle">Tổng hợp từ vựng từ tất cả bài Vocab của chương, không cần tạo bộ thẻ riêng cho từng bài.</p></div></div>
    {loading ? <div className="admin-loading-state" role="status"><div className="admin-loading-spinner" /><p>Đang tải flashcard...</p></div> : error ? <div className="mod-mini-error" role="alert">{error}<button className="mod-btn-back" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : <>
      <div className="mod-section-toolbar"><select className="mod-toolbar-select" aria-label="Lọc flashcard theo bài" value={lessonFilter} onChange={event => { setLessonFilter(event.target.value); move(0); }}><option value="ALL">Tất cả bài trong chương ({cards.length} từ)</option>{lessons.map(lesson => <option key={lesson.id} value={lesson.id}>Bài {lesson.no}: {lesson.title}</option>)}</select><button className="mod-btn-back" disabled={!visible.length} onClick={shuffle}>Trộn thẻ</button></div>
      {!card ? <div className="admin-table-card admin-empty-state"><h3>Chưa có từ vựng</h3><p>Gán từ vựng cho các bài trong chương để hiển thị flashcard.</p></div> : <div className="mod-chapter-flashcards"><p>Bài {card.lessonNo}: {card.lessonTitle} · Thẻ {index + 1}/{visible.length}</p><button className={`mod-chapter-flashcard ${flipped ? "flipped" : ""}`} aria-label={flipped ? "Mặt sau, nhấn để xem từ vựng" : "Mặt trước, nhấn để xem định nghĩa"} onClick={() => setFlipped(value => !value)} onKeyDown={event => {
        if (event.key === "ArrowRight" && index < visible.length - 1) { event.preventDefault(); move(index + 1); }
        if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); move(index - 1); }
      }}><span className="mod-chapter-flashcard-caption">{flipped ? "ĐỊNH NGHĨA" : "THUẬT NGỮ"}</span><strong>{flipped ? card.meaningVi : card.word}</strong>{!flipped && <span>{card.reading}</span>}{flipped && card.exampleJp && <span>{card.exampleJp}<br />{card.exampleVi}</span>}<small>Nhấn để lật thẻ</small></button><VocabularyPronunciation key={card.id} word={card.word} reading={card.reading} />{card.audioUrl && <audio key={card.id} aria-label={`Phát âm ${card.word}`} controls preload="none" src={card.audioUrl} />}<div className="mod-chapter-flashcard-actions"><button className="mod-btn-back" disabled={index === 0} onClick={() => move(index - 1)}>← Thẻ trước</button><button className="mod-btn-back" onClick={() => setFlipped(value => !value)}>Lật thẻ</button><button className="mod-btn-back" disabled={index >= visible.length - 1} onClick={() => move(index + 1)}>Thẻ sau →</button></div></div>}
    </>}
  </div>;
}
