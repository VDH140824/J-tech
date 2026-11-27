import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  checkConjugationAnswer,
  getConjugationForm,
  startConjugationPractice,
  submitConjugationPractice,
  type ConjugationCheckResult,
  type ConjugationPracticeResult,
  type ConjugationQuestion,
  type DifficultyFilter,
  type PracticeMode,
  type VerbGroupFilter,
} from "../../api/studentConjugationApi";
import { DIFFICULTY_OPTIONS, parseDifficulty, parseGroup, parseMode } from "../../utils/conjugationFilters";
import { ConjugationFormTiles } from "./ConjugationFormTiles";
import { ConjugationMaterialModal } from "./ConjugationMaterialModal";
import "./Conjugation.css";

/**
 * 3.6.26 Conjugation Practice (UC-23). URL: /conjugations/:formId/practice?group=&difficulty=&mode=
 * Thanh chọn thể ở trên; thẻ luyện tập bên dưới có nhóm động từ, độ khó, hình thức (nhập / trắc nghiệm),
 * cách hiển thị và "Xem cách chia". Mỗi lượt server chọn ngẫu nhiên N câu; làm xong lượt chính thì lưu kết quả.
 * "Ôn lại câu sai" chỉ luyện lại trên máy, không lưu thêm lượt.
 */

type Display = "furigana" | "kanji" | "kana";
type Run = { kind: "main" | "review"; questions: ConjugationQuestion[] };

const DISPLAY_KEY = "cj-display";
const GROUPS: ReadonlyArray<{ value: VerbGroupFilter; label: string }> = [
  { value: 0, label: "Tất cả" },
  { value: 1, label: "Nhóm 1" },
  { value: 2, label: "Nhóm 2" },
  { value: 3, label: "Nhóm 3" },
];
const DISPLAYS: ReadonlyArray<{ value: Display; label: string }> = [
  { value: "furigana", label: "Kanji + Furigana" },
  { value: "kanji", label: "Chỉ Kanji" },
  { value: "kana", label: "Hiragana" },
];

function readDisplay(): Display {
  try {
    const value = window.localStorage.getItem(DISPLAY_KEY);
    return value === "kanji" || value === "kana" ? value : "furigana";
  } catch {
    return "furigana";
  }
}

const isKana = (text: string) => /^[぀-ヿー\s]+$/.test(text);

function VerbText({ verb, reading, display }: { verb: string; reading: string; display: Display }) {
  if (display === "kana" && reading) return <span lang="ja">{reading}</span>;
  if (display === "furigana" && reading && reading !== verb)
    return (
      <ruby lang="ja">
        {verb}
        <rt>{reading}</rt>
      </ruby>
    );
  return <span lang="ja">{verb}</span>;
}

/** Đáp án đúng theo cách hiển thị: 洗濯します（せんたくします） / 洗濯します / せんたくします. */
function answerText(check: ConjugationCheckResult, display: Display) {
  const kana = [check.correctAnswer, ...check.acceptedAnswers].find(isKana);
  if (display === "kana") return kana ?? check.correctAnswer;
  if (display === "furigana" && kana && kana !== check.correctAnswer) return `${check.correctAnswer}（${kana}）`;
  return check.correctAnswer;
}

const verbLine = (q: ConjugationQuestion) => (q.reading && q.reading !== q.verb ? `${q.verb}（${q.reading}）` : q.verb);

