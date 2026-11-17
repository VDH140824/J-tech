import { useEffect, useMemo, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  FORMAT_LABEL,
  LEVEL_LABEL,
  SKILL_LABEL,
  TEST_KIND_LABEL,
  chapterLabel,
  chapterOfLesson,
  chaptersOf,
  courseOfChapter,
  createBankQuestion,
  getAvailableTests,
  lessonLabel,
  lessonsOf,
  updateBankQuestion,
  type QuestionBankDetail,
  type QuestionBankInput,
  type QuestionBankTargets,
  type QuestionFormat,
  type QuestionLevel,
  type QuestionSkill,
  type QuestionTest,
} from "../../api/questionBankApi";
import "./QuestionBank.css";

// UC-39 Manage Question Bank — bước 3–11 (tạo), A3/A4 (sửa, BR-29), A7 (hủy), E1 (lỗi dữ liệu).

const MOD_COLOR = "#0d9488";
const SKILLS: QuestionSkill[] = ["VOCABULARY", "KANJI", "GRAMMAR"];
const FORMATS: QuestionFormat[] = ["MCQ", "FILL_IN", "MATCHING"];
const LEVELS: QuestionLevel[] = ["EASY", "MEDIUM", "HARD"];
const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface Pair {
  left: string;
  right: string;
}

interface Props {
  open: boolean;
  /** null = tạo mới */
  detail: QuestionBankDetail | null;
  targets: QuestionBankTargets | null;
  onClose: () => void;
  onSaved: (saved: QuestionBankDetail, isEdit: boolean) => void;
}

function errorMessage(error: unknown, fallback: string): string {
  const message = isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message : undefined;
  return message || fallback;
}

