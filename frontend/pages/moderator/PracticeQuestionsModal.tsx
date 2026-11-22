import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import {
  deleteConjugationQuestion,
  getPracticeQuestions,
  updatePracticeQuestions,
  type ConjugationFormSummary,
  type PracticeQuestion,
  type QuestionDifficulty,
  type VerbGroup,
} from "../../api/conjugationFormApi";
import { ConjugationQuestionModal } from "./ConjugationQuestionModal";

// SD-29.5 Configure Practice Questions (UC-47, bước 5): chọn câu dùng cho luyện tập, lọc theo độ khó và
// nhóm động từ, thêm / sửa / xóa (mềm) câu hỏi thủ công. Comment đánh số theo sequence diagram.

const MOD_COLOR = "#0d9488";
const LOAD_ERROR = "Không thể tải dữ liệu. Vui lòng thử lại.";

const DIFFICULTIES: ReadonlyArray<{ value: QuestionDifficulty; label: string }> = [
  { value: "EASY", label: "Dễ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HARD", label: "Khó" },
];
const GROUPS: ReadonlyArray<{ value: VerbGroup; label: string }> = [
  { value: 1, label: "Nhóm I" },
  { value: 2, label: "Nhóm II" },
  { value: 3, label: "Nhóm III" },
];

interface Props {
  form: ConjugationFormSummary | null;
  onClose: () => void;
  onSaved: (updated: ConjugationFormSummary) => void;
}

function errorMessage(error: unknown, fallback: string): string {
  const message = isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message : undefined;
  return message || fallback;
}

