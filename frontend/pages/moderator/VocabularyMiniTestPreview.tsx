import { useEffect, useMemo, useRef, useState } from "react";
import { gradeMiniTestPreview, miniTestError, type MiniTestResult, type VocabularyMiniTest } from "../../api/vocabularyMiniTestApi";

export function VocabularyMiniTestPreview({ test, onBack, grade = gradeMiniTestPreview }: {
  test: VocabularyMiniTest;
  onBack: () => void;
  grade?: (id: number, answers: Record<string, string>) => Promise<MiniTestResult>;
}) {
  const [started, setStarted] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(test.durationMinutes * 60);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MiniTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [shuffleRound, setShuffleRound] = useState(0);
  const submitting = useRef(false);
  const autoSubmitted = useRef(false);
  const matchingChoices = useMemo(() => Object.fromEntries(test.questions.filter(question => question.questionType === "MATCHING").map(question => {
    const choices = Object.values(question.matches);
    for (let index = choices.length - 1; index > 0; index--) {
      const position = Math.floor(Math.random() * (index + 1));
      [choices[index], choices[position]] = [choices[position], choices[index]];
    }
    return [question.id, choices];
  })), [test, shuffleRound]);
  const choiceOrders = useMemo(() => Object.fromEntries(test.questions.map(question => {
    const choices = [...question.options];
    for (let index = choices.length - 1; index > 0; index--) {
      const position = Math.floor(Math.random() * (index + 1));
      [choices[index], choices[position]] = [choices[position], choices[index]];
    }
    return [question.id, choices];
  })), [test, shuffleRound]);

  const submit = async () => {
    if (submitting.current || result) return;
    submitting.current = true; setBusy(true); setError(""); setConfirmSubmit(false);
    try { setResult(await grade(test.id, answers)); }
    catch (failure) { setError(miniTestError(failure)); }
    finally { submitting.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (!started || result) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update(); const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [deadline, started, result]);
  useEffect(() => {
    if (started && remaining === 0 && !result && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submit();
    }
  }, [remaining, started, result]);
  const start = () => {
    setShuffleRound(value => value + 1);
    autoSubmitted.current = false; setAnswers({}); setResult(null); setError(""); setConfirmSubmit(false);
    setRemaining(test.durationMinutes * 60); setDeadline(Date.now() + test.durationMinutes * 60000); setStarted(true);
  };
  const completed = test.questions.filter(question => {
    const answer = answers[question.id];
    if (question.questionType !== "MATCHING") return !!answer?.trim();
    try { return Object.values(JSON.parse(answer || "{}")).filter(Boolean).length === Object.keys(question.matches).length; } catch { return false; }
  }).length;
  const locked = busy || !!result || remaining === 0;

  return <div className="mod-mini-preview">
    <div className="mod-mini-heading"><div><h3>{test.title}</h3><p>Chế độ làm thử dành cho moderator, không ghi vào lịch sử học sinh.</p></div><button type="button" className="btn-modal-cancel" disabled={busy} onClick={onBack}>Về danh sách</button></div>
    {!started ? <div className="mod-mini-start"><div className="mod-mini-info"><span>{test.questions.length} câu hỏi</span><span>{test.durationMinutes} phút</span><span>Điểm đạt: {test.passingScore}/100</span></div><p>{test.description || "Hoàn thành các câu hỏi và nộp bài để xem điểm cùng giải thích đáp án."}</p><button className="btn-modal-submit" onClick={start}>Bắt đầu làm thử</button></div> : <>
      <div className={`mod-mini-timer ${remaining < 60 ? "urgent" : ""}`}><span>Đã trả lời {completed}/{test.questions.length} câu</span><strong aria-label="Thời gian còn lại">{result ? "Đã nộp bài" : `${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`}</strong></div>
      {error && <div className="mod-mini-error" role="alert">{error}<button className="btn-modal-cancel" disabled={busy} onClick={() => void submit()}>Thử nộp lại</button></div>}
      {result && <div className={`mod-mini-result ${result.passed ? "passed" : "failed"}`} role="status"><strong>{result.score}/100 — {result.passed ? "Đạt" : "Chưa đạt"}</strong><span>Đúng {result.correctCount}/{result.totalQuestions} câu · Điểm đạt {test.passingScore}</span></div>}
      {test.questions.map((question, index) => {
        const review = result?.questions.find(item => item.questionId === question.id);
        const currentPairs: Record<string, string> = question.questionType === "MATCHING" ? JSON.parse(answers[question.id] || "{}") : {};
        return <article className="mod-mini-question" key={question.id}><h4>Câu {index + 1}{review && <span className={`mod-mini-review-status ${review.correct ? "correct" : "incorrect"}`}>{review.correct ? "Đúng" : "Sai / Chưa trả lời"}</span>}</h4><p className="mod-mini-prompt">{question.content}</p>
          <fieldset disabled={locked} className="mod-content-fieldset">
            {question.questionType === "MCQ" && <div className="mod-mini-answer-options">{choiceOrders[question.id].map((option, position) => <label key={position}><input type="radio" name={`answer-${question.id}`} checked={answers[question.id] === option} onChange={() => setAnswers(current => ({ ...current, [question.id]: option }))} /><span>{option}</span></label>)}</div>}
            {question.questionType === "FILL_IN" && <input className="modal-input" aria-label={`Trả lời câu ${index + 1}`} maxLength={1000} placeholder="Nhập câu trả lời..." value={answers[question.id] || ""} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))} />}
            {question.questionType === "MATCHING" && <div className="mod-mini-matching">{Object.keys(question.matches).map(left => <label key={left}><span>{left}</span><select aria-label={`Nối ${left}`} className="modal-input" value={currentPairs[left] || ""} onChange={event => setAnswers(current => ({ ...current, [question.id]: JSON.stringify({ ...JSON.parse(current[question.id] || "{}"), [left]: event.target.value }) }))}><option value="">Chọn vế tương ứng</option>{matchingChoices[question.id].map(right => <option key={right} value={right}>{right}</option>)}</select></label>)}</div>}
          </fieldset>
          {review && <div className="mod-mini-review"><strong>Đáp án đúng: </strong>{question.questionType === "MATCHING" ? Object.entries(review.matches).map(([left, right]) => `${left} → ${right}`).join("; ") : review.correctAnswer}{review.explanation && <p>{review.explanation}</p>}</div>}
        </article>;
      })}
      <div className="modal-actions-row">{result ? <button className="btn-modal-submit" onClick={start}>Làm thử lại</button> : <>{confirmSubmit && <span role="status">Còn {test.questions.length - completed} câu chưa hoàn thành. Bạn vẫn muốn nộp?</span>}<button className="btn-modal-submit" disabled={busy} onClick={() => completed < test.questions.length && remaining > 0 && !confirmSubmit ? setConfirmSubmit(true) : void submit()}>{busy ? "Đang chấm điểm..." : confirmSubmit ? "Xác nhận nộp bài" : "Nộp bài"}</button></>}</div>
    </>}
  </div>;
}
