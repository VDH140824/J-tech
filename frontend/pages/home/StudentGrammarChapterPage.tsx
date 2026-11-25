import { useQueries } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentGrammarLesson } from "../../api/studentGrammarApi";
import "./StudentKanjiFlashcards.css";
import "./StudentGrammar.css";

// Group published grammar lessons by the moderator's lesson number.
export function StudentGrammarChapterPage({
  chapterId,
  chapterNo,
  courseName,
  lessons,
  lessonNo,
  onLessonNo,
  onLesson,
  onBack,
}: {
  chapterId: number;
  chapterNo: number;
  courseName: string;
  lessons: LessonSummary[];
  lessonNo?: number;
  onLessonNo: (lessonNo: number) => void;
  onLesson: (lessonId: number) => void;
  onBack: () => void;
}) {
  const grammarLessons = lessons
    .filter((l) => l.skillType === "GRAMMAR" && l.status === "PUBLISHED" && l.chapterId === chapterId)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
  const lessonNumbers = [...new Set(grammarLessons.map((lesson) => lesson.lessonNo))]
    .sort((a, b) => a - b);
  const visibleLessons = grammarLessons.filter((lesson) => lesson.lessonNo === lessonNo);
  const [, setParams] = useSearchParams();
  // Mini test của từng bài ngữ pháp trong nhóm (cùng cache với trang bài học)
  const details = useQueries({
    queries: visibleLessons.map((lesson) => ({
      queryKey: ["student-grammar-lesson", lesson.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => getStudentGrammarLesson(lesson.id, signal),
    })),
  });
  const miniTests = visibleLessons.flatMap((lesson, index) => {
    const test = details[index]?.data?.miniTest;
    return test ? [{ lesson, test }] : [];
  });
  const openMiniTest = (lesson: LessonSummary) =>
    setParams({
      skill: "GRAMMAR",
      lessonNo: String(lesson.lessonNo),
      lessonId: String(lesson.id),
      grammarView: "test",
    });
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Quay lại chương
      </button>
      <p className="kanji-breadcrumb">
        {courseName} / Chương {chapterNo} / {lessonNo === undefined ? "Ngữ pháp" : `Bài ${lessonNo} / Ngữ pháp`}
      </p>
      <h2>Ngữ pháp · {lessonNo === undefined ? `Chương ${chapterNo}` : `Bài ${lessonNo}`}</h2>
      {lessonNo === undefined ? (
        !grammarLessons.length && <p role="status">Chương này chưa có bài ngữ pháp.</p>
      ) : !visibleLessons.length && (
        <p role="status">Bài {lessonNo} chưa có nội dung ngữ pháp được xuất bản.</p>
      )}
      <div className="kanji-content-grid">
        {lessonNo === undefined ? lessonNumbers.map((number) => (
          <button type="button" className="kanji-tile" key={number} onClick={() => onLessonNo(number)}>
            <div className="kanji-tile-banner grammar-banner-lesson">
              <small>NGỮ PHÁP</small>
              <strong>Bài {number}</strong>
              <span className="kanji-banner-symbol" aria-hidden="true">文法</span>
            </div>
            <div className="kanji-tile-body">
              <h4>Ngữ pháp bài {number}</h4>
              <small>{grammarLessons.filter((lesson) => lesson.lessonNo === number).length} bài ngữ pháp</small>
            </div>
          </button>
        )) : visibleLessons.map((lesson) => (
          <button type="button" className="kanji-tile" key={lesson.id} onClick={() => onLesson(lesson.id)}>
            <div className="kanji-tile-banner kanji-banner-document">
              <small>NGỮ PHÁP · BÀI {lesson.lessonNo}</small>
              <strong>TÀI LIỆU &amp; BÀI TẬP</strong>
              <span className="kanji-banner-symbol" aria-hidden="true">
                文法
              </span>
            </div>
            <div className="kanji-tile-body">
              <h4>{lesson.title}</h4>
              <small>Tài liệu · Bài tập</small>
            </div>
          </button>
        ))}
        {lessonNo !== undefined && miniTests.map(({ lesson, test }) => {
          const best = test.attempts.reduce<number | null>(
            (max, a) => (a.score === null ? max : Math.max(max ?? 0, Number(a.score))), null);
          const passed = test.attempts.some((a) => a.passed);
          return (
            <button type="button" className="kanji-tile" key={`test-${lesson.id}`} onClick={() => openMiniTest(lesson)}>
              <div className="kanji-tile-banner kanji-banner-test">
                <strong>MINI TEST</strong>
              </div>
              <div className="kanji-tile-body">
                <h4>{test.title}</h4>
                <small>
                  {test.questionCount} câu · {test.durationMinutes} phút
                  {test.inProgressAttemptId
                    ? " · Đang làm dở"
                    : best !== null
                      ? ` · Cao nhất ${Math.round(best)} điểm${passed ? " · Đã đạt" : ""}`
                      : " · Chưa làm"}
                </small>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
