import type { LessonSummary } from "../../api/lessonApi";
import { parseLessonDocuments } from "../../utils/lessonDocuments";
import "./StudentKanjiFlashcards.css";

export function StudentKanjiLessonPage({
  lesson,
  courseName,
  chapterNo,
  onBack,
  onOpen,
}: {
  lesson: LessonSummary;
  courseName: string;
  chapterNo: number;
  onBack: () => void;
  onOpen: (view: "content", kanjiId?: number, document?: number) => void;
}) {
  const documents = parseLessonDocuments(lesson.documents);
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Quay lại chương
      </button>
      <p className="kanji-breadcrumb">
        {courseName} / Chương {chapterNo} / Kanji
      </p>
      <h2>Tài liệu Kanji</h2>
      <div className="kanji-content-grid">
        {documents.map((document, index) => (
          <button
            type="button"
            className="kanji-tile"
            key={document.url}
            onClick={() => onOpen("content", undefined, index)}
          >
            <div className="kanji-tile-banner kanji-banner-document">
              <small>TÀI LIỆU KANJI</small>
              <strong>TÀI LIỆU</strong>
              <span className="kanji-banner-symbol" aria-hidden="true">
                文
              </span>
            </div>
            <div className="kanji-tile-body">
              <h4>{document.name}</h4>
              <small>▱ Đọc tài liệu</small>
            </div>
          </button>
        ))}
      </div>
      {!documents.length && (
        <p role="status">Mục này hiện không có tài liệu Kanji.</p>
      )}
    </section>
  );
}
