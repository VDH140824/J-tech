import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  FORMAT_LABEL,
  LEVEL_LABEL,
  SKILL_LABEL,
  STATE_LABEL,
  chapterLabel,
  chapterOfLesson,
  chaptersOf,
  courseOfChapter,
  lessonLabel,
  lessonsOf,
  deleteBankQuestion,
  getQuestionBank,
  getQuestionBankTargets,
  getQuestionDetail,
  type QuestionBankDetail,
  type QuestionBankSummary,
  type QuestionBankTargets,
  type QuestionFormat,
  type QuestionSkill,
  type QuestionState,
} from "../../api/questionBankApi";
import { QuestionBankFormModal } from "./QuestionBankFormModal";
import "./QuestionBank.css";

// UC-39 Manage Question Bank — bước 1–2 (danh sách), A1 (lọc), A2 (xem), A5/A6 (xóa / lưu trữ theo BR-13).

const MOD_COLOR = "#0d9488";
const PAGE_SIZE = 10;
const LOAD_ERROR = "Không thể tải dữ liệu. Vui lòng thử lại.";
const SKILLS: QuestionSkill[] = ["VOCABULARY", "KANJI", "GRAMMAR"];
const FORMATS: QuestionFormat[] = ["MCQ", "FILL_IN", "MATCHING"];

type Notice = { type: "success" | "error"; text: string };

function errorMessage(error: unknown, fallback: string): string {
  const message = isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message : undefined;
  return message || fallback;
}

function classification(q: QuestionBankSummary): string {
  const parts = [q.courseName, q.chapterNo != null ? `Chương ${q.chapterNo}` : null, q.lessonTitle, q.targetName];
  const text = parts.filter(Boolean).join(" / ");
  return text || "Chưa gắn bài học";
}

const toNumber = (value: string): number | "" => (value === "" ? "" : Number(value));

