import { isAxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import {
  getStudentVocabularyChapterResult,
  getStudentVocabularyChapterTest,
  saveStudentVocabularyChapterAnswers,
  startStudentVocabularyChapterTest,
  submitStudentVocabularyChapterAttempt,
  type StudentVocabularyChapterAttempt,
  type StudentVocabularyChapterQuestion,
  type StudentVocabularyChapterResult,
} from "../../api/vocabularyChapterTestApi";
import "./StudentVocabularyChapterTest.css";

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message as string;
  }
  return fallback;
}

function ResultView({
  result,
  onBack,
}: {
  result: StudentVocabularyChapterResult;
  onBack: () => void;
}) {
  const minutes = Math.floor(result.timeSpentSec / 60);
  return (
    <>
      <div className={`student-vocab-test-result ${result.passed ? "is-passed" : "is-failed"}`} role="status">
        <h3>
          Kết quả: {Number(result.score)}/100 · {result.passed ? "Đạt" : "Chưa đạt"}
        </h3>
        <p>
          {result.correctCount}/{result.totalQuestions} câu đúng · Điểm đạt: {Number(result.passingScore)} · Lần làm thứ {result.attemptNo}
        </p>
        <p>
          Nộp lúc: {formatDate(result.submittedAt)} · Thời gian làm: {minutes} phút {result.timeSpentSec % 60} giây
        </p>
        {result.status === "AUTO_SUBMITTED" && <p>Bài đã hết giờ. Kết quả tính theo các đáp án đã lưu trước hạn.</p>}
      </div>
      {result.questions.map((question, index) => (
        <article
          key={question.questionId}
          className={`student-vocab-test-review ${question.correct ? "is-correct" : "is-incorrect"}`}
        >
          <h3>
            Câu {index + 1} · {question.correct ? "Đúng" : "Sai / Chưa trả lời"}
          </h3>
          <p>{question.content}</p>
          <h4>Đáp án của bạn</h4>
          <p>{question.yourAnswer || "Chưa trả lời"}</p>
          <h4>Đáp án đúng</h4>
          <p>{question.correctAnswer}</p>
          {question.explanation && (
            <>
              <h4>Giải thích</h4>
              <p>{question.explanation}</p>
            </>
          )}
        </article>
      ))}
      <button type="button" className="student-vocab-test-primary" onClick={onBack}>
        Quay lại Mini test
      </button>
    </>
  );
}

