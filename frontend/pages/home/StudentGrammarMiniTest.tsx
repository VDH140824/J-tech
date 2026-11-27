import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGrammarResult,
  grammarError,
  saveGrammarAnswers,
  startGrammarMiniTest,
  submitGrammarMiniTest,
  type GrammarAttempt,
  type GrammarAttemptResult,
  type StudentGrammarLesson,
} from "../../api/studentGrammarApi";
import { GrammarQuestionInput, GrammarReview } from "./StudentGrammarExercise";
import "./StudentKanjiFlashcards.css";
import "./StudentGrammar.css";

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString("vi-VN") : "—");

// ===== Mini test Grammar result =====
function Result({ result, onBack }: { result: GrammarAttemptResult; onBack: () => void }) {
  const minutes = Math.floor(result.timeSpentSec / 60);
  return (
    <>
      <div className={`kanji-test-result grammar-result ${result.passed ? "is-passed" : "is-failed"}`} role="status">
        <h3>
          Kết quả: {Number(result.score)}/100 · {result.passed ? "Đạt" : "Chưa đạt"}
        </h3>
        <p>
          {result.correctCount}/{result.totalQuestions} câu đúng · Điểm đạt: {Number(result.passingScore)} · Lần làm thứ{" "}
          {result.attemptNo}
        </p>
        <p>
          Nộp lúc: {formatDate(result.submittedAt)} · Thời gian làm: {minutes} phút {result.timeSpentSec % 60} giây
        </p>
        {result.status === "AUTO_SUBMITTED" && <p>Bài đã hết giờ. Kết quả tính theo các đáp án đã lưu trước hạn.</p>}
      </div>
      <GrammarReview questions={result.questions} results={result.results} />
      <button type="button" className="kanji-primary" onClick={onBack}>
        Quay lại Mini test
      </button>
    </>
  );
}

