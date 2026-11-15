import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  checkConjugationAnswer,
  startConjugationPractice,
  submitConjugationPractice,
  type ConjugationCheckResult,
  type ConjugationPracticeResult,
} from "../../api/studentConjugationApi";
import {
  DIFFICULTY_OPTIONS,
  GROUP_OPTIONS,
  parseDifficulty,
  parseGroup,
  parseMode,
} from "../../utils/conjugationFilters";
import "./Conjugation.css";

/**
 * 3.6.26 Conjugation Practice (UC-23). URL: /conjugations/:formId/practice?group=&difficulty=&mode=
 * Nhóm động từ, độ khó và hình thức được chọn ở hộp thoại trước khi luyện tập và cố định trong lượt;
 * muốn đổi thì bấm "Đổi lựa chọn" để quay lại hộp thoại. Màn luyện tập không hiển thị lý thuyết.
 * Mỗi lượt server chọn ngẫu nhiên N câu (N = số câu mỗi lượt do Moderator đặt).
 */
export function ConjugationPracticePage() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { formId: formParam } = useParams();
  const formId = Number(formParam);
  const [params] = useSearchParams();
  const group = parseGroup(params.get("group"));
  const difficulty = parseDifficulty(params.get("difficulty"));
  const mode = parseMode(params.get("mode"));

  // round tăng mỗi khi bắt đầu lượt mới → gọi lại API để lấy bộ câu ngẫu nhiên khác.
  const [round, setRound] = useState(0);
  const session = useQuery({
    queryKey: ["conjugation-practice", formId, group, difficulty, round],
    queryFn: () => startConjugationPractice(formId, group, difficulty, mode),
    enabled: formId > 0,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<
    Record<string, ConjugationCheckResult>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // result: kết quả đã lưu trên server; showResult: đang hiển thị màn kết quả.
  const [result, setResult] = useState<ConjugationPracticeResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Bắt đầu lượt mới (vào trang hoặc bấm "Luyện lượt mới") → xóa trạng thái lượt cũ.
  useEffect(() => {
    setIndex(0);
    setInput("");
    setAnswers({});
    setChecked({});
    setError("");
    setResult(null);
    setShowResult(false);
    setSaveState("idle");
  }, [formId, group, difficulty, mode, round]);

  const questions = session.data?.questions ?? [];
  const question = questions[index];
  const feedback = question ? checked[String(question.id)] : undefined;
  const isLast = index === questions.length - 1;
  const doneCount = Object.keys(checked).length;
  const useChoices = mode === "choice" && !!question?.options?.length;

  useEffect(() => {
    if (!feedback && !useChoices) inputRef.current?.focus();
  }, [index, feedback, useChoices]);

  async function check(value: string) {
    if (!question || feedback || busy) return;
    if (!value.trim()) {
      setError("Vui lòng nhập đáp án.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await checkConjugationAnswer(
        formId,
        question.id,
        value.trim(),
      );
      const nextAnswers = { ...answers, [String(question.id)]: value.trim() };
      const nextChecked = { ...checked, [String(question.id)]: res };
      setAnswers(nextAnswers);
      setChecked(nextChecked);
      // Kiểm tra xong câu cuối cùng → lưu kết quả ngay, không phụ thuộc học viên có bấm tiếp hay thoát ra.
      if (Object.keys(nextChecked).length === questions.length)
        void save(nextAnswers);
    } catch {
      setError("Không kiểm tra được đáp án. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function save(finalAnswers: Record<string, string>) {
    if (result || saveState === "saving") return;
    setSaveState("saving");
    try {
      const res = await submitConjugationPractice(
        formId,
        group,
        difficulty,
        mode,
        finalAnswers,
      );
      setResult(res);
      setSaveState("idle");
      for (const key of [
        "conjugation-form",
        "conjugation-forms",
        "streak",
        "coin-history",
      ])
        void cache.invalidateQueries({ queryKey: [key] });
    } catch {
      setSaveState("error");
    }
  }

  function next() {
    if (isLast) {
      if (result) setShowResult(true);
      else void save(answers); // lần lưu tự động bị lỗi → thử lại khi bấm
    } else {
      setIndex(index + 1);
      setInput("");
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Không bắt Enter khi đang gõ IME (chọn Kanji / Hiragana).
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (feedback) next();
    else void check(input);
  }

  const backToList = () => navigate("/conjugations");
  // Mở lại hộp thoại chọn nhóm, độ khó, hình thức (ở trang danh sách)
  const changeSetup = () => navigate(`/conjugations?practice=${formId}`);
  const groupLabel = GROUP_OPTIONS.find((option) => option.value === group)?.label;
  const difficultyLabel = DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.label;

  return (
    <div className="sg-page cj-page">
      <header className="sg-header">
        <h1>Luyện tập thể chia</h1>
      </header>

      <div className="cj-practice-summary" aria-label="Lựa chọn luyện tập">
        {session.data && (
          <span className="cj-badge">
            {session.data.nameVi} ({session.data.nameJp})
          </span>
        )}
        <span className="cj-badge">{groupLabel}</span>
        <span className="cj-badge">{difficultyLabel}</span>
        <span className="cj-badge">{mode === "choice" ? "Trắc nghiệm" : "Nhập đáp án"}</span>
        <button type="button" className="mod-btn-back" onClick={changeSetup}>
          Đổi lựa chọn
        </button>
      </div>

      {session.isLoading ? (
        <div className="admin-loading-state" role="status">
          Đang tải câu hỏi...
        </div>
      ) : session.isError ? (
        <div className="admin-empty-state" role="alert">
          <p>
            {(session.error as { response?: { status?: number } })?.response
              ?.status === 404
              ? "Chưa có câu luyện tập cho nhóm động từ và độ khó đã chọn."
              : "Không tải được dữ liệu, hãy thử lại sau."}
          </p>
          <button
            type="button"
            className="mod-btn-back"
            onClick={() => session.refetch()}
          >
            Thử lại
          </button>
        </div>
      ) : result && showResult ? (
        <PracticeResult
          result={result}
          onNewRound={() => setRound((n) => n + 1)}
          onBack={backToList}
        />
      ) : question ? (
        <div className="cj-practice">
          <div className="sg-main">
            <div className="sg-question-progress">
              <span>
                Câu {index + 1}/{questions.length}
              </span>
              <div
                className="sg-progress-track"
                role="progressbar"
                aria-label="Số câu đã kiểm tra"
                aria-valuemin={0}
                aria-valuemax={questions.length}
                aria-valuenow={doneCount}
              >
                <span
                  style={{ width: `${(doneCount / questions.length) * 100}%` }}
                />
              </div>
              <span>Lượt {round + 1}</span>
            </div>

            <section className="sg-question">
              <p className="sg-instruction">{question.instruction}</p>
              <div className="cj-verb">
                <span className="cj-verb-word" lang="ja">
                  {question.verb}
                </span>
                <span className="cj-verb-reading" lang="ja">
                  {question.reading}
                </span>
                <span className="cj-verb-meaning">{question.meaningVi}</span>
                {question.verbGroup && (
                  <span className="cj-badge">Nhóm {question.verbGroup}</span>
                )}
              </div>

              {useChoices ? (
                <fieldset className="sg-options" disabled={!!feedback || busy}>
                  <legend className="sg-visually-hidden">Chọn đáp án</legend>
                  {question.options!.map((option, i) => {
                    const chosen = answers[String(question.id)] === option;
                    const state = !feedback
                      ? ""
                      : option === feedback.correctAnswer
                        ? " is-correct"
                        : chosen
                          ? " is-wrong"
                          : "";
                    return (
                      <label
                        key={option}
                        className={`sg-option${chosen ? " is-selected" : ""}${state}`}
                      >
                        <input
                          type="radio"
                          name={`cj-${question.id}`}
                          checked={chosen}
                          onChange={() => void check(option)}
                        />
                        <span className="sg-option-key">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span lang="ja">{option}</span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : (
                <div className="cj-answer">
                  <label htmlFor="cj-answer">Đáp án của bạn</label>
                  <div className="cj-answer-row">
                    <input
                      id="cj-answer"
                      ref={inputRef}
                      lang="ja"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      maxLength={100}
                      placeholder="Nhập đáp án… (Kanji, Hiragana hoặc Katakana)"
                      value={
                        feedback
                          ? (answers[String(question.id)] ?? input)
                          : input
                      }
                      readOnly={!!feedback}
                      className={
                        feedback
                          ? feedback.correct
                            ? "is-correct"
                            : "is-wrong"
                          : undefined
                      }
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={onKeyDown}
                    />
                    {!feedback && (
                      <button
                        type="button"
                        className="sg-btn sg-btn-primary"
                        onClick={() => void check(input)}
                        disabled={busy || !input.trim()}
                      >
                        Kiểm tra
                      </button>
                    )}
                  </div>
                </div>
              )}

              {feedback && (
                <div
                  className={`sg-feedback ${feedback.correct ? "is-correct" : "is-wrong"}`}
                  role="status"
                >
                  <strong>
                    {feedback.correct ? "Chính xác!" : "Chưa đúng."}
                  </strong>
                  <p>
                    Đáp án đúng: <span lang="ja">{feedback.correctAnswer}</span>
                    {feedback.acceptedAnswers.length > 0 && (
                      <>
                        {" "}
                        (chấp nhận:{" "}
                        <span lang="ja">
                          {feedback.acceptedAnswers.join(", ")}
                        </span>
                        )
                      </>
                    )}
                  </p>
                  {feedback.explanation && <p>{feedback.explanation}</p>}
                </div>
              )}
              {error && (
                <p className="sg-error" role="alert">
                  {error}
                </p>
              )}
              {isLast && feedback && (
                <p
                  className={saveState === "error" ? "sg-error" : "cj-saved"}
                  role="status"
                >
                  {saveState === "saving"
                    ? "Đang lưu kết quả lượt luyện tập..."
                    : saveState === "error"
                      ? "Chưa lưu được kết quả. Bấm “Lưu lại kết quả” để thử lại."
                      : result
                        ? "Đã lưu kết quả lượt luyện tập."
                        : null}
                </p>
              )}
            </section>

            <footer className="sg-footer">
              <button
                type="button"
                className="sg-btn sg-btn-secondary"
                onClick={backToList}
              >
                Quay lại
              </button>
              <div className="sg-footer-group">
                <button
                  type="button"
                  className="sg-btn sg-btn-primary"
                  onClick={next}
                  disabled={!feedback || busy || saveState === "saving"}
                >
                  {!isLast
                    ? "Câu tiếp theo"
                    : saveState === "saving"
                      ? "Đang lưu..."
                      : saveState === "error"
                        ? "Lưu lại kết quả"
                        : "Xem kết quả"}
                </button>
              </div>
            </footer>
          </div>

        </div>
      ) : (
        <div className="admin-empty-state">Chưa có dữ liệu được tạo.</div>
      )}
    </div>
  );
}

function PracticeResult({
  result,
  onNewRound,
  onBack,
}: {
  result: ConjugationPracticeResult;
  onNewRound: () => void;
  onBack: () => void;
}) {
  const wrong = result.details.filter((d) => !d.correct).length;
  return (
    <>
      <section
        className={`sg-result ${result.passed ? "is-passed" : "is-failed"}`}
        aria-live="polite"
      >
        <p className="sg-result-score">
          {result.correctCount}/{result.totalQuestions} câu đúng (
          {Math.round(Number(result.score))}%)
        </p>
        <p className="sg-result-status">
          {result.passed
            ? "Đạt"
            : `Chưa đạt (cần tối thiểu ${Math.round(Number(result.passingScore))}%)`}
        </p>
        {wrong > 0 && (
          <p>
            {wrong} câu sai, bạn có thể xem lại cách chia rồi luyện lượt mới.
          </p>
        )}
        {result.coinsAwarded > 0 && (
          <p>Bạn nhận được {result.coinsAwarded} xu cho lần đạt đầu tiên.</p>
        )}
        <p>Kết quả đã được lưu vào tiến độ học tập.</p>
      </section>
      <footer className="sg-footer">
        <button
          type="button"
          className="sg-btn sg-btn-secondary"
          onClick={onBack}
        >
          Quay lại
        </button>
        <button
          type="button"
          className="sg-btn sg-btn-primary"
          onClick={onNewRound}
        >
          Lượt mới
        </button>
      </footer>
    </>
  );
}
