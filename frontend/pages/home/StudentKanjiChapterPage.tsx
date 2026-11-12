import { useQuery } from "@tanstack/react-query";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentKanjiTests } from "../../api/studentKanjiApi";
import "./StudentKanjiFlashcards.css";

export function StudentKanjiChapterPage({
  chapterId,
  chapterNo,
  lessons,
  onLesson,
  onOpen,
  onBack,
}: {
  chapterId: number;
  chapterNo: number;
  lessons: LessonSummary[];
  onLesson: (id: number) => void;
  onOpen: (view: "flashcards" | "test") => void;
  onBack: () => void;
}) {
  const tests = useQuery({
    queryKey: ["student-chapter-kanji-tests", chapterId],
    queryFn: ({ signal }) => getStudentKanjiTests(chapterId, signal),
    refetchOnMount: "always",
  });
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Chọn kỹ năng
      </button>
      <h2>Chữ Hán · Chương {chapterNo}</h2>
      <div className="kanji-content-grid">
        {lessons
          .filter((l) => l.skillType === "KANJI" && l.status === "PUBLISHED")
          .map((l) => (
            <button
              type="button"
              className="kanji-tile"
              key={l.id}
              onClick={() => onLesson(l.id)}
            >
              <div className="kanji-tile-banner kanji-banner-content">
                <small>CHỮ HÁN</small>
                <strong>Bài {l.lessonNo}</strong>
              </div>
              <div className="kanji-tile-body">
                <h4>{l.title}</h4>
                <small>Bài học · Tài liệu</small>
              </div>
            </button>
          ))}
        <button
          type="button"
          className="kanji-tile"
          onClick={() => onOpen("flashcards")}
        >
          <div className="kanji-tile-banner kanji-banner-flashcard">
            <strong>
              FLASHCARD
              <br />
              TOÀN CHƯƠNG
            </strong>
            <span className="kanji-tile-tag">KANJI</span>
          </div>
          <div className="kanji-tile-body">
            <h4>Flashcard chữ Hán chương {chapterNo}</h4>
            <small>Tổng hợp từ các bài đã xuất bản</small>
          </div>
        </button>
        {tests.isSuccess && !tests.isFetching && tests.data.length > 0 && (
          <button
            type="button"
            className="kanji-tile"
            onClick={() => onOpen("test")}
          >
            <div className="kanji-tile-banner kanji-banner-test">
              <strong>TEST CHƯƠNG</strong>
            </div>
            <div className="kanji-tile-body">
              <h4>Test chữ Hán chương {chapterNo}</h4>
              <small>{tests.data.length} Test đã xuất bản</small>
            </div>
          </button>
        )}
      </div>
      {tests.isError && (
        <p role="alert">
          Không thể kiểm tra Test khả dụng.{" "}
          <button onClick={() => tests.refetch()}>Thử lại</button>
        </p>
      )}
    </section>
  );
}