// ===== Làm bài =====
function Runner({ initial, onDone }: { initial: GrammarAttempt; onDone: (result: GrammarAttemptResult) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>(initial.answers ?? {});
  const latest = useRef(answers);
  const [remaining, setRemaining] = useState(initial.remainingSeconds);
  const [message, setMessage] = useState("Đáp án được tự động lưu sau khi bạn chọn.");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const changed = useRef(false);
  const finished = useRef(false);
  const endAt = useRef(Date.now() + initial.remainingSeconds * 1000);

  const submit = async () => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    setError("");
    try {
      onDone(await submitGrammarMiniTest(initial.id, latest.current));
    } catch (e) {
      finished.current = false;
      setError(grammarError(e, "Không nộp được bài. Vui lòng thử lại."));
      setSubmitting(false);
    }
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  // Đồng hồ: hết giờ thì tự nộp
  useEffect(() => {
    const tick = () => {
      const value = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(value);
      if (value === 0) void submitRef.current();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Tự lưu sau khi chọn đáp án
  useEffect(() => {
    if (!changed.current || finished.current) return;
    const timer = window.setTimeout(() => {
      saveGrammarAnswers(initial.id, latest.current)
        .then(() => {
          setError("");
          setMessage("Đã lưu đáp án.");
        })
        .catch((e) => {
          setError(grammarError(e, "Chưa lưu được đáp án."));
          setMessage("Chưa lưu được. Hãy thử lưu lại trước khi rời trang.");
        });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [answers, initial.id]);

  const change = (id: number, value: string) => {
    changed.current = true;
    const next = { ...latest.current, [id]: value };
    latest.current = next;
    setAnswers(next);
    setMessage("Đang chờ lưu…");
  };
  const answered = initial.questions.filter((q) => (answers[q.id] ?? "").trim() !== "" && answers[q.id] !== "{}").length;

  return (
    <div className="kanji-test-runner">
      <div className={`kanji-test-timer ${remaining <= 60 ? "grammar-timer-warning" : ""}`}>
        <strong>Thời gian còn lại: {formatTime(remaining)}</strong>
        <span>
          Đã trả lời {answered}/{initial.questions.length} câu · <span role="status">{message}</span>
        </span>
      </div>
      {error && (
        <p role="alert" className="kanji-error">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (answered < initial.questions.length && !window.confirm("Bạn còn câu chưa trả lời. Vẫn nộp bài?")) return;
          void submit();
        }}
      >
        <fieldset disabled={submitting || remaining === 0}>
          {initial.questions.map((q, index) => (
            <GrammarQuestionInput key={q.id} question={q} index={index} value={answers[q.id]}
              onChange={(value) => change(q.id, value)} />
          ))}
        </fieldset>
        <div className="kanji-test-actions">
          <button type="submit" className="kanji-primary" disabled={submitting}>
            {submitting ? "Đang nộp…" : "Nộp bài"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ===== Mini test Grammar =====
export function StudentGrammarMiniTest({
  lesson,
  onBack,
  embedded = false,
}: {
  lesson: StudentGrammarLesson;
  onBack?: () => void;
  embedded?: boolean;
}) {
  const test = lesson.miniTest!;
  const cache = useQueryClient();
  const [attempt, setAttempt] = useState<GrammarAttempt | null>(null);
  const [result, setResult] = useState<GrammarAttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const a = await startGrammarMiniTest(test.id);
      if (a.status === "IN_PROGRESS") setAttempt(a);
      else {
        // Lượt cũ đã hết giờ và được tự nộp → làm mới lịch sử làm bài
        setResult(await getGrammarResult(a.id));
        void cache.invalidateQueries({ queryKey: ["student-grammar-lesson"] });
      }
    } catch (e) {
      setError(grammarError(e, "Không thể bắt đầu bài làm."));
    } finally {
      setBusy(false);
    }
  };

  const openResult = async (attemptId: number) => {
    setBusy(true);
    setError("");
    try {
      setResult(await getGrammarResult(attemptId));
    } catch (e) {
      setError(grammarError(e, "Không thể tải kết quả."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={embedded ? "grammar-tab-panel" : "student-kanji-page"}>
      {!attempt && (result || !embedded) && (
        <button type="button" className="kanji-text-button" onClick={result ? () => setResult(null) : onBack}>
          ← {result ? "Quay lại Mini test" : `Quay lại ${lesson.title}`}
        </button>
      )}
      {!embedded && (
        <p className="kanji-breadcrumb">
          {lesson.courseName} / Chương {lesson.chapterNo} / Ngữ pháp / Mini test
        </p>
      )}
      <h2>{test.title}</h2>
      {error && (
        <p role="alert" className="kanji-error">
          {error}
        </p>
      )}

      {attempt ? (
        <Runner
          key={attempt.id}
          initial={attempt}
          onDone={(r) => {
            setAttempt(null);
            setResult(r);
            // Tải lại bài học để "Lịch sử làm bài" có ngay lần vừa nộp (không cần F5),
            // cùng các số liệu Mini test ở trang chủ / kết quả bài kiểm tra / chuỗi ngày học.
            for (const key of ["student-grammar-lesson", "home-test-status", "test-results", "home-last-lesson", "progress-streak", "streak"])
              void cache.invalidateQueries({ queryKey: [key] });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : result ? (
        <Result result={result} onBack={() => setResult(null)} />
      ) : (
        <>
          <article className="kanji-reading-panel">
            <h3>Thông tin bài kiểm tra</h3>
            <dl className="kanji-reading-details">
              <div>
                <dt>Số câu</dt>
                <dd>{test.questionCount}</dd>
              </div>
              <div>
                <dt>Thời gian</dt>
                <dd>{test.durationMinutes} phút</dd>
              </div>
              <div>
                <dt>Điểm đạt</dt>
                <dd>{Number(test.passingScore)}/100</dd>
              </div>
            </dl>
            <p>Đáp án được lưu tự động. Hết giờ, hệ thống tự nộp bài theo các đáp án đã lưu.</p>
            <button type="button" className="kanji-primary" disabled={busy} onClick={() => void start()}>
              {busy ? "Đang tải…" : test.inProgressAttemptId ? "Tiếp tục làm bài" : "Bắt đầu làm bài"}
            </button>
          </article>

          <section className="kanji-test-history">
            <h3>Lịch sử làm bài</h3>
            {!test.attempts.length ? (
              <p>Bạn chưa nộp bài mini test này.</p>
            ) : (
              <ul className="grammar-history">
                {test.attempts.map((a) => (
                  <li key={a.id}>
                    <span>
                      Lần {a.attemptNo} · {Number(a.score ?? 0)}/100 · {a.correctCount}/{a.totalQuestions} câu ·{" "}
                      <strong className={a.passed ? "grammar-pass" : "grammar-fail"}>
                        {a.passed ? "Đạt" : "Chưa đạt"}
                      </strong>{" "}
                      · {formatDate(a.submittedAt)}
                    </span>
                    <button type="button" disabled={busy} onClick={() => void openResult(a.id)}>
                      Xem kết quả
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
