import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import {
  createConjugationQuestion,
  updateConjugationQuestion,
  type ConjugationFormSummary,
  type ConjugationQuestionInput,
  type PracticeQuestion,
  type QuestionDifficulty,
  type VerbGroup,
} from "../../api/conjugationFormApi";

// UC-47 bước 5: Moderator thêm / sửa câu hỏi thể chia thủ công.
// Học viên tự chọn làm bài kiểu nhập đáp án hoặc trắc nghiệm, nên mỗi câu cần đáp án đúng
// và có thể có thêm phương án nhiễu cho trắc nghiệm.

const MOD_COLOR = "#0d9488";

interface FormState {
  verb: string;
  reading: string;
  meaningVi: string;
  verbGroup: VerbGroup | "";
  difficulty: QuestionDifficulty | "";
  correctAnswer: string;
  acceptedAnswers: string;
  options: [string, string, string];
  explanation: string;
  isExerciseQuestion: boolean;
}

const EMPTY: FormState = {
  verb: "",
  reading: "",
  meaningVi: "",
  verbGroup: "",
  difficulty: "",
  correctAnswer: "",
  acceptedAnswers: "",
  options: ["", "", ""],
  explanation: "",
  isExerciseQuestion: true,
};

function fromQuestion(q: PracticeQuestion): FormState {
  return {
    verb: q.verb,
    reading: q.reading,
    meaningVi: q.meaningVi,
    verbGroup: q.verbGroup === 0 ? "" : q.verbGroup,
    difficulty: q.difficulty,
    correctAnswer: q.correctAnswer,
    acceptedAnswers: q.acceptedAnswers.join(", "),
    options: [q.options[0] ?? "", q.options[1] ?? "", q.options[2] ?? ""],
    explanation: q.explanation ?? "",
    isExerciseQuestion: q.selected,
  };
}

interface Props {
  form: ConjugationFormSummary;
  /** null = thêm mới */
  question: PracticeQuestion | null;
  open: boolean;
  onClose: () => void;
  onSaved: (saved: PracticeQuestion, isEdit: boolean) => void;
}