export function QuestionBankTab() {
  const [targets, setTargets] = useState<QuestionBankTargets | null>(null);
  const [questions, setQuestions] = useState<QuestionBankSummary[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // A1: bộ lọc
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [skill, setSkill] = useState<QuestionSkill | "">("");
  const [format, setFormat] = useState<QuestionFormat | "">("");
  const [status, setStatus] = useState<QuestionState | "">("ACTIVE");
  const [courseId, setCourseId] = useState<number | "">("");
  const [chapterId, setChapterId] = useState<number | "">("");
  const [lessonId, setLessonId] = useState<number | "">("");

  const [viewing, setViewing] = useState<QuestionBankDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBankDetail | null>(null);
  const [deleting, setDeleting] = useState<QuestionBankSummary | null>(null);
  const [working, setWorking] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const result = await getQuestionBank({
        keyword: keyword || undefined,
        skill: skill || undefined,
        questionType: format || undefined,
        status: status || undefined,
        courseId: courseId === "" ? undefined : courseId,
        chapterId: chapterId === "" ? undefined : chapterId,
        lessonId: lessonId === "" ? undefined : lessonId,
        page,
        size: PAGE_SIZE,
      });
      setQuestions(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, [keyword, skill, format, status, courseId, chapterId, lessonId, page]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    getQuestionBankTargets()
      .then(setTargets)
      .catch(() => {
        setTargets(null);
        setNotice({ type: "error", text: "Không tải được danh sách khóa học, chương, bài học. Vui lòng tải lại trang." });
      });
  }, []);

  const chapters = useMemo(() => chaptersOf(targets, courseId), [targets, courseId]);
  const lessons = useMemo(() => lessonsOf(targets, courseId, chapterId, skill), [targets, courseId, chapterId, skill]);

  const resetPage = () => setPage(0);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setKeyword(searchInput.trim());
    resetPage();
  };

  const loadDetail = async (id: number): Promise<QuestionBankDetail | null> => {
    try {
      return await getQuestionDetail(id);
    } catch (e) {
      setNotice({ type: "error", text: errorMessage(e, LOAD_ERROR) });
      if (isAxiosError(e) && e.response?.status === 404) void fetchQuestions();
      return null;
    }
  };

  // A2: xem chi tiết
  const openView = async (q: QuestionBankSummary) => {
    const detail = await loadDetail(q.id);
    if (detail) setViewing(detail);
  };

  // Bước 3: Create Question
  const openCreate = () => {
    setNotice(null);
    setEditing(null);
    setFormOpen(true);
  };

  // A3: Edit
  const openEdit = async (q: QuestionBankSummary) => {
    setNotice(null);
    const detail = await loadDetail(q.id);
    if (detail) {
      setViewing(null);
      setEditing(detail);
      setFormOpen(true);
    }
  };

  // A5: Delete → hệ thống cho biết xóa vĩnh viễn hay phải lưu trữ (BR-13)
  const openDelete = (q: QuestionBankSummary) => {
    setNotice(null);
    setDeleting(q);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    const target = deleting;
    try {
      // BR-13: hệ thống tự xóa vĩnh viễn hoặc chuyển Lưu trữ nếu câu hỏi đã có dữ liệu học tập
      const result = await deleteBankQuestion(target.id);
      setNotice({
        type: "success",
        text: result.archived
          ? `Đã xóa câu hỏi khỏi danh sách. ${result.reason ?? ""} Câu hỏi được chuyển sang Lưu trữ để giữ dữ liệu học tập.`
          : "Đã xóa câu hỏi.",
      });
      setDeleting(null);
      if (questions.length === 1 && page > 0 && (!result.archived || status === "ACTIVE")) setPage((p) => p - 1);
      else void fetchQuestions();
    } catch (e) {
      setNotice({ type: "error", text: errorMessage(e, LOAD_ERROR) });
      setDeleting(null);
      void fetchQuestions();
    } finally {
      setWorking(false);
    }
  };

  const isFiltering = keyword !== "" || skill !== "" || format !== "" || courseId !== "" || status !== "ACTIVE";

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">Ngân hàng câu hỏi</h2>
          <p className="admin-main-subtitle">
            Câu hỏi Từ vựng, Kanji và Ngữ pháp dùng cho luyện tập và bài kiểm tra.
          </p>
        </div>
        <button type="button" className="mod-btn-add" style={{ backgroundColor: MOD_COLOR }} onClick={openCreate}>
          + Thêm câu hỏi
        </button>
      </div>

      {notice && (
        <div className={`admin-alert-banner ${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.type === "success" ? "✅" : "⚠️"} {notice.text}
        </div>
      )}

      {/* Bước 2 + A1: bộ lọc */}
      <div className="admin-filter-card">
        <form className="admin-filter-form" onSubmit={handleSearch}>
          <div className="admin-search-wrapper">
            <span className="search-mag-icon">🔍</span>
            <input type="text" className="admin-filter-input" placeholder="Tìm theo nội dung câu hỏi..."
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
        </form>
        <div className="qb-filters">
          <select className="admin-filter-select" aria-label="Lọc theo kỹ năng" value={skill}
            onChange={(e) => {
              setSkill(e.target.value as QuestionSkill | "");
              setLessonId("");
              resetPage();
            }}>
            <option value="">Tất cả kỹ năng</option>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {SKILL_LABEL[s]}
              </option>
            ))}
          </select>
          <select className="admin-filter-select" aria-label="Lọc theo dạng câu" value={format}
            onChange={(e) => {
              setFormat(e.target.value as QuestionFormat | "");
              resetPage();
            }}>
            <option value="">Tất cả dạng câu</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
          <select className="admin-filter-select" aria-label="Lọc theo trạng thái" value={status}
            onChange={(e) => {
              setStatus(e.target.value as QuestionState | "");
              resetPage();
            }}>
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">{STATE_LABEL.ACTIVE}</option>
            <option value="ARCHIVED">{STATE_LABEL.ARCHIVED}</option>
          </select>
          <select className="admin-filter-select" aria-label="Lọc theo khóa học" value={courseId}
            onChange={(e) => {
              setCourseId(toNumber(e.target.value));
              setChapterId("");
              setLessonId("");
              resetPage();
            }}>
            <option value="">Tất cả khóa học</option>
            {(targets?.courses ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="admin-filter-select" aria-label="Lọc theo chương" value={chapterId}
            onChange={(e) => {
              const next = toNumber(e.target.value);
              setChapterId(next);
              if (next !== "") setCourseId(courseOfChapter(targets, next));
              setLessonId("");
              resetPage();
            }}>
            <option value="">Tất cả chương</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {chapterLabel(targets, c, courseId === "")}
              </option>
            ))}
          </select>
          <select className="admin-filter-select" aria-label="Lọc theo bài học" value={lessonId}
            onChange={(e) => {
              const next = toNumber(e.target.value);
              setLessonId(next);
              if (next !== "") {
                const chapter = chapterOfLesson(targets, next);
                setChapterId(chapter);
                setCourseId(courseOfChapter(targets, chapter));
              }
              resetPage();
            }}>
            <option value="">Tất cả bài học</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {lessonLabel(targets, l, chapterId === "")}
              </option>
            ))}
          </select>
        </div>
        {!hasError && (
          <div className="admin-quick-stats-row">
            <span className="quick-stats-label">Tổng quan:</span>
            <span className="stat-pill pill-total">{totalElements} câu hỏi</span>
          </div>
        )}
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <div className="admin-spinner mod-spinner" />
            <span>Đang tải câu hỏi...</span>
          </div>
        ) : hasError ? (
          <div className="admin-table-empty">
            <div className="admin-alert-banner error mod-error-banner" role="alert">
              <span>⚠️ {LOAD_ERROR}</span>
              <button type="button" className="mod-btn-retry" onClick={() => void fetchQuestions()}>
                Thử lại
              </button>
            </div>
          </div>
        ) : totalElements === 0 ? (
          <div className="admin-table-empty">
            <span style={{ fontSize: "2rem" }}>📭</span>
            <p style={{ marginTop: "8px", fontWeight: 700, color: "#0f172a" }}>
              {isFiltering ? "Không có câu hỏi phù hợp" : "Chưa có câu hỏi nào"}
            </p>
            {!isFiltering && <p>Bấm "+ Thêm câu hỏi" để tạo câu hỏi đầu tiên.</p>}
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-dekiru-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>STT</th>
                  <th>NỘI DUNG</th>
                  <th style={{ width: "100px" }}>KỸ NĂNG</th>
                  <th style={{ width: "120px" }}>DẠNG CÂU</th>
                  <th style={{ width: "100px" }}>ĐỘ KHÓ</th>
                  <th>PHÂN LOẠI</th>
                  <th style={{ width: "120px" }}>TRẠNG THÁI</th>
                  <th style={{ textAlign: "center", width: "170px" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, index) => (
                  <tr key={q.id}>
                    <td>
                      <span className="mod-lesson-row-index">{page * PAGE_SIZE + index + 1}</span>
                    </td>
                    <td>
                      <div className="qb-content-cell" title={q.content}>
                        {q.content}
                      </div>
                    </td>
                    <td>{SKILL_LABEL[q.skill]}</td>
                    <td className="cell-email">{FORMAT_LABEL[q.questionType]}</td>
                    <td className="cell-email">{LEVEL_LABEL[q.difficulty]}</td>
                    <td className="cell-email">{classification(q)}</td>
                    <td>
                      <span className={`status-badge-pill ${q.status === "ACTIVE" ? "pill-active" : "pill-locked"}`}>
                        <span className="pill-dot" />
                        {STATE_LABEL[q.status]}
                      </span>
                    </td>
                    <td>
                      <div className="mod-text-actions">
                        <button type="button" className="mod-btn-text-action edit" onClick={() => void openView(q)}>
                          Xem
                        </button>
                        {q.status === "ACTIVE" && (
                          <>
                            <button type="button" className="mod-btn-text-action edit" onClick={() => void openEdit(q)}>
                              Sửa
                            </button>
                            <button type="button" className="mod-btn-text-action delete" onClick={() => openDelete(q)}>
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !hasError && totalPages > 1 && (
          <div className="admin-pagination-footer">
            <span className="pagination-info">
              Hiển thị trang <strong>{page + 1}</strong> / <strong>{totalPages}</strong> ({totalElements} câu hỏi)
            </span>
            <div className="pagination-buttons">
              <button type="button" className="btn-page" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                ← Trang trước
              </button>
              <button type="button" className="btn-page" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Trang sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* A2: chi tiết câu hỏi */}
      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal-card" style={{ maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Chi tiết câu hỏi</h3>
              <button type="button" className="modal-btn-close" onClick={() => setViewing(null)}>
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <div className="qb-detail-row">
                <span>Nội dung</span>
                <span style={{ whiteSpace: "pre-wrap" }}>{viewing.summary.content}</span>
              </div>
              <div className="qb-detail-row">
                <span>Đáp án</span>
                <span>
                  {viewing.summary.questionType === "MATCHING" ? (
                    Object.entries(viewing.matches).map(([left, right]) => (
                      <div key={left}>
                        {left} ↔ {right}
                      </div>
                    ))
                  ) : viewing.options.length > 0 ? (
                    viewing.options.map((option, index) => (
                      <div key={index} className={option === viewing.correctAnswer ? "qb-correct" : undefined}>
                        {String.fromCharCode(65 + index)}. {option} {option === viewing.correctAnswer ? "✓" : ""}
                      </div>
                    ))
                  ) : (
                    <span className="qb-correct">{viewing.correctAnswer || "—"}</span>
                  )}
                </span>
              </div>
              <div className="qb-detail-row">
                <span>Giải thích</span>
                <span style={{ whiteSpace: "pre-wrap" }}>{viewing.explanation || "—"}</span>
              </div>
              <div className="qb-detail-row">
                <span>Phân loại</span>
                <span>
                  {SKILL_LABEL[viewing.summary.skill]} · {FORMAT_LABEL[viewing.summary.questionType]} ·{" "}
                  {LEVEL_LABEL[viewing.summary.difficulty]}
                  <div className="cell-email">{classification(viewing.summary)}</div>
                </span>
              </div>
              <div className="qb-detail-row">
                <span>Trạng thái</span>
                <span>
                  {STATE_LABEL[viewing.summary.status]}
                  {viewing.attempted && <div className="cell-email">Đã có học viên làm bài — khóa sửa đáp án (BR-29).</div>}
                  {viewing.summary.exerciseQuestion ? "" : <div className="cell-email">Không dùng cho bài luyện tập.</div>}
                </span>
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-modal-cancel" onClick={() => setViewing(null)}>
                  Đóng
                </button>
                {viewing.summary.status === "ACTIVE" && (
                  <button type="button" className="btn-modal-submit" style={{ backgroundColor: MOD_COLOR }}
                    onClick={() => void openEdit(viewing.summary)}>
                    Sửa câu hỏi
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A5 / A6: xác nhận xóa hoặc lưu trữ */}
      {deleting && (
        <div className="modal-overlay" onClick={() => !working && setDeleting(null)}>
          <div className="modal-card" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Xác nhận xóa câu hỏi</h3>
              <button type="button" className="modal-btn-close" disabled={working} onClick={() => setDeleting(null)}>
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <p className="modal-description">Bạn có chắc muốn xóa câu hỏi này?</p>
              <p className="modal-description">
                <strong>{deleting.content}</strong>
              </p>
              <div className="modal-actions-row">
                <button type="button" className="btn-modal-cancel" disabled={working} onClick={() => setDeleting(null)}>
                  Hủy bỏ
                </button>
                <button type="button" className="btn-modal-submit" style={{ backgroundColor: "#dc2626" }}
                  disabled={working} onClick={() => void confirmDelete()}>
                  {working ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <QuestionBankFormModal
        open={formOpen}
        detail={editing}
        targets={targets}
        onClose={() => setFormOpen(false)}
        onSaved={(saved, isEdit) => {
          // Bước 11: thông báo thành công và làm mới danh sách
          setFormOpen(false);
          setEditing(null);
          setNotice({ type: "success", text: isEdit ? "Đã cập nhật câu hỏi." : "Đã thêm câu hỏi." });
          void fetchQuestions();
        }}
      />

    </div>
  );
}
