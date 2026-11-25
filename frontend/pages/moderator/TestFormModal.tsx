import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  FORMAT_LABEL,
  LEVEL_LABEL,
  SKILL_LABEL,
  chapterLabel,
  chaptersOf,
  courseOfChapter,
  lessonLabel,
  type QuestionBankTargets,
  type QuestionFormat,
  type QuestionLevel,
  type QuestionSkill,
} from "../../api/questionBankApi";
import {
  TEST_LIMITS,
  TEST_TYPE_LABEL,
  answerPreview,
  createTest,
  getTestCandidates,
  publishTest,
  updateTest,
  type ManagedTestType,
  type TestDetail,
  type TestInput,
  type TestQuestionItem,
} from "../../api/testManagementApi";
import "./QuestionBank.css";
import "./TestManagement.css";

// Quản lý bài kiểm tra — bước 4–11 (tạo), A2 (sửa), A3 (lưu và xuất bản).

const MOD_COLOR = "#0d9488";
const SKILLS: QuestionSkill[] = ["VOCABULARY", "KANJI", "GRAMMAR"];
const FORMATS: QuestionFormat[] = ["MCQ", "FILL_IN", "MATCHING"];
const LEVELS: QuestionLevel[] = ["EASY", "MEDIUM", "HARD"];

interface Props {
  open: boolean;
  detail: TestDetail | null;
  targets: QuestionBankTargets | null;
  onClose: () => void;
  onSaved: (saved: TestDetail, message: string) => void;
}

const toNumber = (value: string): number | "" => (value === "" ? "" : Number(value));

