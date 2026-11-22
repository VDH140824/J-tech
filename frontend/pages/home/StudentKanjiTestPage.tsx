import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { getStudentKanjiTests } from "../../api/studentKanjiApi";
import {
  latestKanjiTest,
  startKanjiTest,
  saveKanjiAnswers,
  kanjiTestError,
  type KanjiAttempt,
} from "../../api/kanjiTestApi";
import "./StudentKanjiFlashcards.css";

function Review({ attempt }: { attempt: KanjiAttempt }) {
  return (
    <div className="kanji-test-review">
      <div className="kanji-test-result" role="status">
        <h3>
          Kết quả: {attempt.score}/100 · {attempt.passed ? "Đạt" : "Chưa đạt"}
        </h3>
        <p>
          {attempt.correctCount}/{attempt.questions.length} câu đúng · Điểm đạt:{" "}
          {attempt.passingScore}
        </p>
        <p>
          Nộp lúc:{" "}
          {attempt.submittedAt
            ? new Date(attempt.submittedAt).toLocaleString("vi-VN")
            : "—"}
        </p>
        {attempt.status === "AUTO_SUBMITTED" && (
          <p>Bài đã hết giờ. Kết quả tính theo các đáp án đã lưu trước hạn.</p>
        )}
      </div>
      {attempt.questions.map((q, index) => (
        <article
          key={q.id}
          className={`kanji-test-question ${q.correct ? "kanji-answer-correct" : "kanji-answer-wrong"}`}
        >
          <h3>
            Câu {index + 1} · {q.correct ? "Đúng" : "Sai"}
          </h3>
          <p className="kanji-preserve-lines">{q.content}</p>
          <h4>Đáp án của bạn</h4>
          {q.type === "MCQ" && (
            <ul aria-label="Các lựa chọn">
              {q.options.map((option) => (
                <li key={option}>{option}</li>
              ))}
            </ul>
          )}
          {q.type === "MATCHING" ? (
            <ul>
              {q.left.map((left, j) => (
                <li key={j}>
                  {left} → {attempt.answers[`${q.id}:${j}`] || "Chưa trả lời"}
                </li>
              ))}
            </ul>
          ) : (
            <p>{attempt.answers[q.id] || "Chưa trả lời"}</p>
          )}
          <h4>Đáp án đúng</h4>
          <p className="kanji-preserve-lines">{q.answer}</p>
          <h4>Giải thích</h4>
          <p className="kanji-preserve-lines">
            {q.explanation || "Chưa có giải thích."}
          </p>
        </article>
      ))}
    </div>
  );
}

