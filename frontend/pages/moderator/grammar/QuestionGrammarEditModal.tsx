import axios from "axios";
import { useState, type FormEvent } from "react";
import {
  updateQuestionGrammar,
  type GrammarQuestion,
  type GrammarQuestionUpdateInput,
} from "../../../api/grammarQuestionApi";

interface QuestionGrammarEditModalProps {
  question: GrammarQuestion;
  onClose: () => void;
  onUpdated: (question: GrammarQuestion) => void;
}

const optionKeys = ["A", "B", "C", "D"] as const;
type OptionKey = typeof optionKeys[number];

function parseMcqAnswerData(answerData: string): { options: Record<OptionKey, string>; correctAnswer: OptionKey } | null {
  try {
    const data: unknown = JSON.parse(answerData);
    if (!data || typeof data !== "object") return null;
    const candidate = data as { options?: unknown; correctAnswer?: unknown };
    if (!candidate.options || typeof candidate.options !== "object") return null;
    const options = candidate.options as Record<string, unknown>;
    if (optionKeys.some((key) => typeof options[key] !== "string")) return null;
    if (typeof candidate.correctAnswer !== "string" || !optionKeys.includes(candidate.correctAnswer as OptionKey)) return null;
    return {
      options: {
        A: options.A as string,
        B: options.B as string,
        C: options.C as string,
        D: options.D as string,
      },
      correctAnswer: candidate.correctAnswer as OptionKey,
    };
  } catch {
    return null;
  }
}

