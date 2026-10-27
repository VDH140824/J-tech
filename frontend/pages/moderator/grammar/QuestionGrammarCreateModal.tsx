import axios from "axios";
import { useState, type FormEvent } from "react";
import {
  createQuestionGrammar,
  type GrammarQuestion,
  type GrammarQuestionCreateInput,
} from "../../../api/grammarQuestionApi";

interface QuestionGrammarCreateModalProps {
  lessonId: number;
  onClose: () => void;
  onCreated: (question: GrammarQuestion) => void;
}

const optionKeys = ["A", "B", "C", "D"] as const;
type OptionKey = typeof optionKeys[number];

export function QuestionGrammarCreateModal({ lessonId, onClose, onCreated }: QuestionGrammarCreateModalProps) {
  const [form, setForm] = useState({
    questionType: "MCQ" as GrammarQuestion["questionType"],
    content: "",
    explanation: "",
    answerData: "",
    options: { A: "", B: "", C: "", D: "" },
    correctAnswer: "" as OptionKey | "",
    difficulty: "EASY" as GrammarQuestion["difficulty"],
    isExerciseQuestion: true,
    displayOrder: "0",
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
    if (!form.displayOrder.trim() || !Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 65535) {
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

    const payload: GrammarQuestionCreateInput = {
      questionType: form.questionType,
      lessonId,
      content: form.content.trim(),
      explanation: form.explanation.trim() || null,
      answerData,
      difficulty: form.difficulty,
      isExerciseQuestion: form.isExerciseQuestion,
      displayOrder,
    };

    setError(null);
    setSaving(true);
    try {
      const created = await createQuestionGrammar(payload);
      onCreated(created);
    } catch (caughtError) {
      const apiError = axios.isAxiosError<{ message?: string }>(caughtError) ? caughtError : null;
      const backendMessage = apiError?.response?.data?.message;
      setError(
        typeof backendMessage === "string" && backendMessage.trim()
          ? backendMessage
          : "Thêm câu hỏi ngữ pháp thất bại. Dữ liệu đã nhập vẫn được giữ để thử lại."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="question-grammar-create-title" style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h3 className="modal-title" id="question-grammar-create-title">Thêm câu hỏi Grammar</h3>
          <button type="button" className="modal-btn-close" onClick={onClose} disabled={saving} aria-label="Đóng">✕</button>
        </div>
        <form className="modal-form-body" onSubmit={(event) => void handleSubmit(event)}>
          <p className="modal-description">Câu hỏi thuộc bài học ID {lessonId}. Kỹ năng Grammar được hệ thống tự gán.</p>
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="question-grammar-create-type">Loại câu hỏi *</label>
              <select id="question-grammar-create-type" className="modal-input" value={form.questionType} disabled={saving}
                onChange={(event) => setForm({ ...form, questionType: event.target.value as GrammarQuestion["questionType"] })}>
                <option value="MCQ">MCQ</option>
                <option value="FILL_IN">FILL_IN</option>
                <option value="MATCHING">MATCHING</option>
              </select>
            </div>
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="question-grammar-create-difficulty">Độ khó *</label>
              <select id="question-grammar-create-difficulty" className="modal-input" value={form.difficulty} disabled={saving}
                onChange={(event) => setForm({ ...form, difficulty: event.target.value as GrammarQuestion["difficulty"] })}>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="question-grammar-create-content">Nội dung *</label>
            <textarea id="question-grammar-create-content" className="modal-textarea" required rows={3} value={form.content} disabled={saving}
              onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="question-grammar-create-explanation">Giải thích</label>
            <textarea id="question-grammar-create-explanation" className="modal-textarea" rows={3} value={form.explanation} disabled={saving}
              onChange={(event) => setForm({ ...form, explanation: event.target.value })} />
          </div>
          {form.questionType === "MCQ" ? (
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="modal-label" style={{ marginBottom: "12px" }}>Các lựa chọn và đáp án đúng *</legend>
              {optionKeys.map((key) => (
                <div className="modal-field-group" key={key} style={{ marginBottom: "12px" }}>
                  <label className="modal-label" htmlFor={`question-grammar-create-option-${key}`}>Đáp án {key} *</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <input id={`question-grammar-create-option-${key}`} className="modal-input" required
                      style={{ minWidth: 0, flex: 1 }} value={form.options[key]} disabled={saving}
                      onChange={(event) => setForm({ ...form, options: { ...form.options, [key]: event.target.value } })} />
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                      <input type="radio" name="question-grammar-create-correct" value={key}
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
              <label className="modal-label" htmlFor="question-grammar-create-answer">Đáp án (JSON) *</label>
              <textarea id="question-grammar-create-answer" className="modal-textarea" required rows={5} value={form.answerData} disabled={saving}
                onChange={(event) => setForm({ ...form, answerData: event.target.value })} />
            </div>
          )}
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="question-grammar-create-order">Thứ tự hiển thị *</label>
              <input id="question-grammar-create-order" className="modal-input" type="number" min="0" max="65535" step="1" required
                value={form.displayOrder} disabled={saving} onChange={(event) => setForm({ ...form, displayOrder: event.target.value })} />
            </div>
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="question-grammar-create-exercise">Câu hỏi bài tập</label>
              <input id="question-grammar-create-exercise" type="checkbox" checked={form.isExerciseQuestion} disabled={saving}
                onChange={(event) => setForm({ ...form, isExerciseQuestion: event.target.checked })} />
            </div>
          </div>
          {error && <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</p>}
          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="mod-btn-add mod-question-btn--primary" disabled={saving}>{saving ? "Đang tạo..." : "Tạo"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