function Runner({
  initial,
  onDone,
  onBack,
}: {
  initial: KanjiAttempt;
  onDone: (a: KanjiAttempt) => void;
  onBack: () => void;
}) {
  const [attempt, setAttempt] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const latestAnswers = useRef(initial.answers);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState(
    "Đáp án được tự động lưu sau khi bạn chọn.",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const finished = useRef(initial.status !== "IN_PROGRESS");
  const submitQueued = useRef(false);
  const changed = useRef(false);
  const offset = useRef(Date.parse(initial.serverTime) - Date.now());
  const saveRef = useRef<(submit: boolean) => void>(() => {});
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const persist = (submit: boolean) => {
    if (finished.current || submitQueued.current) return;
    if (submit) {
      submitQueued.current = true;
      setSubmitting(true);
    }
    const values = { ...latestAnswers.current };
    queue.current = queue.current
      .then(async () => {
        if (finished.current) return;
        const response = await saveKanjiAnswers(initial.id, values, submit);
        if (response.status !== "IN_PROGRESS") finished.current = true;
        if (!mounted.current) return;
        setError("");
        setMessage(submit ? "Đã nộp bài." : "Đã lưu đáp án.");
        if (response.status !== "IN_PROGRESS") {
          setAttempt(response);
          setAnswers(response.answers);
          onDone(response);
        }
      })
      .catch((e) => {
        if (mounted.current) {
          setError(kanjiTestError(e));
          setMessage("Chưa lưu được. Hãy thử lưu lại trước khi rời trang.");
        }
      })
      .finally(() => {
        if (submit) {
          submitQueued.current = false;
          if (mounted.current) setSubmitting(false);
        }
      });
  };
  saveRef.current = persist;
  useEffect(() => {
    if (attempt.status !== "IN_PROGRESS") return;
    const tick = () => {
      const value = Math.max(
        0,
        Math.ceil(
          (Date.parse(initial.deadlineAt) - Date.now() - offset.current) / 1000,
        ),
      );
      setRemaining(value);
      if (value === 0 && !submitQueued.current && !finished.current)
        saveRef.current(true);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt.status, initial.deadlineAt]);
  useEffect(() => {
    if (!changed.current || attempt.status !== "IN_PROGRESS") return;
    const timer = window.setTimeout(() => saveRef.current(false), 600);
    return () => window.clearTimeout(timer);
  }, [answers, attempt.status]);
  const change = (key: string, value: string) => {
    changed.current = true;
    const next = { ...latestAnswers.current, [key]: value };
    latestAnswers.current = next;
    setAnswers(next);
    setMessage("Đang chờ lưu…");
  };
  if (attempt.status !== "IN_PROGRESS")
    return (
      <>
        <Review attempt={attempt} />
        <button type="button" className="kanji-primary" onClick={onBack}>
          Quay lại danh sách Test
        </button>
      </>
    );
  return (
    <div className="kanji-test-runner">
      <div className="kanji-test-timer">
        <strong>
          Thời gian còn lại: {Math.floor(remaining / 60)}:
          {String(remaining % 60).padStart(2, "0")}
        </strong>
        <span role="status">{message}</span>
      </div>
      {error && (
        <p role="alert" className="kanji-error">
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          persist(true);
        }}
      >
        <fieldset disabled={submitting || remaining === 0}>
          {attempt.questions.map((q, index) => (
            <section key={q.id} className="kanji-test-question">
              <h3>Câu {index + 1}</h3>
              <p className="kanji-preserve-lines">{q.content}</p>
              {q.type === "MCQ" ? (
                q.options.map((option, j) => (
                  <label className="kanji-student-option" key={j}>
                    <input
                      type="radio"
                      name={`answer-${q.id}`}
                      checked={answers[q.id] === option}
                      onChange={() => change(q.id, option)}
                    />
                    {option}
                  </label>
                ))
              ) : q.type === "FILL_IN" ? (
                <label>
                  Đáp án
                  <input
                    maxLength={1000}
                    value={answers[q.id] || ""}
                    onChange={(e) => change(q.id, e.target.value)}
                  />
                </label>
              ) : (
                q.left.map((left, j) => (
                  <label className="kanji-match-answer" key={j}>
                    <span>{left}</span>
                    <select
                      value={answers[`${q.id}:${j}`] || ""}
                      onChange={(e) => change(`${q.id}:${j}`, e.target.value)}
                    >
                      <option value="">Chọn đáp án</option>
                      {q.right.map((right) => (
                        <option key={right} value={right}>
                          {right}
                        </option>
                      ))}
                    </select>
                  </label>
                ))
              )}
            </section>
          ))}
        </fieldset>
        <div className="kanji-test-actions">
          <button
            type="button"
            disabled={submitting || remaining === 0}
            onClick={() => persist(false)}
          >
            Lưu đáp án
          </button>
          <button type="submit" className="kanji-primary" disabled={submitting}>
            {submitting
              ? "Đang nộp…"
              : remaining === 0
                ? "Xem kết quả hết giờ"
                : "Nộp bài"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function StudentKanjiTestPage({
  chapterId,
  chapterNo,
  onBack,
}: {
  chapterId: number;
  chapterNo: number;
  onBack: () => void;
}) {
  const client = useQueryClient();
  const tests = useQuery({
    queryKey: ["student-chapter-kanji-tests", chapterId],
    queryFn: ({ signal }) => getStudentKanjiTests(chapterId, signal),
    refetchOnMount: "always",
  });
  const history = useQuery({
    queryKey: ["student-chapter-kanji-latest", chapterId],
    queryFn: ({ signal }) => latestKanjiTest(chapterId, signal),
    refetchOnMount: "always",
  });
  const [active, setActive] = useState<KanjiAttempt | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const done = (result: KanjiAttempt) =>
    client.setQueryData(["student-chapter-kanji-latest", chapterId], result);
  const start = async (id: number) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const a = await startKanjiTest(chapterId, id);
      setActive(a);
      if (a.status !== "IN_PROGRESS") done(a);
    } catch (e) {
      setError(kanjiTestError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="student-kanji-page">
      {!active && (
        <button type="button" className="kanji-text-button" onClick={onBack}>
          ← Chữ Hán · Chương {chapterNo}
        </button>
      )}
      <h2>{active?.title || `Test chữ Hán · Chương ${chapterNo}`}</h2>

      {error && (
        <p role="alert" className="kanji-error">
          {error}
        </p>
      )}
      {active ? (
        <Runner
          key={active.id}
          initial={active}
          onDone={done}
          onBack={() => {
            setActive(null);
            void history.refetch();
          }}
        />
      ) : (
        <>
          {tests.isFetching ? (
            <p role="status">Đang tải Test…</p>
          ) : tests.isError ? (
            <p role="alert">
              Không thể tải Test.{" "}
              <button onClick={() => tests.refetch()}>Thử lại</button>
            </p>
          ) : !tests.data?.length ? (
            <p role="status">Chương chưa có Test được xuất bản.</p>
          ) : (
            tests.data.map((test) => (
              <article className="kanji-reading-panel" key={test.id}>
                <h3>{test.title}</h3>
                {test.description && <p>{test.description}</p>}
                <p>Thời gian: {test.durationMinutes} phút</p>
                <button
                  type="button"
                  className="kanji-primary"
                  disabled={busy}
                  onClick={() => void start(test.id)}
                >
                  {busy ? "Đang tải…" : "Bắt đầu / Tiếp tục làm bài"}
                </button>
              </article>
            ))
          )}
          <section className="kanji-test-history">
            <h3>Kết quả lần làm gần nhất</h3>
            {history.isPending ? (
              <p>Đang tải kết quả…</p>
            ) : history.isError ? (
              <p role="alert">
                Không thể tải kết quả.{" "}
                <button onClick={() => history.refetch()}>Thử lại</button>
              </p>
            ) : history.data ? (
              <>
                <p>
                  {history.data.title} · {history.data.score}/100 ·{" "}
                  {history.data.submittedAt
                    ? new Date(history.data.submittedAt).toLocaleString("vi-VN")
                    : ""}
                </p>
                <button
                  type="button"
                  className="kanji-primary"
                  onClick={() => setShowHistory((value) => !value)}
                >
                  {showHistory ? "Ẩn lời giải" : "Xem đáp án và lời giải"}
                </button>
                {showHistory && <Review attempt={history.data} />}
              </>
            ) : (
              <p>Bạn chưa có bài làm đã nộp trong chương này.</p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