export function QuestionGrammarEditModal({ question, onClose, onUpdated }: QuestionGrammarEditModalProps) {
  const [initialMcqAnswer] = useState(() => parseMcqAnswerData(question.answerData));
  const [form, setForm] = useState({
    questionType: question.questionType,
    content: question.content,
    explanation: question.explanation ?? "",
    answerData: question.answerData,
    options: initialMcqAnswer?.options ?? { A: "", B: "", C: "", D: "" },
    correctAnswer: (initialMcqAnswer?.correctAnswer ?? "") as OptionKey | "",
    difficulty: question.difficulty,
    displayOrder: String(question.displayOrder),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    if (!form.content.trim() || !form.questionType || !form.difficulty) {
      setError("Vui lòng nhập đầy đủ thông tin câu hỏi.");
      return;
    }
    const displayOrder = Number(form.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 65535 || !form.displayOrder.trim()) {
      setError("Thứ tự hiển thị phải là số nguyên từ 0 đến 65535.");
      return;
    }
    let answerData: string;
    if (form.questionType === "MCQ") {
      if (optionKeys.some((key) => !form.options[key].trim()) || !form.correctAnswer) {
        setError("Vui lòng nhập đủ bốn đáp án A–D và chọn đáp án đúng.");
        return;
      }
      answerData = JSON.stringify({
        options: {
          A: form.options.A.trim(),
          B: form.options.B.trim(),
          C: form.options.C.trim(),
          D: form.options.D.trim(),
        },
        correctAnswer: form.correctAnswer,
      });
    } else {
      if (!form.answerData.trim()) {
        setError("Vui lòng nhập thông tin đáp án.");
        return;
      }
      try {
        JSON.parse(form.answerData);
      } catch {
        setError("Đáp án phải là JSON hợp lệ.");
        return;
      }
      answerData = form.answerData.trim();
    }

    const payload: GrammarQuestionUpdateInput = {
      questionType: form.questionType,
      content: form.content.trim(),
      explanation: form.explanation.trim() || null,
      answerData,
      difficulty: form.difficulty,
      displayOrder,
    };

    setError(null);
    setSaving(true);
    try {
      const updated = await updateQuestionGrammar(question.id, payload);
      onUpdated(updated);
    } catch (caughtError) {
      const apiError = axios.isAxiosError<{ message?: string }>(caughtError) ? caughtError : null;
      const backendMessage = apiError?.response?.data?.message;
      setError(
        apiError?.response?.status === 404
          ? "Câu hỏi không còn tồn tại. Vui lòng tải lại danh sách."
          : typeof backendMessage === "string" && backendMessage.trim()
            ? backendMessage
            : "Không thể cập nhật câu hỏi Grammar. Dữ liệu đã nhập vẫn được giữ để thử lại."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="question-grammar-edit-title" style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h3 className="modal-title" id="question-grammar-edit-title">Chỉnh sửa câu hỏi Grammar #{question.id}</h3>
          <button type="button" className="modal-btn-close" onClick={onClose} disabled={saving} aria-label="Đóng">✕</button>
        </div>
        <form className="modal-form-body" onSubmit={(event) => void handleSubmit(event)}>
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="question-grammar-edit-type">Loại câu hỏi *</label>
              <select id="question-grammar-edit-type" className="modal-input" value={form.questionType} disabled={saving}
                onChange={(event) => setForm({ ...form, questionType: event.target.value as GrammarQuestion["questionType"] })}>
                <option value="MCQ">MCQ</option>
                <option value="FILL_IN">FILL_IN</option>
                <option value="MATCHING">MATCHING</option>
              </select>
            </div>
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="question-grammar-edit-difficulty">Độ khó *</label>
              <select id="question-grammar-edit-difficulty" className="modal-input" value={form.difficulty} disabled={saving}
                onChange={(event) => setForm({ ...form, difficulty: event.target.value as GrammarQuestion["difficulty"] })}>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="question-grammar-edit-content">Nội dung *</label>
            <textarea id="question-grammar-edit-content" className="modal-textarea" required rows={3} value={form.content} disabled={saving}
              onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="question-grammar-edit-explanation">Giải thích</label>
            <textarea id="question-grammar-edit-explanation" className="modal-textarea" rows={3} value={form.explanation} disabled={saving}
              onChange={(event) => setForm({ ...form, explanation: event.target.value })} />
          </div>
          {form.questionType === "MCQ" ? (
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="modal-label" style={{ marginBottom: "12px" }}>Các lựa chọn và đáp án đúng *</legend>
              {question.questionType === "MCQ" && !initialMcqAnswer && (
                <p role="status" style={{ color: "#92400e" }}>
                  Dữ liệu đáp án hiện tại chưa theo dạng A–D. Vui lòng nhập lại bốn lựa chọn và chọn đáp án đúng trước khi lưu.
                </p>
              )}
              {optionKeys.map((key) => (
                <div className="modal-field-group" key={key} style={{ marginBottom: "12px" }}>
                  <label className="modal-label" htmlFor={`question-grammar-edit-option-${key}`}>Đáp án {key} *</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <input id={`question-grammar-edit-option-${key}`} className="modal-input" required
                      style={{ minWidth: 0, flex: 1 }} value={form.options[key]} disabled={saving}
                      onChange={(event) => setForm({ ...form, options: { ...form.options, [key]: event.target.value } })} />
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                      <input type="radio" name="question-grammar-edit-correct" value={key}
                        checked={form.correctAnswer === key} disabled={saving}
                        onChange={() => setForm({ ...form, correctAnswer: key })} />
                      Đúng
                    </label>
                  </div>
                </div>
              ))}
            </fieldset>
          ) : (
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="question-grammar-edit-answer">Đáp án (JSON) *</label>
              <textarea id="question-grammar-edit-answer" className="modal-textarea" required rows={5} value={form.answerData} disabled={saving}
                onChange={(event) => setForm({ ...form, answerData: event.target.value })} />
            </div>
          )}
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="question-grammar-edit-order">Thứ tự hiển thị *</label>
            <input id="question-grammar-edit-order" className="modal-input" type="number" min="0" max="65535" step="1" required
              value={form.displayOrder} disabled={saving} onChange={(event) => setForm({ ...form, displayOrder: event.target.value })} />
          </div>
          {error && <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</p>}
          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="mod-btn-add mod-question-btn--secondary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
