import { useQuery } from "@tanstack/react-query";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentKanjiTests } from "../../api/studentKanjiApi";
import { parseLessonDocuments } from "../../utils/lessonDocuments";
import "./StudentKanjiFlashcards.css";

export function StudentKanjiChapterPage({
  chapterId,
  chapterNo,
  lessons,
  onDocument,
  onOpen,
  onBack,
}: {
  chapterId: number;
  chapterNo: number;
  lessons: LessonSummary[];
  onDocument: (lessonId: number, documentIndex: number) => void;
  onOpen: (view: "flashcards" | "test") => void;
  onBack: () => void;
}) {
  const tests = useQuery({
    queryKey: ["student-chapter-kanji-tests", chapterId],
    queryFn: ({ signal }) => getStudentKanjiTests(chapterId, signal),
    refetchOnMount: "always",
  });
  const documents = lessons
    .filter(lesson => lesson.skillType === "KANJI" && lesson.status === "PUBLISHED" && lesson.chapterId === chapterId)
    .flatMap(lesson => parseLessonDocuments(lesson.documents).map((document, index) => ({
      ...document, lessonId: lesson.id, documentIndex: index,
    })));
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Quay lại chương
      </button>
      <h2>Chữ Hán · Chương {chapterNo}</h2>
      {!documents.length && <p role="status">Chương này chưa có tài liệu Kanji.</p>}
      <div className="kanji-content-grid">
        {documents.map(document => (
            <button
              type="button"
              className="kanji-tile"
              key={`${document.lessonId}-${document.url}`}
              onClick={() => onDocument(document.lessonId, document.documentIndex)}
            >
              <div className="kanji-tile-banner kanji-banner-content">
                <small>TÀI LIỆU KANJI</small>
                <strong aria-hidden="true">文</strong>
              </div>
              <div className="kanji-tile-body">
                <h4>{document.name}</h4>
                <small>Đọc tài liệu</small>
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
            <small>Ôn tập các chữ Hán trong chương</small>
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
