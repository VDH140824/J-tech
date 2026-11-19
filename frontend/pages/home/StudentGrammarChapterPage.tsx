import type { LessonSummary } from "../../api/lessonApi";
import "./StudentKanjiFlashcards.css";
import "./StudentGrammar.css";

// Ngữ pháp · Chương: danh sách bài ngữ pháp đã xuất bản (giao diện giống Chữ Hán)
export function StudentGrammarChapterPage({
  chapterId,
  chapterNo,
  lessons,
  onLesson,
  onBack,
}: {
  chapterId: number;
  chapterNo: number;
  lessons: LessonSummary[];
  onLesson: (lessonId: number) => void;
  onBack: () => void;
}) {
  const grammarLessons = lessons
    .filter((l) => l.skillType === "GRAMMAR" && l.status === "PUBLISHED" && l.chapterId === chapterId)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.lessonNo - b.lessonNo);
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Quay lại chương
      </button>
      <h2>Ngữ pháp · Chương {chapterNo}</h2>
      {!grammarLessons.length && <p role="status">Chương này chưa có bài ngữ pháp.</p>}
      <div className="kanji-content-grid">
        {grammarLessons.map((lesson) => (
          <button type="button" className="kanji-tile" key={lesson.id} onClick={() => onLesson(lesson.id)}>
            <div className="kanji-tile-banner grammar-banner-lesson">
              <small>NGỮ PHÁP · BÀI {lesson.lessonNo}</small>
              <strong>{lesson.title.replace(/^Bài\s*\d+\s*[:.-]\s*/i, "")}</strong>
              <span className="kanji-banner-symbol" aria-hidden="true">
                文法
              </span>
            </div>
            <div className="kanji-tile-body">
              <h4>{lesson.title}</h4>
              <small>Tài liệu · Luyện tập · Mini test</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
