import { useQuery } from "@tanstack/react-query";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentKanjiCards, getStudentKanjiExercises } from "../../api/studentKanjiApi";
import { getPdfPreviewUrl, parseLessonDocuments } from "../../utils/lessonDocuments";
import "./StudentKanjiFlashcards.css";

export function StudentKanjiContentPage({
  lesson,
  kanjiId,
  documentIndex,
  onBack,
  onExercise,
}: {
  lesson: LessonSummary;
  kanjiId: string | null;
  documentIndex: string | null;
  onBack: () => void;
  onExercise: () => void;
}) {
  const documents = parseLessonDocuments(lesson.documents);
  const isDocument = documentIndex !== null;
  const validDocument =
    isDocument &&
    /^\d+$/.test(documentIndex) &&
    Number.isSafeInteger(Number(documentIndex));
  const document = validDocument ? documents[Number(documentIndex)] : undefined;
  const isCloudinaryPdf = !!document && /^https:\/\/res\.cloudinary\.com\//i.test(document.url)
    && (/\.pdf(?:[?#]|$)/i.test(document.url) || /\.pdf$/i.test(document.name));
  const documentPreviewUrl = isCloudinaryPdf ? getPdfPreviewUrl(document.url) : document?.url;
  const query = useQuery({
    queryKey: ["student-kanji-flashcards", lesson.id],
    queryFn: ({ signal }) => getStudentKanjiCards(lesson.id, signal),
    enabled: !isDocument,
  });
  const card = query.data?.find((item) => String(item.id) === kanjiId);
  const roundSize = useQuery({
    queryKey: ["student-kanji-exercise-count", lesson.id],
    queryFn: async ({ signal }) => (await getStudentKanjiExercises(lesson.id, signal)).length,
    enabled: !!document,
    refetchOnWindowFocus: false,
  });
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Quay lại Chữ Hán
      </button>
      <p className="kanji-breadcrumb">
        {document?.name ?? "Chữ Hán"}
      </p>
      {document && <nav className="kanji-lesson-switch" aria-label="Nội dung tài liệu Kanji">
        <button type="button" aria-current="page"><span aria-hidden="true">📄</span>Tài liệu</button>
        <button type="button" onClick={onExercise}><span aria-hidden="true">✏️</span>Bài tập
          {roundSize.isSuccess && <span className="kanji-lesson-question-count">{roundSize.data} câu/lượt</span>}
        </button>
      </nav>}
      {isDocument ? (
        document ? (
          <article className="kanji-reading-panel kanji-document-reader">
            <h2>{document.name}</h2>
            <iframe
              key={documentPreviewUrl}
              className="kanji-document-frame"
              src={documentPreviewUrl}
              title={document.name}
              sandbox={isCloudinaryPdf ? undefined : "allow-scripts allow-same-origin allow-popups"}
              referrerPolicy="no-referrer"
            />
          </article>
        ) : (
          <p role="alert">Tài liệu đã được gỡ hoặc đường dẫn không còn hợp lệ.</p>
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
