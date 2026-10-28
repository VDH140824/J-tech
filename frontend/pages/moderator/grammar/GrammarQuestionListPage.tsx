import axios from "axios";
import { useEffect, useState } from "react";
import { deleteQuestionGrammar, getAllGrammarQuestions, type GrammarQuestion } from "../../../api/grammarQuestionApi";
import { QuestionGrammarCreateModal } from "./QuestionGrammarCreateModal";
import { QuestionGrammarEditModal } from "./QuestionGrammarEditModal";

interface GrammarQuestionListPageProps {
  courseName: string;
  chapterNo: number;
  lessonTitle: string;
  lessonId: number;
  onBack: () => void;
}

function displayValue(value: string | number | boolean | null): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

function displayAnswer(question: GrammarQuestion): string {
  if (question.questionType !== "MCQ") return displayValue(question.answerData);

  try {
    const data: unknown = JSON.parse(question.answerData);
    if (!data || typeof data !== "object") return displayValue(question.answerData);
    const answer = data as { options?: unknown; correctAnswer?: unknown };
    if (!answer.options || typeof answer.options !== "object") return displayValue(question.answerData);
    const options = answer.options as Record<string, unknown>;
    const keys = ["A", "B", "C", "D"] as const;
    if (keys.some((key) => typeof options[key] !== "string") || !keys.includes(answer.correctAnswer as typeof keys[number])) {
      return displayValue(question.answerData);
    }
    return keys.map((key) => `${key}. ${options[key]}${answer.correctAnswer === key ? " (Đúng)" : ""}`).join("\n");
  } catch {
    return displayValue(question.answerData);
  }
}

