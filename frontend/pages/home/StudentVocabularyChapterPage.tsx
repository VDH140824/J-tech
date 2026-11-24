import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentVocabularyChapterTest } from "../../api/vocabularyChapterTestApi";
import "./StudentKanjiFlashcards.css";

export function StudentVocabularyChapterPage({
  chapterId,
  chapterNo,
  lessonNo,
  lessons,
  onLesson,
  onOpen,
  onBack,
}: {
  chapterId: number;
  chapterNo: number;
  lessonNo?: number;
  lessons: LessonSummary[];
  onLesson: (id: number) => void;
  onOpen: (view: "flashcards" | "test") => void;
  onBack: () => void;
}) {
  const test = useQuery({
    queryKey: ["student-vocabulary-chapter-test", chapterId],
    queryFn: ({ signal }) => getStudentVocabularyChapterTest(chapterId, signal),
    refetchOnMount: "always",
    retry: false,
    enabled: lessonNo === undefined,
  });
  const testUnavailable = isAxiosError(test.error) && test.error.response?.status === 404;
  const visibleLessons = lessons.filter((lesson) =>
    lesson.skillType === "VOCABULARY" &&
    lesson.status === "PUBLISHED" &&
    (lessonNo === undefined || lesson.lessonNo === lessonNo),
  );

  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Quay lại chương
      </button>
      <h2>
        {lessonNo === undefined
          ? `Từ vựng · Chương ${chapterNo}`
          : `Từ vựng · Bài ${lessonNo} · Chương ${chapterNo}`}
      </h2>
      {lessonNo !== undefined && visibleLessons.length === 0 && (
        <p role="status">Bài {lessonNo} chưa có từ vựng được xuất bản.</p>
      )}
      <div className="kanji-content-grid">
        {visibleLessons.map((lesson) => (
            <button
              type="button"
              className="kanji-tile"
              key={lesson.id}
              onClick={() => onLesson(lesson.id)}
            >
              <div className="kanji-tile-banner kanji-banner-content">
                <small>TỪ VỰNG</small>
                <strong>Bài {lesson.lessonNo}</strong>
              </div>
              <div className="kanji-tile-body">
                <h4>{lesson.title}</h4>
                <small>Bài học · Tài liệu · Exercise</small>
              </div>
            </button>
        ))}
        {lessonNo === undefined && (
          <button type="button" className="kanji-tile" onClick={() => onOpen("flashcards")}>
            <div className="kanji-tile-banner kanji-banner-flashcard">
              <strong>FLASHCARD TOÀN CHƯƠNG</strong>
              <span className="kanji-tile-tag">TỪ VỰNG</span>
            </div>
            <div className="kanji-tile-body">
              <h4>Flashcard từ vựng chương {chapterNo}</h4>
              <small>Tổng hợp từ các bài Vocab đã xuất bản</small>
            </div>
          </button>
        )}
        {lessonNo === undefined && test.isSuccess && test.data.questions.length > 0 && (
          <button type="button" className="kanji-tile" onClick={() => onOpen("test")}>
            <div className="kanji-tile-banner kanji-banner-test">
              <strong>TEST CHƯƠNG</strong>
            </div>
            <div className="kanji-tile-body">
              <h4>Test từ vựng chương {chapterNo}</h4>
              <small>{test.data.questions.length} câu · {test.data.durationMinutes} phút</small>
            </div>
          </button>
        )}
      </div>
      {lessonNo === undefined && test.isError && !testUnavailable && (
        <p role="alert">
          Không thể kiểm tra test từ vựng chương. {" "}
          <button type="button" onClick={() => void test.refetch()}>
            Thử lại
          </button>
        </p>
      )}
    </section>
  );
}