export function QuestionBankFormModal({ open, detail, targets, onClose, onSaved }: Props) {
  const isEdit = detail !== null;
  const locked = isEdit && detail.attempted; // BR-29

  const [skill, setSkill] = useState<QuestionSkill>("VOCABULARY");
  const [questionType, setQuestionType] = useState<QuestionFormat>("MCQ");
  const [courseId, setCourseId] = useState<number | "">("");
  const [chapterId, setChapterId] = useState<number | "">("");
  const [lessonId, setLessonId] = useState<number | "">("");
  const [grammarId, setGrammarId] = useState<number | "">("");
  const [content, setContent] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<QuestionLevel | "">("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [fillAnswer, setFillAnswer] = useState("");
  const [pairs, setPairs] = useState<Pair[]>([{ left: "", right: "" }, { left: "", right: "" }]);
  const [tests, setTests] = useState<QuestionTest[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testIds, setTestIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bước 4 / A3: đổ dữ liệu vào biểu mẫu
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!detail) {
      setSkill("VOCABULARY");
      setQuestionType("MCQ");
      setCourseId("");
      setChapterId("");
      setLessonId("");
      setGrammarId("");
      setContent("");
      setExplanation("");
      setDifficulty("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(null);
      setFillAnswer("");
      setPairs([{ left: "", right: "" }, { left: "", right: "" }]);
      setTestIds([]);
      return;
    }
    setTestIds(detail.tests.map((t) => t.id));
    const s = detail.summary;
    setSkill(s.skill);
    setQuestionType(s.questionType);
    setCourseId(s.courseId ?? "");
    setChapterId(s.chapterId ?? "");
    setLessonId(s.lessonId ?? "");
    setGrammarId(detail.grammarId ?? "");
    setContent(s.content);
    setExplanation(detail.explanation ?? "");
    setDifficulty(s.difficulty);
    const opts = detail.options.length > 0 ? [...detail.options] : ["", "", "", ""];
    setOptions(opts);
    const idx = opts.findIndex((o) => o === detail.correctAnswer);
    setCorrectIndex(idx >= 0 ? idx : null);
    setFillAnswer(s.questionType === "FILL_IN" ? detail.correctAnswer : "");
    const entries = Object.entries(detail.matches ?? {});
    setPairs(entries.length > 0 ? entries.map(([left, right]) => ({ left, right })) : [{ left: "", right: "" }, { left: "", right: "" }]);
  }, [open, detail]);

  // Loại test: mini test của bài học và test chương của chương chứa bài học
  useEffect(() => {
    if (!open || lessonId === "") {
      setTests([]);
      return;
    }
    let cancelled = false;
    setTestsLoading(true);
    getAvailableTests(lessonId, skill)
      .then((list) => {
        if (!cancelled) setTests(list);
      })
      .catch(() => {
        if (!cancelled) setTests([]);
      })
      .finally(() => {
        if (!cancelled) setTestsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lessonId, skill]);

  const chapters = useMemo(() => chaptersOf(targets, courseId), [targets, courseId]);
  const lessons = useMemo(() => lessonsOf(targets, courseId, chapterId, skill), [targets, courseId, chapterId, skill]);
  const grammars = useMemo(
    () => (targets?.grammars ?? []).filter((g) => lessonId !== "" && g.lessonId === lessonId),
    [targets, lessonId],
  );

  if (!open) return null;

  const busy = saving;

  const changeSkill = (next: QuestionSkill) => {
    setSkill(next);
    setLessonId("");
    setGrammarId("");
    if (next === "GRAMMAR") {
      // Ngữ pháp trắc nghiệm luôn đủ 4 lựa chọn A–D (định dạng phần Ngữ pháp đang đọc)
      setOptions((prev) => [...prev, "", "", "", ""].slice(0, 4));
      setCorrectIndex((c) => (c !== null && c < 4 ? c : null));
    }
  };

  // A7: hủy, không lưu thay đổi
  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  // Bước 8 (phía Browser): kiểm tra trước khi gửi
  const validate = (): string | null => {
    if (!content.trim()) return "Nội dung câu hỏi không được để trống.";
    if (!difficulty) return "Vui lòng chọn độ khó.";
    if ((skill === "VOCABULARY" || skill === "KANJI") && lessonId === "") return "Vui lòng chọn bài học.";
    if (skill === "GRAMMAR" && grammarId === "") return "Vui lòng chọn điểm ngữ pháp.";
    if (locked) return null;
    if (questionType === "MCQ") {
      const filled = options.map((o) => o.trim());
      if (skill === "GRAMMAR" && filled.length !== 4) return "Câu trắc nghiệm Ngữ pháp cần đủ 4 lựa chọn A–D.";
      if (filled.some((o) => !o)) return "Lựa chọn không được để trống.";
      if (correctIndex === null) return "Vui lòng chọn đáp án đúng.";
    }
    if (questionType === "FILL_IN" && !fillAnswer.trim()) return "Câu điền đáp án phải có đáp án đúng.";
    if (questionType === "MATCHING") {
      if (pairs.length < 2) return "Câu nối cần ít nhất 2 cặp.";
      if (pairs.some((p) => !p.left.trim() || !p.right.trim())) return "Mỗi cặp nối phải có đủ hai vế.";
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    const payload: QuestionBankInput = {
      skill,
      questionType,
      lessonId: lessonId === "" ? null : lessonId,
      grammarId: grammarId === "" ? null : grammarId,
      content: content.trim(),
      explanation: explanation.trim() || null,
      difficulty: difficulty as QuestionLevel,
      options: questionType === "MCQ" ? options.map((o) => o.trim()) : [],
      correctAnswer:
        questionType === "MCQ" ? (correctIndex === null ? "" : options[correctIndex].trim()) : questionType === "FILL_IN" ? fillAnswer.trim() : "",
      matches: questionType === "MATCHING" ? Object.fromEntries(pairs.map((p) => [p.left.trim(), p.right.trim()])) : {},
      testIds: testIds.filter((id) => tests.some((t) => t.id === id)),
    };
    setSaving(true);
    setError(null);
    try {
      const saved = isEdit ? await updateBankQuestion(detail.summary.id, payload) : await createBankQuestion(payload);
      onSaved(saved, isEdit);
    } catch (e) {
      // E1 / E3 / A4: hiển thị lỗi, không báo thành công
      setError(errorMessage(e, "Không thể lưu câu hỏi. Vui lòng thử lại."));
    } finally {
      setSaving(false);
    }
  };

  const toggleTest = (id: number) =>
    setTestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const renderTests = (kind: "MINI_TEST" | "CHAPTER_TEST", emptyText: string) => {
    const list = tests.filter((t) => t.testType === kind);
    return (
      <div className="qb-test-group">
        <span className="modal-label">{TEST_KIND_LABEL[kind]}</span>
        {lessonId === "" ? (
          <p className="cell-email">Chọn bài học trước.</p>
        ) : testsLoading ? (
          <p className="cell-email">Đang tải...</p>
        ) : list.length === 0 ? (
          <p className="cell-email">{emptyText}</p>
        ) : (
          list.map((t) => (
            <label key={t.id} className="qb-check">
              <input type="checkbox" checked={testIds.includes(t.id)} disabled={busy || t.locked} onChange={() => toggleTest(t.id)} />
              {t.title}
              {t.status === "DRAFT" ? " (nháp)" : ""}
              {t.locked ? " — đã có lượt làm" : ""}
            </label>
          ))
        )}
      </div>
    );
  };

  const setOption = (index: number, value: string) => setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  const setPair = (index: number, side: keyof Pair, value: string) =>
    setPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [side]: value } : p)));

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" style={{ maxWidth: "820px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? `Sửa câu hỏi #${detail.summary.id}` : "Thêm câu hỏi"}</h3>
          <button type="button" className="modal-btn-close" disabled={busy} onClick={handleClose}>
            ✕
          </button>
        </div>

        <form className="modal-form-body" onSubmit={handleSubmit} noValidate>
          {locked && (
            <div className="admin-alert-banner warning qb-banner" role="status">
              🔒 Câu hỏi đã có học viên làm bài nên không thể thay đổi dạng câu và đáp án (BR-29). Bạn vẫn sửa được nội dung,
              giải thích và độ khó.
            </div>
          )}

          {/* Bước 5: kỹ năng, nơi gắn câu hỏi, dạng câu */}
          <div className="qb-grid">
            <label className="qb-field">
              <span className="modal-label">Kỹ năng *</span>
              <select className="modal-input" value={skill} disabled={isEdit || busy} onChange={(e) => changeSkill(e.target.value as QuestionSkill)}>
                {SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {SKILL_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

              <label className="qb-field">
                <span className="modal-label">Dạng câu hỏi *</span>
                <select className="modal-input" value={questionType} disabled={locked || busy}
                  onChange={(e) => setQuestionType(e.target.value as QuestionFormat)}>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {FORMAT_LABEL[f]}
                    </option>
                  ))}
                </select>
              </label>
          </div>

          <>
              {/* Chọn khóa học / chương là để lọc; có thể chọn thẳng bài học, hệ thống tự điền chương và khóa học */}
              <div className="qb-grid">
                <label className="qb-field">
                  <span className="modal-label">Khóa học</span>
                  <select className="modal-input" value={courseId} disabled={busy}
                    onChange={(e) => {
                      setCourseId(e.target.value === "" ? "" : Number(e.target.value));
                      setChapterId("");
                      setLessonId("");
                      setGrammarId("");
                    }}>
                    <option value="">-- Tất cả khóa học --</option>
                    {(targets?.courses ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="qb-field">
                  <span className="modal-label">Chương</span>
                  <select className="modal-input" value={chapterId} disabled={busy}
                    onChange={(e) => {
                      const next = e.target.value === "" ? "" : Number(e.target.value);
                      setChapterId(next);
                      if (next !== "") setCourseId(courseOfChapter(targets, next));
                      setLessonId("");
                      setGrammarId("");
                    }}>
                    <option value="">-- Tất cả chương --</option>
                    {chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {chapterLabel(targets, c, courseId === "")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="qb-grid">
                <label className="qb-field">
                  <span className="modal-label">Bài học *</span>
                  <select className="modal-input" value={lessonId} disabled={busy}
                    onChange={(e) => {
                      const next = e.target.value === "" ? "" : Number(e.target.value);
                      setLessonId(next);
                      setGrammarId("");
                      if (next !== "") {
                        const chapter = chapterOfLesson(targets, next);
                        setChapterId(chapter);
                        setCourseId(courseOfChapter(targets, chapter));
                      }
                    }}>
                    <option value="">
                      {lessons.length === 0 ? `-- Chưa có bài ${SKILL_LABEL[skill].toLowerCase()} --` : `-- Chọn bài ${SKILL_LABEL[skill].toLowerCase()} --`}
                    </option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {lessonLabel(targets, l, chapterId === "")}
                      </option>
                    ))}
                  </select>
                </label>
                {skill === "GRAMMAR" && (
                  <label className="qb-field">
                    <span className="modal-label">Điểm ngữ pháp *</span>
                    <select className="modal-input" value={grammarId} disabled={busy || lessonId === ""}
                      onChange={(e) => setGrammarId(e.target.value === "" ? "" : Number(e.target.value))}>
                      <option value="">-- Chọn điểm ngữ pháp --</option>
                      {grammars.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.structureName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {/* Bước 6: nội dung, đáp án, giải thích */}
              <label className="qb-field">
                <span className="modal-label">Nội dung câu hỏi *</span>
                <textarea className="modal-textarea" rows={3} maxLength={2000} value={content} disabled={busy}
                  onChange={(e) => setContent(e.target.value)} />
              </label>

              <div className="qb-grid">
                <label className="qb-field">
                  <span className="modal-label">Độ khó *</span>
                  <select className="modal-input" value={difficulty} disabled={busy}
                    onChange={(e) => setDifficulty(e.target.value as QuestionLevel | "")}>
                    <option value="">-- Chọn độ khó --</option>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {LEVEL_LABEL[l]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset className="qb-answer" disabled={locked || busy}>
                <legend className="modal-label">Đáp án — {FORMAT_LABEL[questionType]} *</legend>
                {questionType === "MCQ" && (
                  <>
                    {options.map((option, index) => (
                      <div key={index} className="qb-option-row">
                        <input type="radio" name="qb-correct" aria-label={`Đáp án đúng ${LETTERS[index]}`}
                          checked={correctIndex === index} onChange={() => setCorrectIndex(index)} />
                        <span className="qb-option-key">{LETTERS[index]}</span>
                        <input className="modal-input" maxLength={200} value={option} placeholder={`Lựa chọn ${LETTERS[index]}`}
                          onChange={(e) => setOption(index, e.target.value)} />
                        {skill !== "GRAMMAR" && options.length > 2 && (
                          <button type="button" className="mod-btn-text-action delete" onClick={() => {
                            setOptions((prev) => prev.filter((_, i) => i !== index));
                            setCorrectIndex((c) => (c === null || c === index ? null : c > index ? c - 1 : c));
                          }}>
                            Bỏ
                          </button>
                        )}
                      </div>
                    ))}
                    {skill !== "GRAMMAR" && options.length < 6 && (
                      <button type="button" className="mod-btn-text-action edit" onClick={() => setOptions((prev) => [...prev, ""])}>
                        + Thêm lựa chọn
                      </button>
                    )}
                    <p className="cell-email">
                      {skill === "GRAMMAR" ? "Ngữ pháp dùng đúng 4 lựa chọn A–D." : "2–6 lựa chọn, không trùng nhau."} Chọn nút tròn ở đáp án đúng.
                    </p>
                  </>
                )}
                {questionType === "FILL_IN" && (
                  <input className="modal-input" maxLength={200} placeholder="Đáp án đúng" value={fillAnswer}
                    onChange={(e) => setFillAnswer(e.target.value)} />
                )}
                {questionType === "MATCHING" && (
                  <>
                    {pairs.map((pair, index) => (
                      <div key={index} className="qb-option-row">
                        <input className="modal-input" maxLength={200} placeholder="Vế trái (vd: 山)" value={pair.left}
                          onChange={(e) => setPair(index, "left", e.target.value)} />
                        <span>↔</span>
                        <input className="modal-input" maxLength={200} placeholder="Vế phải (vd: núi)" value={pair.right}
                          onChange={(e) => setPair(index, "right", e.target.value)} />
                        {pairs.length > 2 && (
                          <button type="button" className="mod-btn-text-action delete"
                            onClick={() => setPairs((prev) => prev.filter((_, i) => i !== index))}>
                            Bỏ
                          </button>
                        )}
                      </div>
                    ))}
                    {pairs.length < 10 && (
                      <button type="button" className="mod-btn-text-action edit"
                        onClick={() => setPairs((prev) => [...prev, { left: "", right: "" }])}>
                        + Thêm cặp
                      </button>
                    )}
                  </>
                )}
              </fieldset>

              <label className="qb-field">
                <span className="modal-label">Giải thích</span>
                <textarea className="modal-textarea" rows={2} maxLength={2000} value={explanation} disabled={busy}
                  onChange={(e) => setExplanation(e.target.value)} />
              </label>

              {/* Loại test: gắn câu hỏi vào mini test của bài học / test chương */}
              <fieldset className="qb-answer">
                <legend className="modal-label">Loại test</legend>
                <div className="qb-grid">
                  {renderTests("MINI_TEST", "Bài học chưa có mini test.")}
                  {renderTests("CHAPTER_TEST", "Chương chưa có test chương.")}
                </div>
              </fieldset>

          </>

          {error && (
            <div className="admin-alert-banner error qb-banner" role="alert">
              ⚠️ {error}
            </div>
          )}

          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" disabled={busy} onClick={handleClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-modal-submit" style={{ backgroundColor: MOD_COLOR }} disabled={busy}>
              {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Lưu câu hỏi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
