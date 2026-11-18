import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  FORMAT_LABEL,
  SKILL_LABEL,
  chapterLabel,
  chaptersOf,
  courseOfChapter,
  getQuestionBankTargets,
  lessonLabel,
  lessonsOf,
  type QuestionBankTargets,
} from "../../api/questionBankApi";
import {
  TEST_SKILL_LABEL,
  TEST_STATUS_LABEL,
  TEST_TYPE_LABEL,
  answerPreview,
  deleteTest,
  getTestDetail,
  getTests,
  publishTest,
  unpublishTest,
  type ManagedTestType,
  type TestDetail,
  type TestSkill,
  type TestStatus,
  type TestSummary,
} from "../../api/testManagementApi";
import { TestFormModal } from "./TestFormModal";
import "./QuestionBank.css";
import "./TestManagement.css";

// Quản lý bài kiểm tra — bước 1–2 (danh sách, lọc), A1 (xem), A3/A4 (xuất bản / về nháp), A5 (xóa / lưu trữ).

const MOD_COLOR = "#0d9488";
const PAGE_SIZE = 10;
const LOAD_ERROR = "Không thể tải dữ liệu. Vui lòng thử lại.";
const SKILLS: TestSkill[] = ["VOCABULARY", "KANJI", "GRAMMAR", "ALL"];

type Notice = { type: "success" | "error"; text: string };

function errorMessage(error: unknown, fallback: string): string {
  const message = isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message : undefined;
  return message || fallback;
}

function scopeText(t: TestSummary): string {
  const parts = [t.courseName, t.chapterNo != null ? `Chương ${t.chapterNo}` : null, t.lessonTitle];
  return parts.filter(Boolean).join(" / ") || "—";
}

const STATUS_PILL: Record<TestStatus, string> = {
  DRAFT: "pill-locked",
  PUBLISHED: "pill-active",
  ARCHIVED: "pill-locked",
};

const toNumber = (value: string): number | "" => (value === "" ? "" : Number(value));