export function GrammarQuestionListPage({ courseName, chapterNo, lessonTitle, lessonId, onBack }: GrammarQuestionListPageProps) {
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<GrammarQuestion | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<GrammarQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const onClickDelete = (question: GrammarQuestion) => {
    setDeleteError(null);
    setDeletingQuestion(question);
  };

  const onCancelDelete = () => {
    if (deleting) return;
    setDeletingQuestion(null);
    setDeleteError(null);
  };

  const onConfirmDelete = async () => {
    if (!deletingQuestion || deleting) return;
    const questionId = deletingQuestion.id;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteQuestionGrammar(questionId);
      setQuestions((items) => items.filter((item) => item.id !== questionId));
      setDeletingQuestion(null);
      setSuccess("Xóa câu hỏi ngữ pháp thành công.");
    } catch (caughtError) {
      const apiError = axios.isAxiosError<{ message?: string }>(caughtError) ? caughtError : null;
      const backendMessage = apiError?.response?.data?.message;
      setDeleteError(
        apiError?.response?.status === 404
          ? "Câu hỏi không còn tồn tại. Vui lòng tải lại danh sách."
          : apiError?.response?.status === 409
            ? "Câu hỏi đang được sử dụng nên không thể xóa."
            : typeof backendMessage === "string" && backendMessage.trim()
              ? backendMessage
              : "Không thể xóa câu hỏi ngữ pháp. Vui lòng thử lại."
      );
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getAllGrammarQuestions()
      .then((items) => {
        if (active) setQuestions(items);
      })
      .catch(() => {
        if (active) setError("Không thể tải danh sách câu hỏi Grammar.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [reloadKey]);

  const columns: { label: string; value: (question: GrammarQuestion) => string }[] = [
    { label: "Loại câu hỏi", value: (q) => q.questionType },
    { label: "Độ khó", value: (q) => q.difficulty },
    { label: "Nội dung", value: (q) => displayValue(q.content) },
    { label: "Giải thích", value: (q) => displayValue(q.explanation) },
    { label: "Đáp án", value: displayAnswer },
    { label: "Thứ tự hiển thị", value: (q) => displayValue(q.displayOrder) },
  ];

  return (
    <div className="admin-page-container">
      <div className="mod-chapter-back-row">
        <button type="button" className="mod-btn-back" onClick={onBack}>← Quay lại chi tiết ngữ pháp</button>
        <span className="mod-chapter-breadcrumb-pill">{courseName} / Chương {chapterNo} / {lessonTitle} / Câu hỏi Grammar</span>
      </div>
      <div className="admin-page-header">
        <div className="mod-header-action-row" style={{ width: "100%" }}>
          <div className="admin-header-titles">
            <h2 className="admin-main-title">Danh sách câu hỏi Grammar</h2>
            <p className="admin-main-subtitle">Các câu hỏi ngữ pháp đang hoạt động.</p>
          </div>
          <button type="button" className="mod-btn-add mod-question-btn--primary" disabled={loading}
            onClick={() => setIsCreateOpen(true)}>Thêm câu hỏi</button>
        </div>
      </div>

      {success && <p role="status" style={{ color: "#166534", fontWeight: 600 }}>{success}</p>}

      {loading ? (
        <div className="admin-loading-state" role="status">
          <div className="admin-loading-spinner" />
          <p className="admin-loading-text">Đang tải danh sách câu hỏi Grammar...</p>
        </div>
      ) : error ? (
        <div className="admin-empty-state" role="alert">
          <h3 className="admin-empty-title">Không thể hiển thị câu hỏi</h3>
          <p className="admin-empty-desc">{error}</p>
          <button type="button" className="mod-btn-add mod-question-btn--secondary" onClick={() => setReloadKey((key) => key + 1)}>Thử lại</button>
        </div>
      ) : questions.length === 0 ? (
        <div className="admin-empty-state" role="status">
          <h3 className="admin-empty-title">Chưa có câu hỏi Grammar nào</h3>
        </div>
      ) : (
        <div className="admin-table-card">
          <div className="admin-table-responsive">
            <table className="admin-dekiru-table">
              <thead><tr>{columns.map((column) => <th key={column.label} scope="col">{column.label}</th>)}<th scope="col">Thao tác</th></tr></thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id}>
                    {columns.map((column) => (
                      <td key={column.label} style={{ minWidth: "110px", maxWidth: "320px", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                        {column.value(question)}
                      </td>
                    ))}
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button type="button" className="mod-btn-add mod-question-btn--secondary" onClick={() => setEditingQuestion(question)}>Chỉnh sửa</button>
                        <button type="button" className="btn-modal-delete" onClick={() => onClickDelete(question)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {isCreateOpen && (
        <QuestionGrammarCreateModal
          lessonId={lessonId}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(created) => {
            setQuestions((items) => items.some((item) => item.id === created.id) ? items : [...items, created]);
            setError(null);
            setIsCreateOpen(false);
            setSuccess("Thêm câu hỏi ngữ pháp thành công.");
          }}
        />
      )}
      {editingQuestion && (
        <QuestionGrammarEditModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onUpdated={(updated) => {
            setQuestions((items) => items.map((item) => item.id === updated.id ? updated : item));
            setEditingQuestion(null);
            setSuccess("Cập nhật câu hỏi ngữ pháp thành công.");
          }}
        />
      )}
      {deletingQuestion && (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="question-grammar-delete-title">
            <div className="modal-header">
              <h3 className="modal-title" id="question-grammar-delete-title">Xác nhận xóa câu hỏi</h3>
              <button type="button" className="modal-btn-close" onClick={onCancelDelete} disabled={deleting} aria-label="Đóng">✕</button>
            </div>
            <div className="modal-form-body">
              <p className="modal-description">Bạn có chắc chắn muốn xóa câu hỏi này?</p>
              <p className="modal-description"><strong>{deletingQuestion.content}</strong></p>
              {deleteError && <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>{deleteError}</p>}
              <div className="modal-actions-row">
                <button type="button" className="btn-modal-cancel" onClick={onCancelDelete} disabled={deleting}>Hủy</button>
                <button type="button" className="btn-modal-delete" onClick={() => void onConfirmDelete()} disabled={deleting}>
                  {deleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
