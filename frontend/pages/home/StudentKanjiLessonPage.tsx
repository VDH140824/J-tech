import { useQuery } from "@tanstack/react-query";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentKanjiCards } from "../../api/studentKanjiApi";
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
  const query = useQuery({
    queryKey: ["student-kanji-flashcards", lesson.id],
    queryFn: ({ signal }) => getStudentKanjiCards(lesson.id, signal),
  });
  const documents = parseLessonDocuments(lesson.documents);
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Quay lại chương
      </button>
      <p className="kanji-breadcrumb">
        {courseName} / Chương {chapterNo} / Bài {lesson.lessonNo}
      </p>
      <h2>Bài {lesson.lessonNo}</h2>
      <h3 className="kanji-section-title">
        Chữ Hán <span>{lesson.title}</span>
      </h3>
      {query.isPending ? (
        <p role="status">Đang tải nội dung Chữ Hán…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>Không thể tải nội dung bài học.</p>
          <button
            type="button"
            className="kanji-primary"
            onClick={() => query.refetch()}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="kanji-content-grid">
            {query.data.map((card) => (
              <button
                type="button"
                className="kanji-tile"
                key={card.id}
                onClick={() => onOpen("content", card.id)}
              >
                <div className="kanji-tile-banner kanji-banner-content">
                  <small>{card.sinoVietnamese || "CHỮ HÁN"}</small>
                  <strong lang="ja">{card.characterText}</strong>
                  <span className="kanji-banner-symbol" aria-hidden="true">
                    漢
                  </span>
                </div>
                <div className="kanji-tile-body">
                  <h4>
                    {card.characterText}
                    {card.sinoVietnamese ? ` · ${card.sinoVietnamese}` : ""}
                  </h4>
                  <p>{card.meaningVi}</p>
                  <small>▱ Bài học</small>
                </div>
              </button>
            ))}
            {documents.map((document, index) => (
              <button
                type="button"
                className="kanji-tile"
                key={document.url}
                onClick={() => onOpen("content", undefined, index)}
              >
                <div className="kanji-tile-banner kanji-banner-document">
                  <small>TÀI LIỆU BÀI {lesson.lessonNo}</small>
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
          {!query.data.length && !documents.length && (
            <p role="status">
              Bài này chưa có nội dung Chữ Hán hoặc tài liệu được xuất bản.
            </p>
          )}
        </>
      )}
    </section>
  );
}
