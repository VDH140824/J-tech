import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  saveExercise,
  addQuestionBankItemsToExercise,
  importExerciseQuestions,
  getExercise,
  getExercises,
  exerciseError,
  type ExerciseInput,
  type ExerciseQuestionInput,
  type VocabularyExercise,
} from "../../../api/vocabularyExerciseApi";
import { getQuestionBank, type QuestionBankSummary } from "../../../api/questionBankApi";
import "./VocabularyExercises.css";

type Settings = Omit<ExerciseInput, "questions">;
const statusNames = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", ARCHIVED: "Đã lưu trữ" };
const templateUrl = "/Form_question.xlsx";

export function VocabularyExerciseTab({ lessonId, onBack }: {
  lessonId: number;
  onBack: () => void;
}) {
  const [test, setTest] = useState<VocabularyExercise | null>(null);
  const [questions, setQuestions] = useState<ExerciseQuestionInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [questionDraft, setQuestionDraft] = useState<ExerciseQuestionInput | null>(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<QuestionBankSummary[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<number[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<Settings>({
    title: "Exercise từ vựng",
    description: "Chọn đáp án đúng cho mỗi câu hỏi.",
    durationMinutes: 10,
    passingScore: 70,
    status: "DRAFT",
  });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setBankQuestions([]);
    setSelectedBankIds([]);
    setShowQuestionBank(false);
    setLoading(true);
    setError("");
    getExercises(lessonId, controller.signal)
      .then(async (tests) => {
        if (!active) return;
        // The API sorts newest first. Keep legacy exercises and manage the newest one.
        const existing = tests[0] ? await getExercise(tests[0].id) : null;
        if (!active) return;
        setTest(existing);
        setQuestions(existing?.questions ?? []);
        if (existing)
          setSettings({
            title: existing.title,
            description: existing.description || "",
            durationMinutes: existing.durationMinutes,
            passingScore: existing.passingScore,
            status: existing.status,
          });
      })
      .catch((failure) => {
        if (active) setError(exerciseError(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [lessonId, reload]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveExercise(lessonId, { ...settings, questions });
      setTest(saved);
      setNotice(
        saved.status === "PUBLISHED"
          ? `Đã xuất bản exercise với ${saved.questionCount} câu.`
          : `Đã lưu exercise với ${saved.questionCount} câu ở trạng thái ${statusNames[saved.status].toLowerCase()}.`,
      );
    } catch (failure) {
      setError(exerciseError(failure));
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <div
        className="admin-loading-state"
        role="status"
      >
        <div className="admin-loading-spinner" />
        <p>Đang tải câu hỏi exercise của bài...</p>
      </div>
    );
  const hasHistory = !!test && test.attemptCount > 0;
  const canSave = questions.length > 0 && questions.every((question) => {
    if (!question.content.trim()) return false;
    if (question.questionType === "MCQ") return question.options.length >= 2
      && question.options.every((option) => option.trim().length > 0)
      && question.options.includes(question.correctAnswer);
    if (question.questionType === "FILL_IN") return !!question.correctAnswer.trim();
    const pairs = Object.entries(question.matches);
    return pairs.length >= 2 && pairs.every(([left, right]) => !!left.trim() && !!right.trim());
  });
  const openQuestionEditor = (index?: number) => {
    if (busy) return;
    const source = index === undefined ? null : questions[index];
    setEditingIndex(index ?? -1);
    setQuestionDraft(source ? { ...source, options: [...source.options], matches: { ...source.matches } } : {
      sourceVocabularyId: null,
      questionType: "MCQ",
      content: "",
      explanation: "",
      difficulty: "EASY",
      options: ["", "", "", ""],
      correctAnswer: "",
      matches: {},
    });
  };
  const closeQuestionEditor = () => {
    if (busy) return;
    setEditingIndex(null);
    setQuestionDraft(null);
  };
  const persistQuestions = async (nextQuestions: ExerciseQuestionInput[], successText: string) => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveExercise(lessonId, { ...settings, questions: nextQuestions });
      setTest(saved);
      setQuestions(saved.questions);
      setSettings({
        title: saved.title,
        description: saved.description || "",
        durationMinutes: saved.durationMinutes,
        passingScore: saved.passingScore,
        status: saved.status,
      });
      setNotice(`${successText} Exercise hiện có ${saved.questionCount} câu.`);
      return true;
    } catch (failure) {
      setError(exerciseError(failure));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const saveQuestionDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (!questionDraft || editingIndex === null || busy) return;
    if (!questionDraft.content.trim() || questionDraft.options.length < 2
      || questionDraft.options.some((option) => !option.trim())
      || !questionDraft.options.includes(questionDraft.correctAnswer)) {
      setError("Nhập nội dung câu hỏi, đủ các đáp án và chọn đáp án đúng.");
      return;
    }
    const next = editingIndex < 0
      ? [...questions, questionDraft]
      : questions.map((question, index) => index === editingIndex ? questionDraft : question);
    const saved = await persistQuestions(next, editingIndex < 0 ? "Đã thêm câu hỏi." : "Đã cập nhật câu hỏi.");
    if (saved) {
      setEditingIndex(null);
      setQuestionDraft(null);
    }
  };
  const importQuestionsFromExcel = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await importExerciseQuestions(lessonId, file);
      setTest(saved);
      setQuestions(saved.questions);
      setSettings({
        title: saved.title,
        description: saved.description || "",
        durationMinutes: saved.durationMinutes,
        passingScore: saved.passingScore,
        status: saved.status,
      });
      setNotice(`Đã nhập ${saved.questionCount} câu hỏi từ Excel.`);
    } catch (failure) {
      setError(exerciseError(failure));
    } finally {
      setBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };
  const openQuestionBank = async () => {
    setShowQuestionBank(true);
    if (bankQuestions.length || bankLoading) return;
    setBankLoading(true);
    setError("");
    try {
      const firstPage = await getQuestionBank({ skill: "VOCABULARY", status: "ACTIVE", lessonId, page: 0, size: 100 });
      const pages = await Promise.all(Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
        getQuestionBank({ skill: "VOCABULARY", status: "ACTIVE", lessonId, page: index + 1, size: 100 }),
      ));
      const eligible = [firstPage, ...pages].flatMap((page) => page.content).filter((question) => question.exerciseQuestion);
      setBankQuestions(eligible);
      setSelectedBankIds(eligible.slice(0, 7).map((question) => question.id));
    } catch (failure) {
      setError(exerciseError(failure));
    } finally {
      setBankLoading(false);
    }
  };
  const addSelectedBankQuestions = async () => {
    if (!selectedBankIds.length || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await addQuestionBankItemsToExercise(lessonId, {
        ...settings,
        questionIds: selectedBankIds,
      });
      setTest(saved);
      setQuestions(saved.questions);
      setSettings({
        title: saved.title,
        description: saved.description || "",
        durationMinutes: saved.durationMinutes,
        passingScore: saved.passingScore,
        status: saved.status,
      });
      setNotice(`Đã cập nhật exercise với ${saved.questionCount} câu.`);
      setShowQuestionBank(false);
    } catch (failure) {
      setError(exerciseError(failure));
    } finally {
      setBusy(false);
    }
  };
  const answerSummary = (question: ExerciseQuestionInput) => question.questionType === "MCQ"
    ? question.options.map((option, index) =>
      `${String.fromCharCode(65 + index)}. ${option}${option === question.correctAnswer ? " (Đúng)" : ""}`,
    ).join("\n") || "—"
    : question.questionType === "MATCHING"
      ? Object.entries(question.matches).map(([left, right]) => `${left} → ${right}`).join("\n") || "—"
      : question.correctAnswer || "—";
  return (
    <div className="mod-assessment-tab">
      <div className="mod-chapter-back-row">
        <button type="button" className="mod-btn-back" onClick={onBack}>← Quay về danh sách từ vựng</button>
      </div>
      <div className="mod-assessment-heading mod-vocab-question-header">
        <div>
          <h3>Danh sách câu hỏi từ vựng</h3>
          <p>Câu hỏi thuộc exercise của bài học này.</p>
        </div>
      </div>
      <div className="modal-actions-row mod-vocab-question-toolbar">
        <button type="button" className="mod-btn-add mod-question-btn--secondary" disabled={busy || bankLoading}
          onClick={() => void openQuestionBank()}>
          {bankLoading ? "Đang tải Question Bank…" : "Thêm từ Question Bank"}
        </button>
        <a className="mod-btn-add mod-question-btn--secondary" href={templateUrl} download="Form_question.xlsx">
          Tải form Excel
        </a>
        <input ref={importInputRef} type="file" accept=".xlsx" hidden
          onChange={(event) => void importQuestionsFromExcel(event.target.files?.[0])} />
        <button type="button" className="mod-btn-add mod-question-btn--secondary" disabled={busy}
          onClick={() => importInputRef.current?.click()}>
          Nhập từ Excel
        </button>
        <button type="button" className="mod-btn-add mod-question-btn--primary" disabled={busy} onClick={() => openQuestionEditor()}>
          Thêm câu hỏi
        </button>
      </div>
      {showQuestionBank && (
        <section className="admin-table-card mod-vocab-question-list" aria-label="Chọn câu hỏi từ Question Bank">
          <div className="mod-assessment-heading">
            <div>
              <h3>Chọn câu hỏi từ Question Bank</h3>
              <p>Hiển thị câu Từ vựng đang dùng, được đánh dấu Exercise và thuộc bài học này. Mỗi lần tạo nên chọn khoảng 5–7 câu; có thể thêm nhiều câu hơn.</p>
            </div>
          </div>
          {bankLoading ? <p className="mod-assessment-list-note">Đang tải câu hỏi…</p> : bankQuestions.length ? (
            <div className="admin-table-responsive">
              <table className="admin-dekiru-table">
                <thead><tr><th>Chọn</th><th>Loại câu hỏi</th><th>Độ khó</th><th>Nội dung</th></tr></thead>
                <tbody>{bankQuestions.map((question) => (
                  <tr key={question.id}>
                    <td><input type="checkbox" checked={selectedBankIds.includes(question.id)} disabled={busy}
                      onChange={(event) => setSelectedBankIds((ids) => event.target.checked
                        ? [...ids, question.id]
                        : ids.filter((id) => id !== question.id))} /></td>
                    <td>{question.questionType === "MCQ" ? "Trắc nghiệm" : question.questionType === "FILL_IN" ? "Điền đáp án" : "Nối nghĩa"}</td>
                    <td>{question.difficulty === "EASY" ? "Dễ" : question.difficulty === "MEDIUM" ? "Trung bình" : "Khó"}</td>
                    <td>{question.content}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="mod-assessment-list-note">Bài học chưa có câu Từ vựng nào được đánh dấu Exercise trong Question Bank.</p>}
          <div className="modal-actions-row">
            <span>{selectedBankIds.length} câu được chọn</span>
            <button type="button" className="btn-modal-cancel" disabled={busy} onClick={() => setShowQuestionBank(false)}>Đóng</button>
            <button type="button" className="btn-modal-submit" disabled={busy || bankLoading || !selectedBankIds.length}
              onClick={() => void addSelectedBankQuestions()}>{busy ? "Đang thêm…" : "Thêm câu đã chọn vào bài tập"}</button>
          </div>
        </section>
      )}
      {error && (
        <div
          className="mod-assessment-error"
          role="alert"
        >
          {error}
          <button
            type="button"
            className="btn-modal-cancel"
            disabled={busy}
            onClick={() => setReload((value) => value + 1)}
          >
            Tải lại
          </button>
        </div>
      )}
      {notice && (
        <div
          className="mod-assessment-success"
          role="status"
        >
          ✓ {notice}
        </div>
      )}
      {test && (
        <div className="mod-assessment-info">
          <span>{statusNames[test.status]}</span>
          <span>{test.questionCount} câu</span>
          <span>{test.attemptCount} lượt làm</span>
        </div>
      )}
      {hasHistory && (
        <p className="mod-assessment-list-note">
          Exercise này đã có lượt làm. Khi lưu thay đổi, hệ thống tạo phiên bản mới và giữ nguyên lịch sử cũ.
        </p>
      )}
      <div className="mod-vocab-exercise-status">
        <label htmlFor="generated-mini-status">Trạng thái exercise</label>
        <select
          id="generated-mini-status"
          className="modal-input"
          value={settings.status}
          disabled={busy}
          onChange={(event) => setSettings({ ...settings, status: event.target.value as Settings["status"] })}
        >
          {Object.entries(statusNames).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <span>Chọn “Đã xuất bản” rồi lưu để học sinh làm exercise.</span>
      </div>
      <div className="admin-table-card mod-vocab-question-list">
        <div className="admin-table-responsive">
          <table className="admin-dekiru-table">
            <thead>
              <tr>
                <th>Loại câu hỏi</th><th>Độ khó</th><th>Nội dung</th><th>Giải thích</th>
                <th>Đáp án</th><th>Thứ tự hiển thị</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question, questionIndex) => (
                <tr key={question.sourceVocabularyId ?? questionIndex}>
                  <td>{question.questionType === "MCQ" ? "Trắc nghiệm" : question.questionType === "FILL_IN" ? "Điền đáp án" : "Nối nghĩa"}</td>
                  <td>{question.difficulty === "EASY" ? "Dễ" : question.difficulty === "MEDIUM" ? "Trung bình" : "Khó"}</td>
                  <td>{question.content || "—"}</td>
                  <td>{question.explanation || "—"}</td>
                  <td>{answerSummary(question)}</td>
                  <td>{questionIndex + 1}</td>
                  <td>{statusNames[settings.status]}</td>
                  <td>
                    <div className="mod-vocab-question-actions">
                      <button type="button" className="mod-btn-add mod-question-btn--secondary"
                        disabled={busy || question.questionType !== "MCQ"}
                        title={question.questionType !== "MCQ" ? "Chỉnh sửa câu dạng này trong Question Bank." : undefined}
                        onClick={() => openQuestionEditor(questionIndex)}>
                        Chỉnh sửa
                      </button>
                      <button type="button" className="btn-modal-delete" disabled={busy || questions.length <= 1}
                        onClick={() => {
                          if (window.confirm("Xóa câu hỏi này khỏi exercise? Lịch sử làm bài cũ sẽ được giữ nguyên."))
                            void persistQuestions(questions.filter((item) => item !== question), "Đã xóa câu hỏi.");
                        }}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!questions.length && <p className="mod-assessment-list-note">Chưa có câu hỏi trong exercise.</p>}
        </div>
      </div>
      {questionDraft && editingIndex !== null && (
        <div className="mod-vocab-question-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeQuestionEditor();
        }}>
          <form className="mod-vocab-question-modal" role="dialog" aria-modal="true"
            aria-labelledby="vocab-question-modal-title" onSubmit={(event) => void saveQuestionDraft(event)}>
            <header className="mod-vocab-question-modal-header">
              <h3 id="vocab-question-modal-title">{editingIndex < 0 ? "Thêm câu hỏi từ vựng" : `Chỉnh sửa câu hỏi #${editingIndex + 1}`}</h3>
              <button type="button" className="mod-btn-back" aria-label="Đóng" disabled={busy} onClick={closeQuestionEditor}>×</button>
            </header>
            <div className="mod-vocab-question-modal-body">
              <p>Nội dung, giải thích và đáp án đều được lưu vào exercise.</p>
              <div className="modal-grid-2">
                <label className="modal-field-group">Loại câu hỏi *
                  <select className="modal-input" value="MCQ" disabled><option value="MCQ">Trắc nghiệm</option></select>
                </label>
                <label className="modal-field-group">Độ khó *
                  <select className="modal-input" value={questionDraft.difficulty}
                    onChange={(event) => setQuestionDraft({ ...questionDraft, difficulty: event.target.value as ExerciseQuestionInput["difficulty"] })}>
                    <option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option>
                  </select>
                </label>
              </div>
              <label className="modal-field-group">Nội dung *
                <textarea className="modal-textarea" required maxLength={10000} value={questionDraft.content}
                  onChange={(event) => setQuestionDraft({ ...questionDraft, content: event.target.value })} />
              </label>
              <label className="modal-field-group">Giải thích
                <textarea className="modal-textarea" maxLength={10000} value={questionDraft.explanation}
                  onChange={(event) => setQuestionDraft({ ...questionDraft, explanation: event.target.value })} />
              </label>
              <div className="mod-vocab-question-modal-answers">
                <strong>Các lựa chọn và đáp án đúng *</strong>
                {questionDraft.options.map((option, optionIndex) => (
                  <label className="mod-assessment-option" key={optionIndex}>
                    <span>Đáp án {String.fromCharCode(65 + optionIndex)} *</span>
                    <input type="radio" name="vocab-question-correct" aria-label={`Đáp án ${String.fromCharCode(65 + optionIndex)} là đúng`}
                      checked={questionDraft.correctAnswer === option && !!option}
                      onChange={() => setQuestionDraft({ ...questionDraft, correctAnswer: option })} />
                    <input className="modal-input" required maxLength={1000} value={option}
                      onChange={(event) => setQuestionDraft((current) => current ? {
                        ...current,
                        options: current.options.map((value, index) => index === optionIndex ? event.target.value : value),
                        correctAnswer: current.correctAnswer === option ? event.target.value : current.correctAnswer,
                      } : current)} />
                  </label>
                ))}
              </div>
            </div>
            <footer className="modal-actions-row">
              <button type="button" className="btn-modal-cancel" disabled={busy} onClick={closeQuestionEditor}>Hủy</button>
              <button type="submit" className="btn-modal-submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu câu hỏi"}</button>
            </footer>
          </form>
        </div>
      )}
      {!canSave && (
        <p className="mod-assessment-error">
          Thêm ít nhất một câu hỏi, nội dung và đáp án hợp lệ trước khi lưu exercise.
        </p>
      )}
      <form
        onSubmit={save}
        className="mod-assessment-form mod-assessment-generated-form"
      >
        <fieldset
          className="mod-content-fieldset"
          disabled={busy}
        >
          <div className="modal-grid-2">
            <div className="modal-field-group mod-content-wide">
              <label
                className="modal-label"
                htmlFor="generated-mini-title"
              >
                Tên exercise *
              </label>
              <input
                id="generated-mini-title"
                className="modal-input"
                required
                maxLength={200}
                value={settings.title}
                onChange={(event) => setSettings({ ...settings, title: event.target.value })}
              />
            </div>
            <div className="modal-field-group">
              <label
                className="modal-label"
                htmlFor="generated-mini-duration"
              >
                Thời gian (phút)
              </label>
              <input
                id="generated-mini-duration"
                className="modal-input"
                type="number"
                min={5}
                max={30}
                required
                value={settings.durationMinutes}
                onChange={(event) =>
                  setSettings({ ...settings, durationMinutes: Number(event.target.value) })
                }
              />
            </div>
            <div className="modal-field-group">
              <label
                className="modal-label"
                htmlFor="generated-mini-score"
              >
                Điểm đạt / 100
              </label>
              <input
                id="generated-mini-score"
                className="modal-input"
                type="number"
                min={0}
                max={100}
                step="0.01"
                required
                value={settings.passingScore}
                onChange={(event) =>
                  setSettings({ ...settings, passingScore: Number(event.target.value) })
                }
              />
            </div>
            <div className="modal-field-group">
              <label
                className="modal-label"
                htmlFor="generated-mini-instructions"
              >
                Hướng dẫn
              </label>
              <textarea
                id="generated-mini-instructions"
                className="modal-textarea"
                maxLength={10000}
                rows={2}
                value={settings.description}
                onChange={(event) => setSettings({ ...settings, description: event.target.value })}
              />
            </div>
          </div>
        </fieldset>
        <p className="mod-assessment-list-note">
          Chọn trạng thái Đã xuất bản rồi bấm Xuất bản exercise để học sinh làm bài.
        </p>
        <div className="modal-actions-row">
          <button
            type="submit"
            className="btn-modal-submit"
            disabled={busy || !canSave}
          >
            {busy
              ? "Đang lưu..."
              : settings.status === "PUBLISHED"
                ? "Xuất bản exercise"
                : test
                  ? "Cập nhật exercise"
                  : `Tạo exercise từ ${questions.length} câu hỏi`}
          </button>
        </div>
      </form>
    </div>
  );
}
