import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { addStudents, type AddStudentsResponse, type SkippedEmail } from "../../api/classApi";

const SKIP_LABELS: Record<SkippedEmail["reason"], string> = {
  DUPLICATE_EMAIL: "Email bị lặp trong danh sách",
  ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản",
  INVALID_STUDENT_ACCOUNT: "Tài khoản không phải học viên đang hoạt động",
  ALREADY_IN_CLASSROOM: "Đã có trong lớp",
};

export function AddStudentModal({ classId, onClose, onAdded }: {
  classId: number;
  onClose: () => void;
  onAdded: (result: AddStudentsResponse) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [emailText, setEmailText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<AddStudentsResponse | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setFeedback(null);

    const validEmails: string[] = [];
    const skippedEmails: SkippedEmail[] = [];
    const seen = new Set<string>();
    for (const line of emailText.split(/\r\n|\n|\r/)) {
      const email = line.trim().toLowerCase();
      if (!email) continue;
      if (seen.has(email)) {
        skippedEmails.push({ email, reason: "DUPLICATE_EMAIL" });
      } else {
        seen.add(email);
        validEmails.push(email);
      }
    }
    if (validEmails.length === 0) {
      setError("Vui lòng nhập ít nhất một email.");
      setFeedback({ addedCount: 0, skippedCount: skippedEmails.length, skippedEmails });
      return;
    }

    setSubmitting(true);
    try {
      const result = await addStudents(classId, validEmails);
      const combined: AddStudentsResponse = {
        addedCount: result.addedCount,
        skippedCount: result.skippedCount + skippedEmails.length,
        skippedEmails: [...skippedEmails, ...result.skippedEmails],
      };
      if (combined.addedCount > 0) {
        onAdded(combined);
      } else {
        setFeedback(combined);
      }
    } catch (cause) {
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : undefined;
      setError(typeof message === "string" ? message : "Không thể thêm học viên. Vui lòng thử lại.");
      if (skippedEmails.length) {
        setFeedback({ addedCount: 0, skippedCount: skippedEmails.length, skippedEmails });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return <dialog ref={dialog} className="class-student-add-modal" aria-labelledby="class-student-add-title"
    onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }}>
    <form onSubmit={handleSubmit}>
      <div className="class-student-add-header">
        <h2 id="class-student-add-title">Thêm sinh viên mới</h2>
        <button type="button" aria-label="Đóng" disabled={submitting} onClick={onClose}>×</button>
      </div>
      <p>Moderator có thể thêm một hoặc nhiều sinh viên vào lớp.</p>
      <label htmlFor="class-student-emails">Email sinh viên <span aria-hidden="true">*</span></label>
      <textarea id="class-student-emails" rows={6} required value={emailText}
        placeholder={"Nhập email sinh viên…\nMỗi email trên một dòng\nVí dụ:\nnguyenvana@gmail.com\ntranthib@gmail.com"}
        onChange={(event) => { setEmailText(event.target.value); setError(""); setFeedback(null); }} />
      <small>Có thể nhập hàng loạt email, mỗi email cách nhau bằng dấu Enter xuống dòng.</small>
      {error && <p className="class-student-add-error" role="alert">{error}</p>}
      {feedback && <div className="class-student-add-feedback" role="status">
        <p>Đã thêm {feedback.addedCount} học viên; bỏ qua {feedback.skippedCount} email.</p>
        {feedback.skippedEmails.length > 0 && <ul>{feedback.skippedEmails.map((item, index) =>
          <li key={`${item.email}-${index}`}>{item.email || "(trống)"}: {SKIP_LABELS[item.reason]}</li>)}</ul>}
      </div>}
      <div className="class-student-add-actions">
        <button type="button" disabled={submitting} onClick={onClose}>Hủy</button>
        <button type="submit" disabled={submitting}>{submitting ? "Đang thêm…" : "Thêm sinh viên"}</button>
      </div>
    </form>
  </dialog>;
}

export { SKIP_LABELS };