export function ConjugationQuestionModal({ form, question, open, onClose, onSaved }: Props) {
  const [state, setState] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState(question ? fromQuestion(question) : EMPTY);
    setErrors({});
    setServerError(null);
  }, [open, question]);

  if (!open) return null;

  const isEdit = question !== null;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState((prev) => ({ ...prev, [key]: value }));
  const formName = form.nameVi ? form.nameVi.charAt(0).toLowerCase() + form.nameVi.slice(1) : "";
  const preview = state.verb.trim()
    ? `Chia động từ ${state.verb.trim()}${state.reading.trim() ? ` (${state.reading.trim()})` : ""} sang ${formName}.`
    : "";

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!state.verb.trim()) next.verb = "Vui lòng nhập động từ.";
    if (!state.correctAnswer.trim()) next.correctAnswer = "Vui lòng nhập đáp án đúng.";
    if (!state.verbGroup) next.verbGroup = "Vui lòng chọn nhóm động từ.";
    if (!state.difficulty) next.difficulty = "Vui lòng chọn độ khó.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: ConjugationQuestionInput = {
      verb: state.verb.trim(),
      reading: state.reading.trim(),
      meaningVi: state.meaningVi.trim(),
      verbGroup: state.verbGroup as VerbGroup,
      difficulty: state.difficulty as QuestionDifficulty,
      correctAnswer: state.correctAnswer.trim(),
      acceptedAnswers: state.acceptedAnswers.split(/[,、]/).map((v) => v.trim()).filter(Boolean),
      options: state.options.map((v) => v.trim()).filter(Boolean),
      explanation: state.explanation.trim(),
      isExerciseQuestion: state.isExerciseQuestion,
    };
    setSaving(true);
    setServerError(null);
    try {
      const saved = isEdit
        ? await updateConjugationQuestion(form.id, question.id, payload)
        : await createConjugationQuestion(form.id, payload);
      onSaved(saved, isEdit);
    } catch (err) {
      const message = isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      setServerError(message || "Không lưu được câu hỏi. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: keyof FormState) =>
    errors[key] ? <span style={{ color: "#dc2626", fontSize: "0.8rem" }}>{errors[key]}</span> : null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        e.stopPropagation(); // không đóng hộp thoại "Câu hỏi luyện tập" phía sau
        if (!saving) onClose();
      }}
    >
      <div className="modal-card" style={{ maxWidth: "640px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? "Sửa câu hỏi" : "Thêm câu hỏi"} — {form.nameJp}</h3>
          <button type="button" className="modal-btn-close" disabled={saving} onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="modal-form-body" onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="admin-alert-banner error" role="alert" style={{ marginBottom: "12px" }}>
              ⚠️ {serverError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <label className="modal-field-group">
              <span className="modal-label">Động từ *</span>
              <input className="modal-input" maxLength={50} value={state.verb} disabled={saving}
                placeholder="書く" onChange={(e) => set("verb", e.target.value)} />
              {fieldError("verb")}
            </label>
            <label className="modal-field-group">
              <span className="modal-label">Cách đọc</span>
              <input className="modal-input" maxLength={50} value={state.reading} disabled={saving}
                placeholder="かく" onChange={(e) => set("reading", e.target.value)} />
            </label>
            <label className="modal-field-group">
              <span className="modal-label">Nghĩa tiếng Việt</span>
              <input className="modal-input" maxLength={100} value={state.meaningVi} disabled={saving}
                placeholder="viết" onChange={(e) => set("meaningVi", e.target.value)} />
            </label>
            <label className="modal-field-group">
              <span className="modal-label">Nhóm động từ *</span>
              <select className="modal-input" value={state.verbGroup} disabled={saving}
                onChange={(e) => set("verbGroup", (e.target.value ? Number(e.target.value) : "") as VerbGroup | "")}>
                <option value="">-- Chọn --</option>
                <option value={1}>Nhóm I</option>
                <option value={2}>Nhóm II</option>
                <option value={3}>Nhóm III</option>
              </select>
              {fieldError("verbGroup")}
            </label>
            <label className="modal-field-group">
              <span className="modal-label">Độ khó *</span>
              <select className="modal-input" value={state.difficulty} disabled={saving}
                onChange={(e) => set("difficulty", e.target.value as QuestionDifficulty | "")}>
                <option value="">-- Chọn --</option>
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
              {fieldError("difficulty")}
            </label>
            <label className="modal-field-group">
              <span className="modal-label">Đáp án đúng *</span>
              <input className="modal-input" maxLength={50} value={state.correctAnswer} disabled={saving}
                placeholder="書いて" onChange={(e) => set("correctAnswer", e.target.value)} />
              {fieldError("correctAnswer")}
            </label>
          </div>

          {preview && (
            <p className="modal-description" style={{ marginTop: "10px" }}>
              Câu hỏi hiển thị: <strong>{preview}</strong>
            </p>
          )}

          <label className="modal-field-group" style={{ marginTop: "10px" }}>
            <span className="modal-label">Cách viết khác được chấp nhận (cách nhau bởi dấu phẩy)</span>
            <input className="modal-input" value={state.acceptedAnswers} disabled={saving}
              placeholder="かいて" onChange={(e) => set("acceptedAnswers", e.target.value)} />
          </label>

          <div className="modal-field-group" style={{ marginTop: "10px" }}>
            <span className="modal-label">Phương án nhiễu cho trắc nghiệm (không bắt buộc; để trống hệ thống tự lấy đáp án của câu khác)</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {state.options.map((value, i) => (
                <input key={i} className="modal-input" maxLength={50} value={value} disabled={saving}
                  placeholder={["書きて", "書って", "書かて"][i]}
                  onChange={(e) => {
                    const next = [...state.options] as [string, string, string];
                    next[i] = e.target.value;
                    set("options", next);
                  }} />
              ))}
            </div>
          </div>

          <label className="modal-field-group" style={{ marginTop: "10px" }}>
            <span className="modal-label">Giải thích</span>
            <textarea className="modal-textarea" rows={2} maxLength={500} value={state.explanation} disabled={saving}
              placeholder="Nhóm I, đuôi く → いて" onChange={(e) => set("explanation", e.target.value)} />
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px" }}>
            <input type="checkbox" checked={state.isExerciseQuestion} disabled={saving}
              onChange={(e) => set("isExerciseQuestion", e.target.checked)} />
            Dùng cho luyện tập
          </label>

          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" disabled={saving} onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-modal-submit" style={{ backgroundColor: MOD_COLOR }} disabled={saving}>
              {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm câu hỏi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
