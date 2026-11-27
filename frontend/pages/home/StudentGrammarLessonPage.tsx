import { useQuery } from "@tanstack/react-query";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentGrammarLesson, grammarError } from "../../api/studentGrammarApi";
import { parseLessonDocuments } from "../../utils/lessonDocuments";
import { StudentGrammarMaterial } from "./StudentGrammarMaterial";
import { StudentGrammarExercise } from "./StudentGrammarExercise";
import { StudentGrammarMiniTest } from "./StudentGrammarMiniTest";
import "./StudentKanjiFlashcards.css";
import "./StudentGrammar.css";

export type GrammarView = "material" | "exercise" | "test";

// Open lesson content directly; mini tests remain available as a separate screen.
export function StudentGrammarLessonPage({
  lesson,
  chapterNo,
  view,
  onOpen,
  onBack,
}: {
  lesson: LessonSummary;
  chapterNo: number;
  view: GrammarView | null;
  onOpen: (view: GrammarView | null) => void;
  onBack: () => void;
}) {
  const query = useQuery({
    queryKey: ["student-grammar-lesson", lesson.id],
    queryFn: ({ signal }) => getStudentGrammarLesson(lesson.id, signal),
    refetchOnMount: "always",
  });
  const documents = parseLessonDocuments(lesson.documents);
  const data = query.data;

  // Mini test: màn riêng, mở từ thẻ "Mini test" ở màn danh sách bài
  if (view === "test" && data?.miniTest) {
    return (
      <StudentGrammarMiniTest
        lesson={data}
        onBack={() => {
          // Mini test mở từ màn danh sách bài (ngoài) → quay lại màn đó
          onBack();
          void query.refetch();
        }}
      />
    );
  }

  const header = (
    <>
      <p className="kanji-breadcrumb">
        {data ? `${data.courseName} / Chương ${data.chapterNo} / Ngữ pháp` : `Chương ${chapterNo} / Ngữ pháp`}
      </p>
      <h2>{lesson.title}</h2>
      {lesson.description && <p className="grammar-lesson-description">{lesson.description}</p>}
    </>
  );

  if (query.isPending || query.isError || !data) {
    return (
      <section className="student-kanji-page">
        <button type="button" className="kanji-text-button" onClick={onBack}>
          ← Quay lại
        </button>
        {header}
        {query.isError ? (
          <div role="alert">
            <p>{grammarError(query.error, "Không thể tải bài học.")}</p>
            <button type="button" onClick={() => query.refetch()}>
              Thử lại
            </button>
          </div>
        ) : (
          <p role="status">Đang tải bài học…</p>
        )}
      </section>
    );
  }

  const tab: GrammarView = view === "exercise" ? "exercise" : "material";
  const tabs: ReadonlyArray<{ key: GrammarView; label: string; badge?: string }> = [
    { key: "material", label: "📄 Tài liệu" },
    { key: "exercise", label: "✎ Bài tập", badge: `${data.exerciseCount} câu` },
  ];
  return (
    <section className="student-kanji-page">
      <button type="button" className="kanji-text-button" onClick={onBack}>
        ← Quay lại ngữ pháp · Bài {lesson.lessonNo}
      </button>
      {header}
      <div
        className="grammar-lesson-tabs"
        role="tablist"
        aria-label="Nội dung bài học"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = tab === "material" ? "exercise" : "material";
          onOpen(next);
          window.document.getElementById(`grammar-${next}-tab`)?.focus();
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`grammar-${t.key}-tab`}
            type="button"
            role="tab"
            tabIndex={tab === t.key ? 0 : -1}
            aria-selected={tab === t.key}
            aria-controls="grammar-lesson-panel"
            className={tab === t.key ? "active" : ""}
            onClick={() => onOpen(t.key)}
          >
            {t.label}
            {t.badge && <span className="grammar-tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div id="grammar-lesson-panel" role="tabpanel" aria-labelledby={`grammar-${tab}-tab`}>
        {tab === "material" ? (
          <>
            {documents.length > 0 && (
              <div className="grammar-documents">
                <span>Tài liệu đính kèm:</span>
                {documents.map((document) => (
                  <a key={document.url} href={document.url} target="_blank" rel="noopener noreferrer">
                    📄 {document.name} ↗
                  </a>
                ))}
              </div>
            )}
            <StudentGrammarMaterial
              lesson={data}
              embedded
              onExercise={data.exerciseCount > 0 ? () => onOpen("exercise") : undefined}
            />
          </>
        ) : data.exerciseCount > 0 ? (
          <StudentGrammarExercise key={data.id} lesson={data} embedded />
        ) : (
          <p role="status" className="grammar-empty">
            Bài học chưa có câu luyện tập.
          </p>
        )}
      </div>
    </section>
  );
}