function errorMessage(error: unknown, fallback: string): string {
  const message = isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message : undefined;
  return message || fallback;
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function randomChapterQuestionSample(
  candidates: TestQuestionItem[],
  requiredSkills: QuestionSkill[],
  minQuestions: number,
  maxQuestions: number,
): { questions: TestQuestionItem[]; error?: string } {
  const pool = candidates.filter((question) => question.status === "ACTIVE" && !question.exerciseQuestion);
  if (pool.length < minQuestions) {
    return { questions: [], error: `Question Bank cần ít nhất ${minQuestions} câu phù hợp để lấy ngẫu nhiên.` };
  }

  const required: TestQuestionItem[] = [];
  const missingSkills: QuestionSkill[] = [];
  for (const skill of requiredSkills) {
    const question = shuffled(pool.filter((item) => item.skill === skill))[0];
    if (question) required.push(question);
    else missingSkills.push(skill);
  }
  if (missingSkills.length > 0) {
    return {
      questions: [],
      error: `Câu hỏi đang lọc thiếu ${missingSkills.map((skill) => SKILL_LABEL[skill]).join(", ")}. Hãy bỏ bộ lọc rồi thử lại.`,
    };
  }

  const targetCount = Math.min(
    maxQuestions,
    pool.length,
    minQuestions + Math.floor(Math.random() * (maxQuestions - minQuestions + 1)),
  );
  const requiredIds = new Set(required.map((question) => question.id));
  const rest = shuffled(pool.filter((question) => !requiredIds.has(question.id)));
  return { questions: shuffled([...required, ...rest.slice(0, targetCount - required.length)]) };
}

export function TestFormModal({ open, detail, targets, onClose, onSaved }: Props) {
  const isEdit = detail !== null;
  const locked = detail?.locked ?? false;

  const [testType, setTestType] = useState<ManagedTestType>("MINI_TEST");
  const [miniSkill, setMiniSkill] = useState<QuestionSkill>("VOCABULARY");
  const [courseId, setCourseId] = useState<number | "">("");
  const [chapterId, setChapterId] = useState<number | "">("");
  const [lessonId, setLessonId] = useState<number | "">("");
  const [duration, setDuration] = useState("15");
  const [passing, setPassing] = useState("70");
  const [selected, setSelected] = useState<TestQuestionItem[]>([]);

  // Bước 8: câu hỏi ngân hàng để chọn
  const [candidates, setCandidates] = useState<TestQuestionItem[]>([]);
  const [candidateSkill, setCandidateSkill] = useState<QuestionSkill | "">("");
  const [candidateFormat, setCandidateFormat] = useState<QuestionFormat | "">("");
  const [candidateLevel, setCandidateLevel] = useState<QuestionLevel | "">("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoRandomizing, setAutoRandomizing] = useState(false);
  const autoRandomizedTestId = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCandidateSkill("");
    setCandidateFormat("");
    setCandidateLevel("");
    setKeywordInput("");
    setKeyword("");
    autoRandomizedTestId.current = null;
    setAutoRandomizing(false);
    if (!detail) {
      setTestType("MINI_TEST");
      setMiniSkill("VOCABULARY");
      setCourseId("");
      setChapterId("");
      setLessonId("");
      setDuration("15");
      setPassing("70");
      setSelected([]);
      return;
    }
    const s = detail.summary;
    setTestType(s.testType);
    if (s.skill !== "ALL") setMiniSkill(s.skill);
    setCourseId(s.courseId ?? "");
    setChapterId(s.chapterId ?? "");
    setLessonId(s.lessonId ?? "");
    setDuration(String(s.durationMinutes));
    setPassing(String(s.passingScore));
    const shouldAutoRandomize = s.testType === "CHAPTER_TEST" && !detail.locked &&
      detail.questions.length > TEST_LIMITS.CHAPTER_TEST.maxQuestions;
    setSelected(shouldAutoRandomize ? [] : detail.questions);
    setAutoRandomizing(shouldAutoRandomize);
  }, [open, detail]);

  // Mini test Từ vựng / Ngữ pháp theo bài học; mini test Kanji và test chương theo chương
  const byLesson = testType === "MINI_TEST" && miniSkill !== "KANJI";
  const hasScope = byLesson ? lessonId !== "" : chapterId !== "";

  useEffect(() => {
    if (!open || !hasScope) {
      setCandidates([]);
      return;
    }
    let cancelled = false;
    setLoadingCandidates(true);
    const autoSamplePending = Boolean(
      detail && detail.summary.testType === "CHAPTER_TEST" && !detail.locked &&
      detail.questions.length > TEST_LIMITS.CHAPTER_TEST.maxQuestions &&
      autoRandomizedTestId.current !== detail.summary.id,
    );
    getTestCandidates({
      testId: detail?.summary.id,
      testType: detail ? undefined : testType,
      testSkill: detail || testType !== "MINI_TEST" ? undefined : miniSkill,
      lessonId: detail || !byLesson || lessonId === "" ? undefined : lessonId,
      chapterId: detail || byLesson || chapterId === "" ? undefined : chapterId,
      skill: autoSamplePending ? undefined : candidateSkill || undefined,
      questionType: autoSamplePending ? undefined : candidateFormat || undefined,
      difficulty: autoSamplePending ? undefined : candidateLevel || undefined,
      keyword: autoSamplePending ? undefined : keyword || undefined,
    })
      .then((list) => {
        if (cancelled) return;
        setCandidates(list);
        if (autoSamplePending && detail && autoRandomizedTestId.current !== detail.summary.id) {
          autoRandomizedTestId.current = detail.summary.id;
          const requiredSkills: QuestionSkill[] = detail.summary.skill === "ALL"
            ? SKILLS
            : [detail.summary.skill];
          const sample = randomChapterQuestionSample(
            list,
            requiredSkills,
            TEST_LIMITS.CHAPTER_TEST.minQuestions,
            TEST_LIMITS.CHAPTER_TEST.maxQuestions,
          );
          if (sample.error) setError(sample.error);
          else setSelected(sample.questions);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setCandidates([]);
          setError(errorMessage(e, "Không tải được câu hỏi trong ngân hàng."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCandidates(false);
          setAutoRandomizing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, detail, testType, miniSkill, byLesson, lessonId, chapterId, hasScope, candidateSkill, candidateFormat, candidateLevel, keyword]);

  // Khóa học → chương → bài học (chỉ bài của chương đã chọn, đúng kỹ năng mini test)
  const chapters = useMemo(() => chaptersOf(targets, courseId), [targets, courseId]);
  const lessons = useMemo(
    () =>
      chapterId === ""
        ? []
        : (targets?.lessons ?? []).filter((l) => l.chapterId === chapterId && l.skillType === miniSkill),
    [targets, chapterId, miniSkill],
  );
  const selectedIds = useMemo(() => new Set(selected.map((q) => q.id)), [selected]);
  const partCounts = useMemo(
    () => SKILLS.map((s) => ({ skill: s, count: selected.filter((q) => q.skill === s).length })),
    [selected],
  );

  if (!open) return null;

  const busy = saving;

  // Đổi loại đề / phạm vi khi tạo mới → bỏ các câu đã chọn (BR-T2)
  const changeScope = (apply: () => void) => {
    apply();
    setSelected([]);
  };

  const limits = TEST_LIMITS[testType];
  const atMax = selected.length >= limits.maxQuestions;

  // BR-T5: không chọn quá số câu tối đa
  const toggle = (q: TestQuestionItem) =>
    setSelected((prev) => {
      if (prev.some((x) => x.id === q.id)) return prev.filter((x) => x.id !== q.id);
      return prev.length >= limits.maxQuestions ? prev : [...prev, q];
    });

  const selectRandomChapterQuestions = () => {
    const requiredSkills: QuestionSkill[] =
      detail && detail.summary.skill !== "ALL" ? [detail.summary.skill] : SKILLS;
    const sample = randomChapterQuestionSample(candidates, requiredSkills, limits.minQuestions, limits.maxQuestions);
    if (sample.error) setError(sample.error);
    else {
      setSelected(sample.questions);
      setError(null);
    }
  };

  const move = (index: number, delta: number) =>
    setSelected((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const handleKeyword = (event: FormEvent) => {
    event.preventDefault();
    setKeyword(keywordInput.trim());
  };

  // Tên đề tự đặt theo loại đề và bài học / chương
  const autoTitle = (): string => {
    if (byLesson) {
      const lesson = targets?.lessons.find((l) => l.id === lessonId);
      return `Mini test ${SKILL_LABEL[miniSkill]} · ${lesson ? lessonLabel(targets, lesson, true) : ""}`.slice(0, 200);
    }
    const chapter = targets?.chapters.find((c) => c.id === chapterId);
    const where = chapter ? chapterLabel(targets, chapter, true) : "";
    return (testType === "MINI_TEST" ? `Mini test Kanji · ${where}` : `Test chương · ${where}`).slice(0, 200);
  };

  // BR-T4: kiểm tra trước khi gửi
  const validate = (): string | null => {
    if (byLesson && lessonId === "") return "Vui lòng chọn bài học.";
    if (!byLesson && chapterId === "") return "Vui lòng chọn chương.";
    const minutes = Number(duration);
    if (!locked && (!Number.isInteger(minutes) || minutes < limits.minMinutes || minutes > limits.maxMinutes)) {
      return `Thời gian làm bài của ${TEST_TYPE_LABEL[testType].toLowerCase()} từ ${limits.minMinutes} đến ${limits.maxMinutes} phút.`;
    }
    if (!locked && selected.length > limits.maxQuestions) {
      return `${TEST_TYPE_LABEL[testType]} tối đa ${limits.maxQuestions} câu hỏi.`;
    }
    const score = Number(passing);
    if (passing.trim() === "" || Number.isNaN(score) || score < 0 || score > 100) return "Điểm đạt từ 0 đến 100.";
    return null;
  };

  const submit = async (publishAfter: boolean) => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    const payload: TestInput = {
      testType,
      skill: testType === "MINI_TEST" ? miniSkill : null,
      lessonId: byLesson && lessonId !== "" ? lessonId : null,
      chapterId: !byLesson && chapterId !== "" ? chapterId : null,
      title: detail ? detail.summary.title : autoTitle(),
      description: detail ? detail.description : null,
      durationMinutes: Number(duration),
      passingScore: Number(passing),
      questionIds: selected.map((q) => q.id),
    };
    let saved: TestDetail;
    try {
      saved = detail ? await updateTest(detail.summary.id, payload) : await createTest(payload);
    } catch (e) {
      setError(errorMessage(e, "Không thể lưu bài kiểm tra. Vui lòng thử lại."));
      setSaving(false);
      return;
    }
    if (!publishAfter) {
      setSaving(false);
      onSaved(saved, isEdit ? "Cập nhật bài kiểm tra thành công." : "Tạo bài kiểm tra thành công.");
      return;
    }
    try {
      const published = await publishTest(saved.summary.id);
      onSaved(published, "Xuất bản bài kiểm tra thành công.");
    } catch (e) {
      // Đề đã được lưu nháp; báo lý do chưa xuất bản được (BR-T5, BR-T8)
      onSaved(saved, `Đã lưu bài kiểm tra ở trạng thái Nháp nhưng chưa xuất bản được: ${errorMessage(e, "lỗi hệ thống.")}`);
    } finally {
      setSaving(false);
    }
  };

  const canPublish = !detail || detail.summary.status === "DRAFT";

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-card tm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? "Sửa bài kiểm tra" : "Tạo bài kiểm tra"}</h3>
          <button type="button" className="modal-btn-close" disabled={busy} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-form-body">
          {error && (
            <div className="admin-alert-banner error qb-banner" role="alert">
              ⚠️ {error}
            </div>
          )}
          {locked && (
            <div className="admin-alert-banner warning qb-banner">
              Bài kiểm tra đã có học viên làm nên không sửa được câu hỏi, thời gian và điểm đạt (BR-T6).
            </div>
          )}

          {/* Bước 5: loại đề + bài học / chương */}
          <div className="qb-grid">
            <label className="qb-field">
              <span className="modal-label">Loại bài kiểm tra *</span>
              <select className="modal-input" value={testType} disabled={busy || isEdit}
                onChange={(e) =>
                  changeScope(() => {
                    const next = e.target.value as ManagedTestType;
                    setTestType(next);
                    setDuration(String(TEST_LIMITS[next].defaultMinutes));
                  })
                }>
                <option value="MINI_TEST">{TEST_TYPE_LABEL.MINI_TEST}</option>
                <option value="CHAPTER_TEST">{TEST_TYPE_LABEL.CHAPTER_TEST} (tổng hợp 3 kỹ năng)</option>
              </select>
            </label>
            {testType === "MINI_TEST" && (
              <label className="qb-field">
                <span className="modal-label">Kỹ năng *</span>
                <select className="modal-input" value={miniSkill} disabled={busy || isEdit}
                  onChange={(e) =>
                    changeScope(() => {
                      setMiniSkill(e.target.value as QuestionSkill);
                      setLessonId("");
                    })
                  }>
                  {SKILLS.map((s) => (
                    <option key={s} value={s}>
                      {SKILL_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="qb-grid">
            <label className="qb-field">
              <span className="modal-label">Khóa học *</span>
              <select className="modal-input" value={courseId} disabled={busy || isEdit}
                onChange={(e) =>
                  changeScope(() => {
                    setCourseId(toNumber(e.target.value));
                    setChapterId("");
                    setLessonId("");
                  })
                }>
                <option value="">Chọn khóa học</option>
                {(targets?.courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="qb-field">
              <span className="modal-label">Chương *</span>
              <select className="modal-input" value={chapterId} disabled={busy || isEdit}
                onChange={(e) =>
                  changeScope(() => {
                    const next = toNumber(e.target.value);
                    setChapterId(next);
                    if (next !== "") setCourseId(courseOfChapter(targets, next));
                    setLessonId("");
                  })
                }>
                <option value="">Chọn chương</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {chapterLabel(targets, c, courseId === "")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {byLesson && (
            <label className="qb-field">
              <span className="modal-label">Bài học *</span>
              <select className="modal-input" value={lessonId} disabled={busy || isEdit || chapterId === ""}
                onChange={(e) => changeScope(() => setLessonId(toNumber(e.target.value)))}>
                <option value="">
                  {chapterId === ""
                    ? "Chọn chương trước"
                    : lessons.length === 0
                      ? `Chương chưa có bài ${SKILL_LABEL[miniSkill]}`
                      : "Chọn bài học"}
                </option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {lessonLabel(targets, l, false)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="qb-grid">
            <label className="qb-field">
              <span className="modal-label">
                Thời gian làm bài (phút) * <span className="cell-email">{limits.minMinutes}–{limits.maxMinutes} phút</span>
              </span>
              <input className="modal-input" type="number" min={limits.minMinutes} max={limits.maxMinutes} value={duration}
                disabled={busy || locked}
                onChange={(e) => setDuration(e.target.value)} />
            </label>
            <label className="qb-field">
              <span className="modal-label">Điểm đạt (%) *</span>
              <input className="modal-input" type="number" min={0} max={100} step="0.5" value={passing}
                disabled={busy || locked} onChange={(e) => setPassing(e.target.value)} />
            </label>
          </div>

          {/* Bước 7–9: chọn câu hỏi từ ngân hàng */}
          <div className="tm-picker">
            <section className="tm-pane">
              <div className="tm-pane-head">
                <strong>Ngân hàng câu hỏi</strong>
                <span className="cell-email">Câu kiểm tra đang dùng của {testType === "MINI_TEST" ? "bài học" : "chương"}</span>
                {testType === "CHAPTER_TEST" && (
                  <button
                    type="button"
                    className="btn-modal-submit"
                    style={{ backgroundColor: MOD_COLOR, alignSelf: "flex-start" }}
                    disabled={busy || locked || loadingCandidates}
                    onClick={selectRandomChapterQuestions}
                  >
                    Chọn ngẫu nhiên 10–15 câu
                  </button>
                )}
              </div>
              <form className="tm-candidate-filters" onSubmit={handleKeyword}>
                {testType === "CHAPTER_TEST" && (
                  <select className="admin-filter-select" aria-label="Lọc theo kỹ năng" value={candidateSkill}
                    onChange={(e) => setCandidateSkill(e.target.value as QuestionSkill | "")}>
                    <option value="">Tất cả kỹ năng</option>
                    {SKILLS.map((s) => (
                      <option key={s} value={s}>
                        {SKILL_LABEL[s]}
                      </option>
                    ))}
                  </select>
                )}
                <select className="admin-filter-select" aria-label="Lọc theo dạng câu" value={candidateFormat}
                  onChange={(e) => setCandidateFormat(e.target.value as QuestionFormat | "")}>
                  <option value="">Tất cả dạng câu</option>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {FORMAT_LABEL[f]}
                    </option>
                  ))}
                </select>
                <select className="admin-filter-select" aria-label="Lọc theo độ khó" value={candidateLevel}
                  onChange={(e) => setCandidateLevel(e.target.value as QuestionLevel | "")}>
                  <option value="">Tất cả độ khó</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABEL[l]}
                    </option>
                  ))}
                </select>
                <input className="admin-filter-input" placeholder="Tìm nội dung..." value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)} />
              </form>
              <div className="tm-list">
                {autoRandomizing ? (
                  <p className="cell-email">Đang tự chọn ngẫu nhiên 10–15 câu từ Question Bank...</p>
                ) : !hasScope ? (
                  <p className="cell-email">
                    {testType === "MINI_TEST" ? "Chọn bài học để xem câu hỏi." : "Chọn chương để xem câu hỏi."}
                  </p>
                ) : loadingCandidates ? (
                  <p className="cell-email">Đang tải...</p>
                ) : candidates.length === 0 ? (
                  <p className="cell-email">Chưa có câu hỏi trong ngân hàng. Vui lòng tạo câu hỏi ở Ngân hàng câu hỏi.</p>
                ) : (
                  candidates.map((q) => (
                    <label key={q.id} className={`tm-item ${selectedIds.has(q.id) ? "is-selected" : ""}`}>
                      <input type="checkbox" checked={selectedIds.has(q.id)}
                        disabled={busy || locked || (atMax && !selectedIds.has(q.id))}
                        onChange={() => toggle(q)} />
                      <span className="tm-item-body">
                        <span className="tm-item-content">{q.content}</span>
                        <span className="cell-email">
                          {SKILL_LABEL[q.skill]} · {FORMAT_LABEL[q.questionType]} · {LEVEL_LABEL[q.difficulty]}
                          {q.lessonTitle ? ` · ${q.lessonTitle}` : ""}
                        </span>
                        <span className="tm-item-answer">Đáp án: {answerPreview(q)}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </section>

            <section className="tm-pane">
              <div className="tm-pane-head">
                <strong>Câu hỏi trong đề ({selected.length})</strong>
                <span className={`cell-email ${selected.length < limits.minQuestions || atMax ? "tm-limit-warn" : ""}`}>
                  Tối thiểu {limits.minQuestions} câu để xuất bản, tối đa {limits.maxQuestions} câu
                  {atMax ? " — đã đủ số câu tối đa" : ""}
                </span>
                {testType === "CHAPTER_TEST" && (
                  <span className="cell-email">
                    {partCounts.map((p) => `${SKILL_LABEL[p.skill]}: ${p.count}`).join(" · ")}
                  </span>
                )}
              </div>
              <div className="tm-list">
                {selected.length === 0 ? (
                  <p className="cell-email">Chưa chọn câu hỏi nào. Đề nháp được lưu không có câu hỏi.</p>
                ) : (
                  selected.map((q, index) => (
                    <div key={q.id} className="tm-item is-selected">
                      <span className="tm-order">{index + 1}</span>
                      <span className="tm-item-body">
                        <span className="tm-item-content">{q.content}</span>
                        <span className="cell-email">
                          {SKILL_LABEL[q.skill]} · {FORMAT_LABEL[q.questionType]}
                          {q.status === "ARCHIVED" ? " · Đã lưu trữ" : ""}
                        </span>
                      </span>
                      {!locked && (
                        <span className="tm-item-actions">
                          <button type="button" className="mod-btn-text-action edit" disabled={busy || index === 0}
                            onClick={() => move(index, -1)} aria-label="Lên">
                            ↑
                          </button>
                          <button type="button" className="mod-btn-text-action edit"
                            disabled={busy || index === selected.length - 1} onClick={() => move(index, 1)} aria-label="Xuống">
                            ↓
                          </button>
                          <button type="button" className="mod-btn-text-action delete" disabled={busy}
                            onClick={() => toggle(q)} aria-label="Bỏ khỏi đề">
                            ✕
                          </button>
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" disabled={busy} onClick={onClose}>
              Hủy bỏ
            </button>
            {canPublish && (
              <button type="button" className="btn-modal-cancel" disabled={busy} onClick={() => void submit(true)}>
                Lưu và xuất bản
              </button>
            )}
            <button type="button" className="btn-modal-submit" style={{ backgroundColor: MOD_COLOR }} disabled={busy}
              onClick={() => void submit(false)}>
              {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Lưu nháp"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