function TestRunner({
  chapterId,
  initial,
  onDone,
}: {
  chapterId: number;
  initial: StudentVocabularyChapterAttempt;
  onDone: (result: StudentVocabularyChapterResult) => void;
}) {
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
      onDone(await submitStudentVocabularyChapterAttempt(chapterId, initial.id, latest.current));
    } catch (failure) {
      finished.current = false;
      setError(errorMessage(failure, "Không nộp được bài. Vui lòng thử lại."));
      setSubmitting(false);
    }
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

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

  useEffect(() => {
    if (!changed.current || finished.current) return;
    const timer = window.setTimeout(() => {
      saveStudentVocabularyChapterAnswers(chapterId, initial.id, latest.current)
        .then(() => {
          setError("");
          setMessage("Đã lưu đáp án.");
        })
        .catch((failure) => {
          setError(errorMessage(failure, "Chưa lưu được đáp án."));
          setMessage("Chưa lưu được. Hãy thử lưu lại trước khi rời trang.");
        });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [answers, chapterId, initial.id]);

  const change = (id: number, value: string) => {
    changed.current = true;
    const next = { ...latest.current, [id]: value };
    latest.current = next;
    setAnswers(next);
    setMessage("Đang chờ lưu…");
  };
  const answered = initial.questions.filter((question) => {
    const answer = answers[question.id] ?? "";
    return answer.trim() !== "" && answer !== "{}";
  }).length;

  return (
    <div className="student-vocab-test-runner">
      <div className={`student-vocab-test-timer ${remaining <= 60 ? "is-warning" : ""}`}>
        <strong>Thời gian còn lại: {formatTime(remaining)}</strong>
        <span>
          Đã trả lời {answered}/{initial.questions.length} câu · <span role="status">{message}</span>
        </span>
      </div>
      {error && <p role="alert" className="student-vocab-test-error">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (answered < initial.questions.length && !window.confirm("Bạn còn câu chưa trả lời. Vẫn nộp bài?")) return;
          void submit();
        }}
      >
        <fieldset disabled={submitting || remaining === 0} className="student-vocab-test-fieldset">
          {initial.questions.map((question, index) => (
            <QuestionInput
              key={question.id}
              question={question}
              index={index}
              value={answers[question.id]}
              onChange={(value) => change(question.id, value)}
            />
          ))}
        </fieldset>
        <div className="student-vocab-test-actions">
          <button type="submit" className="student-vocab-test-primary" disabled={submitting}>
            {submitting ? "Đang nộp…" : "Nộp bài"}
          </button>
        </div>
      </form>
    </div>
  );
}

function QuestionInput({
  question,
  index,
  value,
  onChange,
}: {
  question: StudentVocabularyChapterQuestion;
  index: number;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <article className="student-vocab-test-question">
      <h3>Câu {index + 1}</h3>
      <p>{question.content}</p>
      {question.questionType === "MCQ" ? (
        <div className="student-vocab-test-options">
          {question.options.map((option, position) => (
            <label key={`${question.id}-${position}`}>
              <input
                type="radio"
                name={`vocabulary-answer-${question.id}`}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : (
        <input
          className="student-vocab-test-input"
          aria-label={`Trả lời câu ${index + 1}`}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nhập câu trả lời..."
        />
      )}
    </article>
  );
}

export function StudentVocabularyChapterTestPage({
  chapterId,
  onBack,
}: {
  chapterId: number;
  onBack: () => void;
}) {
  const [test, setTest] = useState<Awaited<ReturnType<typeof getStudentVocabularyChapterTest>> | null>(null);
  const [attempt, setAttempt] = useState<StudentVocabularyChapterAttempt | null>(null);
  const [result, setResult] = useState<StudentVocabularyChapterResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    setLoading(true);
    setError("");
    getStudentVocabularyChapterTest(chapterId, request.signal)
      .then((data) => {
        if (!request.signal.aborted) setTest(data);
      })
      .catch((failure) => {
        if (request.signal.aborted) return;
        setTest(null);
        setError(
          isAxiosError(failure) && failure.response?.status === 404
            ? "Bài test chương chưa được xuất bản hoặc không còn khả dụng."
            : errorMessage(failure, "Không thể tải bài test chương. Vui lòng thử lại."),
        );
      })
      .finally(() => {
        if (!request.signal.aborted) setLoading(false);
      });
    return () => request.abort();
  }, [chapterId, reload]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const started = await startStudentVocabularyChapterTest(chapterId);
      if (started.status === "IN_PROGRESS") setAttempt(started);
      else {
        setResult(await getStudentVocabularyChapterResult(chapterId, started.id));
        setReload((value) => value + 1);
      }
    } catch (failure) {
      setError(errorMessage(failure, "Không thể bắt đầu bài làm."));
    } finally {
      setBusy(false);
    }
  };

  const openResult = async (attemptId: number) => {
    setBusy(true);
    setError("");
    try {
      setResult(await getStudentVocabularyChapterResult(chapterId, attemptId));
    } catch (failure) {
      setError(errorMessage(failure, "Không thể tải kết quả."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="student-vocab-test-state" role="status">Đang tải mini test từ vựng...</div>;

  return (
    <section className="student-vocab-chapter-test">
      <div className="student-vocab-test-heading">
        {!attempt && (
          <button
            type="button"
            className="student-vocab-test-back"
            onClick={result ? () => setResult(null) : onBack}
          >
            ← {result ? "Quay lại Mini test" : "Về chương"}
          </button>
        )}
        {test && <p className="student-vocab-test-breadcrumb">Từ vựng / Mini test chương</p>}
        <h2>{result?.title ?? test?.title ?? "Mini test Từ vựng"}</h2>
      </div>
      {error && <p role="alert" className="student-vocab-test-error">{error}</p>}
      {!test ? (
        <button type="button" className="student-vocab-test-primary" onClick={() => setReload((value) => value + 1)}>
          Thử tải lại
        </button>
      ) : attempt ? (
        <TestRunner
          key={attempt.id}
          chapterId={chapterId}
          initial={attempt}
          onDone={(submitted) => {
            setAttempt(null);
            setResult(submitted);
            setReload((value) => value + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : result ? (
        <ResultView result={result} onBack={() => setResult(null)} />
      ) : test.questions.length === 0 ? (
        <div className="student-vocab-test-card"><p>Bài test chương hiện không có câu hỏi.</p></div>
      ) : (
        <>
          <article className="student-vocab-test-card">
            <h3>Thông tin bài kiểm tra</h3>
            <dl className="student-vocab-test-details">
              <div><dt>Số câu</dt><dd>{test.questions.length}</dd></div>
              <div><dt>Thời gian</dt><dd>{test.durationMinutes} phút</dd></div>
              <div><dt>Điểm đạt</dt><dd>{Number(test.passingScore)}/100</dd></div>
            </dl>
            <p>Đáp án được lưu tự động. Hết giờ, hệ thống tự nộp bài theo các đáp án đã lưu.</p>
            <button type="button" className="student-vocab-test-primary" disabled={busy} onClick={() => void start()}>
              {busy ? "Đang tải…" : test.inProgressAttemptId ? "Tiếp tục làm bài" : "Bắt đầu làm bài"}
            </button>
          </article>
          <section className="student-vocab-test-history">
            <h3>Lịch sử làm bài</h3>
            {!test.attempts.length ? (
              <p>Bạn chưa nộp bài mini test này.</p>
            ) : (
              <ul>
                {test.attempts.map((item) => (
                  <li key={item.id}>
                    <span>
                      Lần {item.attemptNo} · {Number(item.score ?? 0)}/100 · {item.correctCount}/{item.totalQuestions} câu ·{" "}
                      <strong className={item.passed ? "is-pass" : "is-fail"}>{item.passed ? "Đạt" : "Chưa đạt"}</strong> · {formatDate(item.submittedAt)}
                    </span>
                    <button type="button" disabled={busy} onClick={() => void openResult(item.id)}>Xem kết quả</button>
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
