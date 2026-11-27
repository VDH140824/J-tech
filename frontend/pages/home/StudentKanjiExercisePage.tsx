import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import axios from "axios";
import type { LessonSummary } from "../../api/lessonApi";
import { getStudentKanjiExercises, submitStudentKanjiExercises, type StudentKanjiExerciseAnswer, type StudentKanjiExerciseResult } from "../../api/studentKanjiApi";
import { parseLessonDocuments } from "../../utils/lessonDocuments";
import "./StudentKanjiFlashcards.css";

export function StudentKanjiExercisePage({ lesson, documentIndex, onBack, onBackToChapter }: {
  lesson: LessonSummary; documentIndex: string | null; onBack: () => void; onBackToChapter: () => void;
}) {
  const documents = parseLessonDocuments(lesson.documents);
  const document = documentIndex !== null && /^\d+$/.test(documentIndex) && Number.isSafeInteger(Number(documentIndex))
    ? documents[Number(documentIndex)] : undefined;
  const [answers, setAnswers] = useState<Record<number, StudentKanjiExerciseAnswer>>({});
  const [result, setResult] = useState<StudentKanjiExerciseResult>();
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const query = useQuery({ queryKey: ["student-kanji-exercises", lesson.id, round],
    queryFn: ({ signal }) => getStudentKanjiExercises(lesson.id, signal), enabled: !!document,
    staleTime: "static", gcTime: 0 });
  const questions = query.data ?? [];
  function startNewRound() {
    setAnswers({});
    setResult(undefined);
    setError("");
    setRound(previous => previous + 1);
  }
  return <section className="student-kanji-page kanji-student-exercises">
    <button type="button" className="kanji-text-button" disabled={busy} onClick={onBack}>← Quay lại tài liệu</button>
    {document && <nav className="kanji-lesson-switch" aria-label="Nội dung tài liệu Kanji">
      <button type="button" disabled={busy} onClick={onBack}><span aria-hidden="true">📄</span>Tài liệu</button>
      <button type="button" aria-current="page"><span aria-hidden="true">✏️</span>Bài tập
        {query.isSuccess && <span className="kanji-lesson-question-count">{questions.length} câu</span>}
      </button>
    </nav>}
    <h2>Bài tập · {document?.name ?? "Kanji"}</h2>
    {!document ? <p role="alert">Tài liệu đã được gỡ hoặc đường dẫn không còn hợp lệ.</p>
      : query.isPending ? <p role="status">Đang tải bài tập…</p>
      : query.isError ? <div role="alert"><p>Không tải được bài tập.</p><button type="button" onClick={() => void query.refetch()}>Thử lại</button></div>
      : !questions.length ? <p role="status">Tài liệu này chưa có bài tập. Bạn có thể quay lại đọc tài liệu.</p>
      : <form onSubmit={async event => {
        event.preventDefault();
        if (guard.current || result) return;
        guard.current = true; setBusy(true); setError("");
        try { setResult(await submitStudentKanjiExercises(lesson.id, questions.map(q => q.id), answers)); }
        catch (failure) {
          setError(axios.isAxiosError<{ message?: string }>(failure) ? failure.response?.data?.message || "Không nộp được bài. Vui lòng thử lại." : "Không nộp được bài.");
        } finally { guard.current = false; setBusy(false); }
      }}>
        {result && <p className="kanji-exercise-score" role="status">Kết quả: {result.correctCount}/{result.total} câu đúng.</p>}
        <fieldset disabled={busy || !!result}>
          {questions.map((q, index) => {
            const review = result?.questions.find(item => item.id === q.id);
            return <article key={q.id} className={`kanji-test-question ${review ? review.correct ? "kanji-answer-correct" : "kanji-answer-wrong" : ""}`}>
              <h3>Câu {index + 1}</h3><p className="kanji-preserve-lines">{q.content}</p>
              {q.questionType === "MCQ" ? q.options.map((option, choice) => <label className="kanji-student-choice" key={choice}>
                <input type="radio" name={`question-${q.id}`} checked={answers[q.id]?.value === option}
                  onChange={() => setAnswers(previous => ({ ...previous, [q.id]: { value: option } }))} />
                <span>{String.fromCharCode(65 + choice)}. {option}</span>
              </label>) : q.questionType === "FILL_IN" ? <label>Đáp án
                <input type="text" maxLength={1000} value={answers[q.id]?.value ?? ""}
                  onChange={event => setAnswers(previous => ({ ...previous, [q.id]: { value: event.target.value } }))} /></label>
                : q.leftItems.map(left => <label className="kanji-student-match" key={left}><span>{left}</span>
                  <select aria-label={`Đáp án cho ${left}`} value={answers[q.id]?.matches?.[left] ?? ""}
                    onChange={event => setAnswers(previous => ({ ...previous, [q.id]: { matches: { ...previous[q.id]?.matches, [left]: event.target.value } } }))}>
                    <option value="">Chọn cặp tương ứng</option>{q.rightItems.map(right => <option key={right} value={right}>{right}</option>)}
                  </select></label>)}
              {review && <div className="kanji-exercise-review"><strong>{review.correct ? "Chính xác" : "Chưa chính xác"}</strong>
                <p>Đáp án: {q.questionType === "MATCHING" ? Object.entries(review.matches).map(([left, right]) => `${left} ↔ ${right}`).join("; ") : review.correctAnswer}</p>
                {review.explanation && <p className="kanji-preserve-lines">Giải thích: {review.explanation}</p>}
              </div>}
            </article>;
          })}
        </fieldset>
        {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={startNewRound}>Tải lại bài tập</button></div>}
        <div className="kanji-document-reader-actions">
          {!result ? <button className="kanji-exercise-button" type="submit" disabled={busy}>{busy ? "Đang chấm bài…" : "Nộp bài"}</button>
            : <button className="kanji-exercise-button" type="button" onClick={startNewRound}>Làm lại</button>}
          {result && <button type="button" className="kanji-exercise-button" onClick={onBackToChapter}>Quay lại chương</button>}
          <button type="button" className="kanji-text-button" disabled={busy} onClick={onBack}>Quay lại tài liệu</button>
        </div>
      </form>}
  </section>;
}
