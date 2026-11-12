import { useQuery } from "@tanstack/react-query";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentKanjiCards } from "../../api/studentKanjiApi";
import { parseLessonDocuments } from "../../utils/lessonDocuments";
import "./StudentKanjiFlashcards.css";

export function StudentKanjiContentPage({
  lesson,
  kanjiId,
  documentIndex,
  onBack,
}: {
  lesson: LessonSummary;
  kanjiId: string | null;
  documentIndex: string | null;
  onBack: () => void;
}) {
  const documents = parseLessonDocuments(lesson.documents);
  const isDocument = documentIndex !== null;
  const validDocument =
    isDocument &&
    /^\d+$/.test(documentIndex) &&
    Number.isSafeInteger(Number(documentIndex));
  const document = validDocument ? documents[Number(documentIndex)] : undefined;
  const query = useQuery({
    queryKey: ["student-kanji-flashcards", lesson.id],
    queryFn: ({ signal }) => getStudentKanjiCards(lesson.id, signal),
    enabled: !isDocument,
  });
  const card = query.data?.find((item) => String(item.id) === kanjiId);
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Chữ Hán · Bài {lesson.lessonNo}
      </button>
      <p className="kanji-breadcrumb">
        Bài {lesson.lessonNo}: {lesson.title}
      </p>
      {isDocument ? (
        document ? (
          <article className="kanji-reading-panel">
            <h2>{document.name}</h2>
            <a href={document.url} target="_blank" rel="noopener noreferrer">
              Mở tài liệu trong tab mới ↗
            </a>
            <iframe
              className="kanji-document-frame"
              src={document.url}
              title={document.name}
              sandbox="allow-scripts allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
            />
            <p>Nếu tài liệu không hiển thị, hãy mở bằng liên kết phía trên.</p>
          </article>
        ) : (
          <p role="alert">Tài liệu không tồn tại trong bài học này.</p>
        )
      ) : query.isPending ? (
        <p role="status">Đang tải bài học…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>Không thể tải bài học.</p>
          <button type="button" onClick={() => query.refetch()}>
            Thử lại
          </button>
        </div>
      ) : !card ? (
        <p role="alert">
          Nội dung không tồn tại trong bài học này hoặc chưa được xuất bản.
        </p>
      ) : (
        <article className="kanji-reading-panel">
          <header>
            <h2 lang="ja" className="kanji-reading-character">
              {card.characterText}
            </h2>
            <h3>{card.sinoVietnamese}</h3>
            <p>{card.meaningVi}</p>
          </header>
          <dl className="kanji-reading-details">
            <div>
              <dt>Âm On</dt>
              <dd lang="ja">{card.onyomi || "—"}</dd>
            </div>
            <div>
              <dt>Âm Kun</dt>
              <dd lang="ja">{card.kunyomi || "—"}</dd>
            </div>
          </dl>
          <h3>Ví dụ</h3>
          <div className="kanji-reading-examples">
            {card.examples ? (
              card.examples
                .split(/\r?\n/)
                .filter((line) => line.trim())
                .map((line, index) => {
                  const parts = line.split("|").map((part) => part.trim());
                  return (
                    <p key={index}>
                      {parts.length === 3 ? (
                        <>
                          <span lang="ja">
                            {parts[0]} ({parts[1]})
                          </span>{" "}
                          — {parts[2]}
                        </>
                      ) : (
                        line
                      )}
                    </p>
                  );
                })
            ) : (
              <p>Chưa có ví dụ.</p>
            )}
          </div>
          {card.mnemonicStory && (
            <>
              <h3>Cách nhớ</h3>
              <p className="kanji-preserve-lines">{card.mnemonicStory}</p>
            </>
          )}
        </article>
      )}
    </section>
  );
}