export function PracticeQuestionsModal({ form, onClose, onSaved }: Props) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [difficultyFilter, setDifficultyFilter] = useState<QuestionDifficulty | "ALL">("ALL");
  const [groupFilter, setGroupFilter] = useState<VerbGroup | 0>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Hộp thoại thêm / sửa câu hỏi: undefined = đóng, null = thêm mới
  const [editing, setEditing] = useState<PracticeQuestion | null | undefined>(undefined);

  // 1.1: getPracticeQuestions(id) — tải toàn bộ câu ACTIVE một lần, lọc độ khó và nhóm trên Browser
  const load = async (formId: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPracticeQuestions(formId);
      setQuestions(result);
      setSelectedIds(new Set(result.filter((q) => q.selected).map((q) => q.id)));
    } catch (e) {
      // 1.2: showError(message) — 404 hoặc lỗi khác
      setError(errorMessage(e, LOAD_ERROR));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (form) {
      setDifficultyFilter("ALL");
      setGroupFilter(0);
      setNotice(null);
      setEditing(undefined);
      load(form.id);
    }
  }, [form]);

  // 2.1: updateCounters() — số câu đã chọn theo nhóm × độ khó
  const matrix = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      if (!selectedIds.has(q.id)) continue;
      counts[`${q.verbGroup}-${q.difficulty}`] = (counts[`${q.verbGroup}-${q.difficulty}`] ?? 0) + 1;
    }
    return counts;
  }, [questions, selectedIds]);

  if (!form) return null;

  const required = form.questionsPerPractice;
  const total = selectedIds.size;
  const unknownGroup = questions.filter((q) => q.verbGroup === 0).length;
  const visible = questions.filter(
    (q) =>
      (difficultyFilter === "ALL" || q.difficulty === difficultyFilter) &&
      (groupFilter === 0 || q.verbGroup === groupFilter),
  );

  // 2: toggleQuestion(questionId)
  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 3: clickSave() -> 3.1: updatePracticeQuestions(id, questionIds)
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePracticeQuestions(form.id, [...selectedIds]);
      onSaved(updated); // 3.4 showMessage + ref SD-29.2 (làm mới danh sách) do màn danh sách xử lý
    } catch (e) {
      // 3.2 (BR103) / 3.3 (luồng 5a, BR111): showError(message)
      setError(errorMessage(e, LOAD_ERROR));
    } finally {
      setSaving(false);
    }
  };

  // Thêm / sửa thành công: cập nhật danh sách tại chỗ, giữ các lựa chọn chưa lưu
  const handleQuestionSaved = (saved: PracticeQuestion, isEdit: boolean) => {
    setQuestions((prev) => (isEdit ? prev.map((q) => (q.id === saved.id ? saved : q)) : [...prev, saved]));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (saved.selected) next.add(saved.id);
      else next.delete(saved.id);
      return next;
    });
    setEditing(undefined);
    setNotice(isEdit ? "Đã cập nhật câu hỏi." : "Đã thêm câu hỏi.");
  };

  // Xóa mềm: câu hỏi chuyển sang Lưu trữ, lịch sử làm bài của học viên vẫn giữ nguyên
  const handleDelete = async (q: PracticeQuestion) => {
    if (!window.confirm(`Xóa câu hỏi "${q.content}"? Câu hỏi sẽ được chuyển sang Lưu trữ.`)) return;
    setError(null);
    setNotice(null);
    try {
      await deleteConjugationQuestion(form.id, q.id);
      setQuestions((prev) => prev.filter((item) => item.id !== q.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(q.id);
        return next;
      });
      setNotice("Đã xóa câu hỏi.");
    } catch (e) {
      setError(errorMessage(e, "Không xóa được câu hỏi. Vui lòng thử lại."));
    }
  };

  const groupLabel = (g: number) => GROUPS.find((x) => x.value === g)?.label ?? "Chưa rõ nhóm";
  const difficultyLabel = (d: QuestionDifficulty) => DIFFICULTIES.find((x) => x.value === d)?.label ?? d;

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="modal-card" style={{ maxWidth: "860px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            Câu hỏi luyện tập — {form.nameJp} ({form.code})
          </h3>
          <button type="button" className="modal-btn-close" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-form-body">
          {/* 1.3: displayQuestions — bộ đếm theo nhóm × độ khó */}
          <p className="modal-description">
            Đã chọn <strong>{total}</strong> câu / mỗi lượt cần <strong>{required}</strong> câu
            {total < required && <span style={{ color: "#dc2626" }}> (chưa đủ cho một lượt)</span>}.
            {unknownGroup > 0 && <span> Có {unknownGroup} câu chưa rõ nhóm, hãy sửa để gán nhóm.</span>}
          </p>
          <table className="admin-dekiru-table" style={{ marginBottom: "12px" }}>
            <thead>
              <tr>
                <th>ĐÃ CHỌN</th>
                {DIFFICULTIES.map((d) => (
                  <th key={d.value} style={{ textAlign: "center" }}>{d.label.toUpperCase()}</th>
                ))}
                <th style={{ textAlign: "center" }}>CỘNG</th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => {
                const row = DIFFICULTIES.map((d) => matrix[`${g.value}-${d.value}`] ?? 0);
                return (
                  <tr key={g.value}>
                    <td>{g.label}</td>
                    {row.map((n, i) => (
                      <td key={i} style={{ textAlign: "center" }}>{n}</td>
                    ))}
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{row.reduce((a, b) => a + b, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "12px" }}>
            <select
              className="modal-input"
              style={{ maxWidth: "180px" }}
              aria-label="Lọc theo độ khó"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as QuestionDifficulty | "ALL")}
            >
              <option value="ALL">Tất cả độ khó</option>
              {DIFFICULTIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              className="modal-input"
              style={{ maxWidth: "180px" }}
              aria-label="Lọc theo nhóm động từ"
              value={groupFilter}
              onChange={(e) => setGroupFilter(Number(e.target.value) as VerbGroup | 0)}
            >
              <option value={0}>Tất cả nhóm</option>
              {GROUPS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-modal-submit"
              style={{ backgroundColor: MOD_COLOR, marginLeft: "auto" }}
              disabled={saving || loading}
              onClick={() => {
                setNotice(null);
                setEditing(null);
              }}
            >
              + Thêm câu hỏi
            </button>
          </div>

          {notice && (
            <div className="admin-alert-banner success" role="status" style={{ marginBottom: "12px" }}>
              ✅ {notice}
            </div>
          )}
          {error && (
            <div className="admin-alert-banner error" role="alert" style={{ marginBottom: "12px" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            {loading ? (
              <p className="modal-description" style={{ padding: "12px" }}>Đang tải câu hỏi...</p>
            ) : visible.length === 0 ? (
              <p className="modal-description" style={{ padding: "12px" }}>
                {questions.length === 0 ? "Thể chia chưa có câu hỏi nào. Bấm \"+ Thêm câu hỏi\" để tạo." : "Không có câu hỏi phù hợp bộ lọc."}
              </p>
            ) : (
              visible.map((q) => (
                <div
                  key={q.id}
                  style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}
                >
                  <input
                    type="checkbox"
                    aria-label={`Dùng câu ${q.content} cho luyện tập`}
                    checked={selectedIds.has(q.id)}
                    onChange={() => toggle(q.id)}
                    disabled={saving}
                  />
                  <span style={{ flex: 1 }}>
                    {q.content}
                    <span className="cell-email" style={{ display: "block" }}>Đáp án: {q.correctAnswer || "—"}</span>
                  </span>
                  <span className="cell-email" style={{ width: "80px" }}>{groupLabel(q.verbGroup)}</span>
                  <span className="cell-email" style={{ width: "80px" }}>{difficultyLabel(q.difficulty)}</span>
                  <div className="mod-text-actions">
                    <button type="button" className="mod-btn-text-action edit" disabled={saving}
                      onClick={() => { setNotice(null); setEditing(q); }}>
                      Sửa
                    </button>
                    <button type="button" className="mod-btn-text-action delete" disabled={saving}
                      onClick={() => handleDelete(q)}>
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" disabled={saving} onClick={onClose}>
              Hủy bỏ
            </button>
            <button
              type="button"
              className="btn-modal-submit"
              style={{ backgroundColor: MOD_COLOR }}
              disabled={saving || loading}
              onClick={handleSave}
            >
              {saving ? "Đang lưu..." : "Lưu lựa chọn"}
            </button>
          </div>
        </div>
      </div>

      <ConjugationQuestionModal
        form={form}
        question={editing ?? null}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        onSaved={handleQuestionSaved}
      />
    </div>
  );
}
