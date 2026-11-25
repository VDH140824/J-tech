import type { StudentGrammarLesson } from "../../api/studentGrammarApi";
import "./StudentKanjiFlashcards.css";
import "./StudentGrammar.css";

// Material Grammar: các điểm ngữ pháp đã xuất bản của bài học
// embedded: hiện trong tab "Tài liệu" của trang bài học (không có nút quay lại, tiêu đề riêng)
// onExercise: mở tab Bài tập (bài được tính hoàn thành khi nộp bài tập)
export function StudentGrammarMaterial({
  lesson,
  onBack,
  onExercise,
  embedded = false,
}: {
  lesson: StudentGrammarLesson;
  onBack?: () => void;
  onExercise?: () => void;
  embedded?: boolean;
}) {
  return (
    <section className={embedded ? "grammar-tab-panel" : "student-kanji-page"}>
      {!embedded && (
        <>
          <button type="button" className="kanji-text-button" onClick={onBack}>
            ← Quay lại {lesson.title}
          </button>
          <p className="kanji-breadcrumb">
            {lesson.courseName} / Chương {lesson.chapterNo} / Ngữ pháp / Tài liệu
          </p>
          <h2>Tài liệu ngữ pháp</h2>
        </>
      )}
      {!lesson.grammars.length && <p role="status">Bài học chưa có điểm ngữ pháp được xuất bản.</p>}
      {lesson.grammars.map((g, index) => (
        <article className="kanji-reading-panel grammar-point" key={g.id}>
          <header>
            <span className="grammar-point-no">Mẫu {index + 1}</span>
            <h3 lang="ja" className="grammar-structure">
              {g.structureName}
            </h3>
            {g.meaningVi && <p className="grammar-meaning">{g.meaningVi}</p>}
          </header>
          {g.usageExplanation && (
            <>
              <h4>Cách dùng</h4>
              <p className="kanji-preserve-lines">{g.usageExplanation}</p>
            </>
          )}
          {(g.exampleJp || g.exampleVi) && (
            <>
              <h4>Ví dụ</h4>
              <div className="kanji-reading-examples">
                {(g.exampleJp ?? "").split(/\r?\n/).map((line, i) => {
                  const vi = (g.exampleVi ?? "").split(/\r?\n/)[i];
                  if (!line.trim() && !vi?.trim()) return null;
                  return (
                    <p key={i}>
                      <span lang="ja">{line}</span>
                      {vi ? <> — {vi}</> : null}
                    </p>
                  );
                })}
              </div>
            </>
          )}
          {g.videoUrl && (
            <>
              <h4>Video bài giảng</h4>
              <video className="grammar-video" src={g.videoUrl} controls preload="metadata" />
            </>
          )}
        </article>
      ))}
      {lesson.grammars.length > 0 && lesson.exerciseCount > 0 && (
        <div className={`grammar-progress-note ${lesson.completed ? "is-done" : ""}`} role="status">
          {lesson.completed ? (
            <p>
              ✓ Bạn đã hoàn thành bài này
              {lesson.bestExerciseScore !== null && ` · Điểm bài tập cao nhất: ${Math.round(Number(lesson.bestExerciseScore))}`}
            </p>
          ) : (
            <p>Làm và nộp bài tập để hoàn thành bài này.</p>
          )}
          {onExercise && (
            <button type="button" onClick={onExercise}>
              {lesson.completed ? "Ôn lại bài tập →" : "Làm bài tập →"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
