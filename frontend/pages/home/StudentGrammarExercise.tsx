import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  checkGrammarExercise,
  getGrammarExercise,
  grammarError,
  type GrammarCheckResult,
  type GrammarQuestion,
  type GrammarQuestionResult,
  type StudentGrammarLesson,
} from "../../api/studentGrammarApi";
import "./StudentKanjiFlashcards.css";
import "./StudentGrammar.css";

// ===== Dùng chung cho Luyện tập và Mini test =====

/** Câu nối: lưu dạng JSON {vế trái: vế phải}. */
function readPairs(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function GrammarQuestionInput({
  question,
  index,
  value,
  onChange,
}: {
  question: GrammarQuestion;
  index: number;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const pairs = readPairs(value);
  return (
    <section className="kanji-test-question">
      <h3>
        Câu {index + 1}
        {question.grammarName && <span className="grammar-question-tag">{question.grammarName}</span>}
      </h3>
      <p className="kanji-preserve-lines" lang="ja">
        {question.content}
      </p>
      {question.questionType === "MCQ" ? (
        question.options.map((option) => (
          <label className="kanji-student-option" key={option.key}>
            <input
              type="radio"
              name={`grammar-${question.id}`}
              checked={value === option.key}
              onChange={() => onChange(option.key)}
            />
            {option.key !== option.text && <strong>{option.key}.</strong>} <span lang="ja">{option.text}</span>
          </label>
        ))
      ) : question.questionType === "FILL_IN" ? (
        <label>
          Đáp án
          <input maxLength={1000} lang="ja" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      ) : (
        question.matchLeft.map((left) => (
          <label className="kanji-match-answer" key={left}>
            <span lang="ja">{left}</span>
            <select
              value={pairs[left] ?? ""}
              onChange={(e) => {
                const next = { ...pairs };
                if (e.target.value) next[left] = e.target.value;
                else delete next[left];
                onChange(JSON.stringify(next));
              }}
            >
              <option value="">Chọn đáp án</option>
              {question.matchRight.map((right) => (
                <option key={right} value={right}>
                  {right}
                </option>
              ))}
            </select>
          </label>
        ))
      )}
    </section>
  );
}

/** Đáp án, lời giải từng câu (kết quả luyện tập và Mini test Grammar result). */
export function GrammarReview({
  questions,
  results,
}: {
  questions: GrammarQuestion[];
  results: GrammarQuestionResult[];
}) {
  const byId = new Map(results.map((r) => [r.questionId, r]));
  return (
    <div className="kanji-test-review">
      {questions.map((q, index) => {
        const r = byId.get(q.id);
        if (!r) return null;
        return (
          <article key={q.id} className={`kanji-test-question ${r.correct ? "kanji-answer-correct" : "kanji-answer-wrong"}`}>
            <h3>
              Câu {index + 1} · {r.correct ? "Đúng" : "Sai"}
              {q.grammarName && <span className="grammar-question-tag">{q.grammarName}</span>}
            </h3>
            <p className="kanji-preserve-lines" lang="ja">
              {q.content}
            </p>
            <h4>Đáp án của bạn</h4>
            <p lang="ja">{r.yourAnswer || "Chưa trả lời"}</p>
            <h4>Đáp án đúng</h4>
            {q.questionType === "MATCHING" ? (
              <ul>
                {Object.entries(r.matches).map(([left, right]) => (
                  <li key={left} lang="ja">
                    {left} → {right}
                  </li>
                ))}
              </ul>
            ) : (
              <p lang="ja">{r.correctAnswer}</p>
            )}
            <h4>Giải thích</h4>
            <p className="kanji-preserve-lines">{r.explanation || "Chưa có giải thích."}</p>
          </article>
        );
      })}
    </div>
  );
}

// ===== Grammar Exercise =====
export function StudentGrammarExercise({
  lesson,
  onBack,
  embedded = false,
}: {
  lesson: StudentGrammarLesson;
  onBack?: () => void;
  embedded?: boolean;
}) {
  const query = useQuery({
    queryKey: ["student-grammar-exercise", lesson.id],
    queryFn: ({ signal }) => getGrammarExercise(lesson.id, signal),
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GrammarCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const questions = query.data?.questions ?? [];
  const answered = questions.filter((q) => (answers[q.id] ?? "").trim() !== "" && answers[q.id] !== "{}").length;

  const check = async () => {
    setChecking(true);
    setError("");
    try {
      setResult(await checkGrammarExercise(lesson.id, answers));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(grammarError(e, "Không chấm được bài. Vui lòng thử lại."));
    } finally {
      setChecking(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
    void query.refetch();
  };

  return (
    <section className={embedded ? "grammar-tab-panel" : "student-kanji-page"}>
      {!embedded && (
        <>
          <button type="button" className="kanji-text-button" onClick={onBack}>
            ← Quay lại {lesson.title}
          </button>
          <p className="kanji-breadcrumb">
            {lesson.courseName} / Chương {lesson.chapterNo} / Ngữ pháp / Luyện tập
          </p>
          <h2>Luyện tập · {lesson.title}</h2>
        </>
      )}
      {error && (
        <p role="alert" className="kanji-error">
          {error}
        </p>
      )}
      {query.isPending ? (
        <p role="status">Đang tải câu hỏi…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{grammarError(query.error, "Không thể tải bài luyện tập.")}</p>
          <button type="button" onClick={() => query.refetch()}>
            Thử lại
          </button>
        </div>
      ) : !questions.length ? (
        <p role="status">Bài học chưa có câu luyện tập.</p>
      ) : result ? (
        <>
          <div className="kanji-test-result" role="status">
            <h3>
              Kết quả: {result.correctCount}/{result.totalQuestions} câu đúng · {Number(result.score)}%
            </h3>
            <p>Bài luyện tập không lưu điểm. Bạn có thể làm lại bao nhiêu lần tùy thích.</p>
          </div>
          <GrammarReview questions={questions} results={result.results} />
          <div className="kanji-test-actions">
            {!embedded && (
              <button type="button" onClick={onBack}>
                Quay lại bài học
              </button>
            )}
            <button type="button" className="kanji-primary" onClick={retry}>
              Làm lại
            </button>
          </div>
        </>
      ) : (
        <form
          className="kanji-test-runner"
          onSubmit={(e) => {
            e.preventDefault();
            void check();
          }}
        >
          <div className="kanji-test-timer">
            <strong>
              Đã trả lời {answered}/{questions.length} câu
            </strong>
            <span>Bấm "Kiểm tra đáp án" để xem kết quả và lời giải.</span>
          </div>
          <fieldset disabled={checking}>
            {questions.map((q, index) => (
              <GrammarQuestionInput
                key={q.id}
                question={q}
                index={index}
                value={answers[q.id]}
                onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
              />
            ))}
          </fieldset>
          <div className="kanji-test-actions">
            <button type="submit" className="kanji-primary" disabled={checking}>
              {checking ? "Đang chấm…" : "Kiểm tra đáp án"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
