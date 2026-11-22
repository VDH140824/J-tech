import type { StudentGrammarLesson } from "../../api/studentGrammarApi";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { recordCompletion } from "../../api/progressApi";
import { useAuthStore } from "../../store/authStore";
import "../streak/StudentStreakPage.css";
import "./StudentKanjiFlashcards.css";
import "./StudentGrammar.css";

// Material Grammar: các điểm ngữ pháp đã xuất bản của bài học
// embedded: hiện trong tab "Tài liệu" của trang bài học (không có nút quay lại, tiêu đề riêng)
export function StudentGrammarMaterial({
  lesson,
  onBack,
  embedded = false,
}: {
  lesson: StudentGrammarLesson;
  onBack?: () => void;
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
      {lesson.grammars.length > 0 && <GrammarCompletionButton key={lesson.id} grammarIds={lesson.grammars.map((g) => g.id)} />}
    </section>
  );
}

/**
 * Một nút chung ở cuối tài liệu: ghi nhận đã học tất cả mẫu ngữ pháp của bài
 * (POST /progress/completions cho từng mẫu, giống nút "Hoàn thành nội dung" của nhóm) → tính chuỗi ngày học.
 */
function GrammarCompletionButton({ grammarIds }: { grammarIds: number[] }) {
  const user = useAuthStore((s) => s.user);
  const cache = useQueryClient();
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const role = user?.role?.trim().toUpperCase();
  const isStudent = role === "STUDENT" || role === "ROLE_STUDENT" || (!role && String(user?.roleId) === "1");
  if (!isStudent || user?.status?.toUpperCase() !== "ACTIVE") return null;

  async function complete() {
    setState("saving");
    try {
      for (const id of grammarIds) await recordCompletion("GRAMMAR", id);
      setState("done");
      for (const key of ["streak", "coin-history", "store-catalog"]) void cache.invalidateQueries({ queryKey: [key] });
    } catch {
      setState("error");
    }
  }

  return (
    <div className="learning-completion grammar-completion">
      <button type="button" disabled={state === "saving" || state === "done"} onClick={complete}>
        {state === "saving" ? "Đang lưu…" : state === "done" ? "Đã ghi nhận" : "Hoàn thành tài liệu"}
      </button>
      {state === "done" && <p role="status">Đã ghi nhận hoạt động học của bạn.</p>}
      {state === "error" && <p role="alert">Chưa lưu được kết quả. Vui lòng thử lại.</p>}
    </div>
  );
}