export function TestManagementTab() {
  const [targets, setTargets] = useState<QuestionBankTargets | null>(null);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Bước 2: bộ lọc
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [testType, setTestType] = useState<ManagedTestType | "">("");
  const [skill, setSkill] = useState<TestSkill | "">("");
  const [status, setStatus] = useState<TestStatus | "">("");
  const [courseId, setCourseId] = useState<number | "">("");
  const [chapterId, setChapterId] = useState<number | "">("");
  const [lessonId, setLessonId] = useState<number | "">("");

  const [viewing, setViewing] = useState<TestDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TestDetail | null>(null);
  const [deleting, setDeleting] = useState<TestSummary | null>(null);
  const [working, setWorking] = useState(false);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const result = await getTests({
        keyword: keyword || undefined,
        testType: testType || undefined,
        skill: skill || undefined,
        status: status || undefined,
        courseId: courseId === "" ? undefined : courseId,
        chapterId: chapterId === "" ? undefined : chapterId,
        lessonId: lessonId === "" ? undefined : lessonId,
        page,
        size: PAGE_SIZE,
      });
      setTests(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, [keyword, testType, skill, status, courseId, chapterId, lessonId, page]);

  useEffect(() => {
    void fetchTests();
  }, [fetchTests]);

  useEffect(() => {
    getQuestionBankTargets()
      .then(setTargets)
      .catch(() => {
        setTargets(null);
        setNotice({ type: "error", text: "Không tải được danh sách khóa học, chương, bài học. Vui lòng tải lại trang." });
      });
  }, []);

  const chapters = useMemo(() => chaptersOf(targets, courseId), [targets, courseId]);
  // Bài học: chỉ hiện tên bài của chương đã chọn, đúng kỹ năng đang lọc (Tổng hợp / tất cả → mọi kỹ năng)
  const lessonSkill = skill === "" || skill === "ALL" ? "" : skill;
  const lessons = useMemo(
    () => (chapterId === "" ? [] : lessonsOf(targets, courseId, chapterId, lessonSkill)),
    [targets, courseId, chapterId, lessonSkill],
  );

  const resetPage = () => setPage(0);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setKeyword(searchInput.trim());
    resetPage();
  };

  const loadDetail = async (id: number): Promise<TestDetail | null> => {
    try {
      return await getTestDetail(id);
    } catch (e) {
      setNotice({ type: "error", text: errorMessage(e, LOAD_ERROR) });
      if (isAxiosError(e) && e.response?.status === 404) void fetchTests();
      return null;
    }
  };

  // A1: xem chi tiết
  const openView = async (t: TestSummary) => {
    const detail = await loadDetail(t.id);
    if (detail) setViewing(detail);
  };

  // Bước 3: tạo
  const openCreate = () => {
    setNotice(null);
    setEditing(null);
    setFormOpen(true);
  };

  // A2: sửa
  const openEdit = async (t: TestSummary) => {
    setNotice(null);
    const detail = await loadDetail(t.id);
    if (detail) {
      setViewing(null);
      setEditing(detail);
      setFormOpen(true);
    }
  };

  // A3 / A4: xuất bản, chuyển về nháp
  const changeStatus = async (t: TestSummary, publish: boolean) => {
    setNotice(null);
    setWorking(true);
    try {
      const updated = publish ? await publishTest(t.id) : await unpublishTest(t.id);
      setNotice({
        type: "success",
        text: publish ? "Xuất bản bài kiểm tra thành công." : "Đã chuyển bài kiểm tra về Nháp.",
      });
      if (viewing?.summary.id === t.id) setViewing(updated);
      void fetchTests();
    } catch (e) {
      setNotice({ type: "error", text: errorMessage(e, LOAD_ERROR) });
    } finally {
      setWorking(false);
    }
  };

  // A5: xóa (BR-T7)
  const confirmDelete = async () => {
    if (!deleting) return;
    setWorking(true);
    const target = deleting;
    try {
      const result = await deleteTest(target.id);
      setNotice({
        type: "success",
        text: result.archived
          ? `${result.reason ?? ""} Bài kiểm tra được chuyển sang Lưu trữ để giữ kết quả của học viên.`
          : "Đã xóa bài kiểm tra.",
      });
      setDeleting(null);
      setViewing(null);
      if (tests.length === 1 && page > 0 && !result.archived) setPage((p) => p - 1);
      else void fetchTests();
    } catch (e) {
      setNotice({ type: "error", text: errorMessage(e, LOAD_ERROR) });
      setDeleting(null);
      void fetchTests();
    } finally {
      setWorking(false);
    }
  };

  const isFiltering =
    keyword !== "" || testType !== "" || skill !== "" || status !== "" || courseId !== "" || chapterId !== "" || lessonId !== "";

  const actions = (t: TestSummary) => (
    <div className="mod-text-actions">
      <button type="button" className="mod-btn-text-action edit" onClick={() => void openView(t)}>
        Xem
      </button>
      {t.status !== "ARCHIVED" && (
        <>
          <button type="button" className="mod-btn-text-action edit" onClick={() => void openEdit(t)}>
            Sửa
          </button>
          {t.status === "DRAFT" && (
            <button type="button" className="mod-btn-text-action edit" disabled={working}
              onClick={() => void changeStatus(t, true)}>
              Xuất bản
            </button>
          )}
          {t.status === "PUBLISHED" && t.attemptCount === 0 && (
            <button type="button" className="mod-btn-text-action edit" disabled={working}
              onClick={() => void changeStatus(t, false)}>
              Về nháp
            </button>
          )}
          <button type="button" className="mod-btn-text-action delete" onClick={() => setDeleting(t)}>
            Xóa
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">Bài kiểm tra</h2>
          <p className="admin-main-subtitle">
            Mini test theo bài học và test chương tổng hợp Kanji, Từ vựng, Ngữ pháp. Câu hỏi chọn từ Ngân hàng câu hỏi.
          </p>
        </div>
        <button type="button" className="mod-btn-add" style={{ backgroundColor: MOD_COLOR }} onClick={openCreate}>
          + Tạo bài kiểm tra
        </button>
      </div>

      {notice && (
        <div className={`admin-alert-banner ${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.type === "success" ? "✅" : "⚠️"} {notice.text}
        </div>
      )}

      {/* Bước 2: bộ lọc */}
      <div className="admin-filter-card">
        <form className="admin-filter-form" onSubmit={handleSearch}>
          <div className="admin-search-wrapper">
            <span className="search-mag-icon">🔍</span>
            <input type="text" className="admin-filter-input" placeholder="Tìm theo tên bài kiểm tra..."
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
        </form>
        <div className="qb-filters">
          <select className="admin-filter-select" aria-label="Lọc theo loại" value={testType}
            onChange={(e) => {
              setTestType(e.target.value as ManagedTestType | "");
              resetPage();
            }}>
            <option value="">Tất cả loại</option>
            <option value="MINI_TEST">{TEST_TYPE_LABEL.MINI_TEST}</option>
            <option value="CHAPTER_TEST">{TEST_TYPE_LABEL.CHAPTER_TEST}</option>
          </select>
          <select className="admin-filter-select" aria-label="Lọc theo kỹ năng" value={skill}
            onChange={(e) => {
              setSkill(e.target.value as TestSkill | "");
              setLessonId("");
              resetPage();
            }}>
            <option value="">Tất cả kỹ năng</option>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {TEST_SKILL_LABEL[s]}
              </option>
            ))}
          </select>
          <select className="admin-filter-select" aria-label="Lọc theo trạng thái" value={status}
            onChange={(e) => {
              setStatus(e.target.value as TestStatus | "");
              resetPage();
            }}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(TEST_STATUS_LABEL) as TestStatus[]).map((s) => (
              <option key={s} value={s}>
                {TEST_STATUS_LABEL[s]}
              </option>
            ))}
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
            disabled={chapterId === ""} title={chapterId === "" ? "Chọn chương trước" : undefined}
            onChange={(e) => {
              setLessonId(toNumber(e.target.value));
              resetPage();
            }}>
            <option value="">{chapterId === "" ? "Chọn chương để lọc bài học" : "Tất cả bài học"}</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {lessonSkill ? "" : `${SKILL_LABEL[l.skillType as keyof typeof SKILL_LABEL] ?? l.skillType} · `}
                {lessonLabel(targets, l, false)}
              </option>
            ))}
          </select>
        </div>
        {!hasError && (
          <div className="admin-quick-stats-row">
            <span className="quick-stats-label">Tổng quan:</span>
            <span className="stat-pill pill-total">{totalElements} bài kiểm tra</span>
          </div>
        )}
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <div className="admin-spinner mod-spinner" />
            <span>Đang tải bài kiểm tra...</span>
          </div>
        ) : hasError ? (
          <div className="admin-table-empty">
            <div className="admin-alert-banner error mod-error-banner" role="alert">
              <span>⚠️ {LOAD_ERROR}</span>
              <button type="button" className="mod-btn-retry" onClick={() => void fetchTests()}>
                Thử lại
              </button>
            </div>
          </div>
        ) : totalElements === 0 ? (
          <div className="admin-table-empty">
            <span style={{ fontSize: "2rem" }}>📭</span>
            <p style={{ marginTop: "8px", fontWeight: 700, color: "#0f172a" }}>
              {isFiltering ? "Không có bài kiểm tra phù hợp" : "Chưa có bài kiểm tra nào"}
            </p>
            {!isFiltering && <p>Bấm "+ Tạo bài kiểm tra" để tạo đề đầu tiên.</p>}
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-dekiru-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>STT</th>
                  <th>TÊN ĐỀ</th>
                  <th style={{ width: "110px" }}>LOẠI</th>
                  <th style={{ width: "100px" }}>KỸ NĂNG</th>
                  <th>PHẠM VI</th>
                  <th style={{ width: "70px" }}>SỐ CÂU</th>
                  <th style={{ width: "90px" }}>THỜI GIAN</th>
                  <th style={{ width: "80px" }}>ĐIỂM ĐẠT</th>
                  <th style={{ width: "80px" }}>LƯỢT LÀM</th>
                  <th style={{ width: "130px" }}>TRẠNG THÁI</th>
                  <th style={{ textAlign: "center", width: "220px" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t, index) => (
                  <tr key={t.id}>
                    <td>
                      <span className="mod-lesson-row-index">{page * PAGE_SIZE + index + 1}</span>
                    </td>
                    <td>
                      <div className="qb-content-cell" title={t.title}>
                        {t.title}
                      </div>
                    </td>
                    <td>{TEST_TYPE_LABEL[t.testType]}</td>
                    <td className="cell-email">{TEST_SKILL_LABEL[t.skill]}</td>
                    <td className="cell-email">{scopeText(t)}</td>
                    <td className="cell-email">{t.questionCount}</td>
                    <td className="cell-email">{t.durationMinutes} phút</td>
                    <td className="cell-email">{Number(t.passingScore)}%</td>
                    <td className="cell-email">{t.attemptCount}</td>
                    <td>
                      <span className={`status-badge-pill ${STATUS_PILL[t.status]}`}>
                        <span className="pill-dot" />
                        {TEST_STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td>{actions(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !hasError && totalPages > 1 && (
          <div className="admin-pagination-footer">
            <span className="pagination-info">
              Hiển thị trang <strong>{page + 1}</strong> / <strong>{totalPages}</strong> ({totalElements} bài kiểm tra)
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

      {/* A1: chi tiết đề */}
      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal-card tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{viewing.summary.title}</h3>
              <button type="button" className="modal-btn-close" onClick={() => setViewing(null)}>
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <div className="qb-detail-row">
                <span>Loại / kỹ năng</span>
                <span>
                  {TEST_TYPE_LABEL[viewing.summary.testType]} · {TEST_SKILL_LABEL[viewing.summary.skill]}
                </span>
              </div>
              <div className="qb-detail-row">
                <span>Phạm vi</span>
                <span>{scopeText(viewing.summary)}</span>
              </div>
              <div className="qb-detail-row">
                <span>Mô tả</span>
                <span style={{ whiteSpace: "pre-wrap" }}>{viewing.description || "—"}</span>
              </div>
              <div className="qb-detail-row">
                <span>Thời gian / điểm đạt</span>
                <span>
                  {viewing.summary.durationMinutes} phút · {Number(viewing.summary.passingScore)}%
                </span>
              </div>
              <div className="qb-detail-row">
                <span>Trạng thái</span>
                <span>
                  {TEST_STATUS_LABEL[viewing.summary.status]} · {viewing.summary.attemptCount} lượt làm
                  {viewing.locked && <div className="cell-email">Đã có học viên làm — chỉ sửa được tên và mô tả (BR-T6).</div>}
                </span>
              </div>
              <div className="qb-detail-row">
                <span>Câu hỏi ({viewing.questions.length})</span>
                <span className="tm-list tm-list-plain">
                  {viewing.questions.length === 0
                    ? "Chưa có câu hỏi."
                    : viewing.questions.map((q, index) => (
                        <div key={q.id} className="tm-detail-question">
                          <strong>{index + 1}.</strong> {q.content}
                          <div className="cell-email">
                            {SKILL_LABEL[q.skill]} · {FORMAT_LABEL[q.questionType]}
                            {q.status === "ARCHIVED" ? " · Đã lưu trữ" : ""}
                          </div>
                          <div className="tm-item-answer">Đáp án: {answerPreview(q)}</div>
                        </div>
                      ))}
                </span>
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-modal-cancel" onClick={() => setViewing(null)}>
                  Đóng
                </button>
                {viewing.summary.status !== "ARCHIVED" && (
                  <button type="button" className="btn-modal-submit" style={{ backgroundColor: MOD_COLOR }}
                    onClick={() => void openEdit(viewing.summary)}>
                    Sửa bài kiểm tra
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A5: xác nhận xóa */}
      {deleting && (
        <div className="modal-overlay" onClick={() => !working && setDeleting(null)}>
          <div className="modal-card" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Xác nhận xóa bài kiểm tra</h3>
              <button type="button" className="modal-btn-close" disabled={working} onClick={() => setDeleting(null)}>
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <p className="modal-description">Bạn có chắc muốn xóa bài kiểm tra này?</p>
              <p className="modal-description">
                <strong>{deleting.title}</strong>
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

      <TestFormModal
        open={formOpen}
        detail={editing}
        targets={targets}
        onClose={() => setFormOpen(false)}
        onSaved={(_saved, message) => {
          setFormOpen(false);
          setEditing(null);
          setNotice({ type: message.startsWith("Đã lưu bài kiểm tra ở trạng thái Nháp") ? "error" : "success", text: message });
          void fetchTests();
        }}
      />
    </div>
  );
}