export function ConjugationPracticePage() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { formId: formParam } = useParams();
  const formId = Number(formParam);
  const [params, setParams] = useSearchParams();
  const group = parseGroup(params.get("group"));
  const difficulty = parseDifficulty(params.get("difficulty"));
  const mode = parseMode(params.get("mode"));

  const [display, setDisplay] = useState<Display>(readDisplay);
  const [showMaterial, setShowMaterial] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // round tăng mỗi khi bắt đầu lượt mới → gọi lại API để lấy bộ câu ngẫu nhiên khác.
  const [round, setRound] = useState(0);
  const session = useQuery({
    queryKey: ["conjugation-practice", formId, group, difficulty, mode, round],
    queryFn: () => startConjugationPractice(formId, group, difficulty, mode),
    enabled: formId > 0,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  // Số câu theo nhóm / độ khó + tài liệu cách chia
  const detail = useQuery({
    queryKey: ["conjugation-form", formId, group, difficulty],
    queryFn: ({ signal }) => getConjugationForm(formId, group, difficulty, signal),
    enabled: formId > 0,
    placeholderData: (previous) => previous,
  });

  const [run, setRun] = useState<Run | null>(null);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, ConjugationCheckResult>>({});
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<ConjugationPracticeResult | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const startRun = (next: Run) => {
    setRun(next);
    setIndex(0);
    setInput("");
    setAnswers({});
    setChecked({});
    setStreak(0);
    setError("");
    setFinished(false);
    if (next.kind === "main") {
      setResult(null);
      setSaveState("idle");
    }
  };

  useEffect(() => {
    if (session.data) startRun({ kind: "main", questions: session.data.questions });
    else setRun(null);
  }, [session.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const questions = run?.questions ?? [];
  const question = finished ? undefined : questions[index];
  const feedback = question ? checked[String(question.id)] : undefined;
  const isLast = index === questions.length - 1;
  const doneCount = Object.keys(checked).length;
  const useChoices = mode === "choice" && !!question?.options?.length;

  useEffect(() => {
    if (feedback) nextRef.current?.focus();
    else if (!useChoices) inputRef.current?.focus();
  }, [index, feedback, useChoices, run]);

  const changeDisplay = (value: Display) => {
    setDisplay(value);
    try {
      window.localStorage.setItem(DISPLAY_KEY, value);
    } catch {
      /* chỉ là tiện ích, bỏ qua */
    }
  };

  /** Đổi nhóm / độ khó / hình thức → bắt đầu lượt mới ngay (không hỏi xác nhận). */
  const changeSetup = (next: { group?: VerbGroupFilter; difficulty?: DifficultyFilter; mode?: PracticeMode }) => {
    setParams(
      {
        group: String(next.group ?? group),
        difficulty: next.difficulty ?? difficulty,
        mode: next.mode ?? mode,
      },
      { replace: true },
    );
  };

  async function check(value: string) {
    if (!question || feedback || busy) return;
    if (!value.trim()) {
      setError("Vui lòng nhập đáp án.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await checkConjugationAnswer(formId, question.id, value.trim());
      const nextAnswers = { ...answers, [String(question.id)]: value.trim() };
      const nextChecked = { ...checked, [String(question.id)]: res };
      setAnswers(nextAnswers);
      setChecked(nextChecked);
      setStreak((n) => (res.correct ? n + 1 : 0));
      // Lượt chính: kiểm tra xong câu cuối → lưu kết quả ngay.
      if (run?.kind === "main" && Object.keys(nextChecked).length === questions.length) void save(nextAnswers);
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
      const res = await submitConjugationPractice(formId, group, difficulty, mode, finalAnswers);
      setResult(res);
      setSaveState("idle");
      for (const key of ["conjugation-form", "conjugation-forms", "streak", "coin-history"])
        void cache.invalidateQueries({ queryKey: [key] });
    } catch {
      setSaveState("error");
    }
  }

  function next() {
    if (!isLast) {
      setIndex(index + 1);
      setInput("");
      return;
    }
    // Lượt chính: kết quả đang lưu / lưu lỗi thì màn kết quả hiện trạng thái và nút "Lưu lại".
    setFinished(true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Không bắt Enter khi đang gõ IME (chọn Kanji / Hiragana).
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!feedback) void check(input);
  }

  const formName = detail.data ? `${detail.data.nameVi}` : session.data?.nameVi ?? "";
  const counts = detail.data?.questionCountByGroup ?? {};
  const wrongQuestions = questions.filter((q) => checked[String(q.id)] && !checked[String(q.id)].correct);
  const nextLabel = isLast ? "Xem kết quả" : "Từ tiếp theo";

  return (
    <div className="cj2-page">
      <ConjugationFormTiles
        activeId={formId}
        onSelect={(form) =>
          form.id !== formId && navigate(`/conjugations/${form.id}/practice?group=0&difficulty=ALL&mode=${mode}`)
        }
      />

      <section className="cj2-card" aria-label="Luyện tập thể chia">
        {!finished && (
          <div className="cj2-progress">
            <strong>
              {run?.kind === "review" && "Ôn lại · "}Câu {Math.min(index + 1, Math.max(questions.length, 1))} /{" "}
              {questions.length || "—"}
            </strong>
            <div
              className="cj2-progress-track"
              role="progressbar"
              aria-label="Số câu đã kiểm tra"
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={doneCount}
            >
              <span style={{ width: `${questions.length ? (doneCount / questions.length) * 100 : 0}%` }} />
            </div>
            <span className="cj2-streak">
              🔥 <b>{streak}</b> câu đúng liên tiếp
            </span>
          </div>
        )}

        <div className="cj2-controls">
          <button
            type="button"
            className="cj2-help-btn"
            aria-label="Hướng dẫn"
            aria-expanded={showHelp}
            onClick={() => setShowHelp((v) => !v)}
          >
            ?
          </button>
          <button
            type="button"
            className="cj2-btn cj2-btn-outline"
            disabled={!detail.data}
            onClick={() => setShowMaterial(true)}
          >
            💡 Xem cách chia
          </button>

          <fieldset className="cj2-radio-box is-dashed">
            <legend>Nhóm động từ:</legend>
            {GROUPS.map((option) => {
              const count = counts[String(option.value)];
              return (
                <label key={option.value} title={count !== undefined ? `${count} câu` : undefined}>
                  <input
                    type="radio"
                    name="cj2-group"
                    checked={group === option.value}
                    disabled={!!detail.data && count === 0 && group !== option.value}
                    onChange={() => changeSetup({ group: option.value })}
                  />
                  {option.label}
                </label>
              );
            })}
          </fieldset>

          <label className="cj2-select">
            Độ khó:
            <select
              value={difficulty}
              onChange={(event) => changeSetup({ difficulty: parseDifficulty(event.target.value) })}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === "ALL" ? "Tất cả" : option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cj2-controls is-right">
          <fieldset className="cj2-radio-box">
            <legend>Hình thức:</legend>
            <label>
              <input type="radio" name="cj2-mode" checked={mode === "typed"} onChange={() => changeSetup({ mode: "typed" })} />
              Nhập đáp án
            </label>
            <label>
              <input
                type="radio"
                name="cj2-mode"
                checked={mode === "choice"}
                onChange={() => changeSetup({ mode: "choice" })}
              />
              Trắc nghiệm
            </label>
          </fieldset>
          <fieldset className="cj2-radio-box">
            <legend>Hiển thị:</legend>
            {DISPLAYS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="cj2-display"
                  checked={display === option.value}
                  onChange={() => changeDisplay(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        </div>

        {showHelp && (
          <p className="cj2-help" role="note">
            Chia động từ sang <b>{formName}</b>. Chọn nhóm động từ, độ khó và hình thức làm bài (tự gõ hoặc trắc
            nghiệm); đổi lựa chọn sẽ bắt đầu lượt mới ngay. Đáp án nhập được bằng Kanji hoặc Hiragana. Làm hết lượt thì kết
            quả được lưu vào tiến độ học tập.
          </p>
        )}

        {session.isLoading ? (
          <p className="cj2-muted" role="status">
            Đang tải câu hỏi...
          </p>
        ) : session.isError ? (
          <div className="cj2-empty" role="alert">
            <p>
              {(session.error as { response?: { status?: number } })?.response?.status === 404
                ? "Chưa có câu luyện tập cho nhóm động từ và độ khó đã chọn."
                : "Không tải được dữ liệu, hãy thử lại sau."}
            </p>
            <button type="button" className="cj2-btn cj2-btn-light" onClick={() => session.refetch()}>
              Thử lại
            </button>
          </div>
        ) : finished && run ? (
          <PracticeResult
            run={run}
            checked={checked}
            result={run.kind === "main" ? result : null}
            saveState={run.kind === "main" ? saveState : "idle"}
            onRetrySave={() => void save(answers)}
            display={display}
            wrongQuestions={wrongQuestions}
            totalInForm={counts[String(group)]}
            onRetry={() => startRun(run)}
            onReview={() => startRun({ kind: "review", questions: wrongQuestions })}
            newRoundCount={session.data?.questions.length ?? 0}
            onNewRound={() => setRound((n) => n + 1)}
          />
        ) : question ? (
          <>
            <div className="cj2-question">
              <p>
                Hãy chia sang <b>{formName}</b>
              </p>
              <div className="cj2-verb">
                <VerbText verb={question.verb} reading={question.reading} display={display} />
              </div>
              {question.meaningVi && <p className="cj2-meaning">{question.meaningVi}</p>}
            </div>

            {useChoices ? (
              <fieldset className="cj2-choices" disabled={!!feedback || busy}>
                <legend className="sg-visually-hidden">Chọn đáp án</legend>
                {question.options!.map((option, i) => {
                  const chosen = answers[String(question.id)] === option;
                  const state = !feedback
                    ? ""
                    : option === feedback.correctAnswer || feedback.acceptedAnswers.includes(option)
                      ? " is-correct"
                      : chosen
                        ? " is-wrong"
                        : "";
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`cj2-choice${state}`}
                      aria-pressed={chosen}
                      onClick={() => void check(option)}
                    >
                      <span className="cj2-choice-key">{String.fromCharCode(65 + i)}</span>
                      <span lang="ja">{option}</span>
                    </button>
                  );
                })}
              </fieldset>
            ) : (
              <input
                ref={inputRef}
                className={`cj2-input${feedback ? (feedback.correct ? " is-correct" : " is-wrong") : ""}`}
                aria-label="Đáp án của bạn"
                lang="ja"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={100}
                placeholder="Nhập đáp án..."
                value={feedback ? (answers[String(question.id)] ?? input) : input}
                readOnly={!!feedback}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
              />
            )}

            {error && (
              <p className="cj2-error" role="alert">
                {error}
              </p>
            )}

            {feedback && (
              <div className={`cj2-feedback ${feedback.correct ? "is-correct" : "is-wrong"}`} role="status">
                <strong className="cj2-feedback-title">{feedback.correct ? "✅ Chính xác!" : "❌ Chưa đúng"}</strong>
                <p className="cj2-feedback-main" lang="ja">
                  {verbLine(question)} → {answerText(feedback, "furigana")}
                </p>
                {question.meaningVi && <p className="cj2-muted">{question.meaningVi}</p>}
                {question.verbGroup && <small className="cj2-muted">Nhóm {question.verbGroup}</small>}
                {feedback.explanation && (
                  <div className="cj2-feedback-rule">
                    <b>Quy tắc chia {formName}</b>
                    <p className="cj2-pre">{feedback.explanation}</p>
                  </div>
                )}
              </div>
            )}

            <div className="cj2-actions">
              {feedback ? (
                <button
                  ref={nextRef}
                  type="button"
                  className="cj2-btn cj2-btn-primary cj2-btn-big"
                  onClick={next}
                  disabled={busy}
                >
                  ➜ {nextLabel} <span className="cj2-key">(Enter)</span>
                </button>
              ) : !useChoices ? (
                <button
                  type="button"
                  className="cj2-btn cj2-btn-primary cj2-btn-big"
                  onClick={() => void check(input)}
                  disabled={busy || !input.trim()}
                >
                  ✓ Kiểm tra <span className="cj2-key">(Enter)</span>
                </button>
              ) : null}
            </div>

            <p className="cj2-hint">
              ⌨️ {useChoices ? "Bấm vào đáp án để chọn" : "Nhấn Enter để kiểm tra đáp án"} • Nhấn Enter lần nữa để
              sang từ tiếp theo
            </p>
          </>
        ) : (
          <div className="cj2-empty">Chưa có câu luyện tập.</div>
        )}
      </section>

      {showMaterial && detail.data && (
        <ConjugationMaterialModal
          nameVi={detail.data.nameVi}
          nameJp={detail.data.nameJp}
          description={detail.data.description}
          materialContent={detail.data.materialContent}
          onClose={() => setShowMaterial(false)}
        />
      )}
    </div>
  );
}

/** Màn kết quả: chỉ liệt kê các câu sai kèm đáp án đúng (không hiện câu học viên đã gõ). */
function PracticeResult({
  run,
  checked,
  result,
  saveState,
  onRetrySave,
  display,
  wrongQuestions,
  totalInForm,
  newRoundCount,
  onRetry,
  onReview,
  onNewRound,
}: {
  run: Run;
  checked: Record<string, ConjugationCheckResult>;
  result: ConjugationPracticeResult | null;
  saveState: "idle" | "saving" | "error";
  onRetrySave: () => void;
  display: Display;
  wrongQuestions: ConjugationQuestion[];
  totalInForm: number | undefined;
  newRoundCount: number;
  onRetry: () => void;
  onReview: () => void;
  onNewRound: () => void;
}) {
  const total = run.questions.length;
  const correct = total - wrongQuestions.length;
  return (
    <div className="cj2-result" aria-live="polite">
      <span className="cj2-result-icon" aria-hidden="true">
        {wrongQuestions.length === 0 ? "🎉" : "📚"}
      </span>
      <h2>{run.kind === "review" ? "Ôn lại xong!" : "Hoàn thành!"}</h2>
      <p>
        Bạn đúng{" "}
        <b>
          {correct}/{total}
        </b>{" "}
        câu
      </p>
      {result && (
        <p className={result.passed ? "cj2-pass" : "cj2-fail"}>
          {result.passed
            ? `Đạt (${Math.round(Number(result.score))}%)`
            : `Chưa đạt ${Math.round(Number(result.score))}% — cần tối thiểu ${Math.round(Number(result.passingScore))}%`}
          {result.coinsAwarded > 0 && ` · +${result.coinsAwarded} xu cho lần đạt đầu tiên`}
        </p>
      )}
      {saveState === "saving" && (
        <p className="cj2-muted" role="status">
          Đang lưu kết quả lượt luyện tập...
        </p>
      )}
      {saveState === "error" && (
        <p className="cj2-error" role="alert">
          Chưa lưu được kết quả.{" "}
          <button type="button" className="cj2-btn cj2-btn-outline" onClick={onRetrySave}>
            Lưu lại
          </button>
        </p>
      )}

      {wrongQuestions.length > 0 && (
        <div className="cj2-review">
          <h3>Các câu cần ôn lại:</h3>
          <ul>
            {wrongQuestions.map((q) => (
              <li key={q.id} lang="ja">
                <VerbText verb={q.verb} reading={q.reading} display={display} /> →{" "}
                <b>{answerText(checked[String(q.id)], display)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {run.kind === "main" && totalInForm !== undefined && (
        <p className="cj2-muted cj2-small">
          Mỗi lượt lấy ngẫu nhiên {total} / {totalInForm} câu
        </p>
      )}

      <div className="cj2-actions">
        <button type="button" className="cj2-btn cj2-btn-light" onClick={onRetry}>
          ↻ Làm lại
        </button>
        {wrongQuestions.length > 0 && (
          <button type="button" className="cj2-btn cj2-btn-danger" onClick={onReview}>
            ↺ Ôn lại {wrongQuestions.length} câu sai
          </button>
        )}
        <button type="button" className="cj2-btn cj2-btn-primary" onClick={onNewRound} autoFocus>
          + Làm tiếp {newRoundCount} câu <span className="cj2-key">(Enter)</span>
        </button>
      </div>
    </div>
  );
}
