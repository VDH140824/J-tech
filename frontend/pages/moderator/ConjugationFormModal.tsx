import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { isAxiosError } from "axios";
import { createConjugationForm, updateConjugationForm } from "../../api/conjugationFormApi";
import type { ConjugationFormInput, ConjugationFormSummary, ContentStatus } from "../../api/conjugationFormApi";
import { buildMaterialContent, parseMaterialContent } from "../../utils/conjugationMaterial";
import type { VerbGroupKey } from "../../utils/conjugationMaterial";
import "./ConjugationFormModal.css";

// Form "Thêm thể chia" (UC-47, luồng 3.1) và "Sửa thể chia" (sd Update Conjugation Form), dạng modal giống LessonFormModal.
// Có editingForm thì là chế độ sửa: displayForm (1.1) tách quy tắc Nhóm I/II/III từ materialContent.
// Tên hàm khớp message trong sequence diagram: enterFormData (2), clickSave / clickUpdate (3),
// validateRequiredFields (3.1), showError (3.2 / 3.4 / 3.5 / 3.6). showMessage(MSG31) (Update 3.7) nằm ở trang cha qua onSaved.

const MOD_COLOR = "#0d9488";

// Nội dung thông báo theo mục 5.3 (Application Messages List) của SRS.
// MSG32 phải giống hệt hằng MSG32 trong ConjugationFormServiceImpl.java (dùng để nhận diện lỗi BR-111 từ server).
const MESSAGES = {
  MSG09: "Nội dung * là bắt buộc, không được để trống.",
  MSG23: "Quá số kí tự quy định, vui lòng nhập lại.",
  MSG26: "Lưu thất bại, vui lòng nhập lại.",
  MSG30: "Dữ liệu này đã tồn tại trong bài học / hệ thống. Vui lòng kiểm tra lại!",
  MSG32: "Không thể xuất bản: số câu hỏi mỗi lượt phải từ 5 trở lên và không vượt quá số câu hỏi đã soạn.",
} as const;

type FieldName =
  | "code"
  | "nameVi"
  | "nameJp"
  | "description"
  | VerbGroupKey
  | "questionsPerPractice"
  | "displayOrder"
  | "status";

type FormState = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const INITIAL_FORM: FormState = {
  code: "",
  nameVi: "",
  nameJp: "",
  description: "",
  group1: "",
  group2: "",
  group3: "",
  questionsPerPractice: "10",
  displayOrder: "0",
  status: "DRAFT",
};

const STATUS_OPTIONS: ReadonlyArray<{ value: ContentStatus; label: string }> = [
  { value: "DRAFT", label: "Nháp" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
  { value: "HIDDEN", label: "Ẩn" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

// 1.1: displayForm — đổ dữ liệu thể chia đang sửa vào form.
function toFormState(form: ConjugationFormSummary): FormState {
  return {
    code: form.code,
    nameVi: form.nameVi,
    nameJp: form.nameJp,
    description: form.description ?? "",
    ...parseMaterialContent(form.materialContent),
    questionsPerPractice: String(form.questionsPerPractice),
    displayOrder: String(form.displayOrder),
    status: form.status,
  };
}

const GROUP_FIELDS: ReadonlyArray<{ key: VerbGroupKey; label: string; hint: string; placeholder: string }> = [
  { key: "group1", label: "Nhóm I", hint: "Động từ đuôi う: 書く, 飲む, 話す…", placeholder: "Ví dụ: đổi đuôi う sang い rồi thêm ます.\n書く → 書きます" },
  { key: "group2", label: "Nhóm II", hint: "Động từ đuôi る: 食べる, 見る, 寝る…", placeholder: "Ví dụ: bỏ る rồi thêm ます.\n食べる → 食べます" },
  { key: "group3", label: "Nhóm III", hint: "Bất quy tắc: する, 来る", placeholder: "Ví dụ:\nする → します\n来る → 来ます" },
];

const REQUIRED_FIELDS: FieldName[] = ["code", "nameVi", "nameJp", "group1", "group2", "group3", "questionsPerPractice"];

// Khớp kích thước cột trong jtech.sql và @Size trong ConjugationFormRequest.
const MAX_LENGTH: Partial<Record<FieldName, number>> = { code: 30, nameVi: 100, nameJp: 100, description: 5000 };

const FIELD_ORDER: FieldName[] = ["code", "nameVi", "nameJp", "description", "group1", "group2", "group3", "questionsPerPractice", "displayOrder", "status"];

function toPayload(form: FormState, isEdit: boolean): ConjugationFormInput {
  return {
    code: form.code.trim(),
    nameVi: form.nameVi.trim(),
    nameJp: form.nameJp.trim(),
    description: form.description.trim() || undefined,
    materialContent: buildMaterialContent(form),
    questionsPerPractice: Number(form.questionsPerPractice),
    displayOrder: form.displayOrder.trim() === "" ? 0 : Number(form.displayOrder),
    status: isEdit ? (form.status as ContentStatus) : undefined,
  };
}

interface ConjugationFormModalProps {
  isOpen: boolean;
  /** null / undefined: tạo mới; có giá trị: sửa thể chia này. */
  editingForm?: ConjugationFormSummary | null;
  onClose: () => void;
  onSaved: (saved: ConjugationFormSummary, isEdit: boolean) => void;
}

export function ConjugationFormModal({ isOpen, editingForm, onClose, onSaved }: ConjugationFormModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(editingForm);

  useEffect(() => {
    if (isOpen) {
      setForm(editingForm ? toFormState(editingForm) : INITIAL_FORM);
      setFieldErrors({});
      setErrorMsg(null);
    }
  }, [isOpen, editingForm]);

  if (!isOpen) return null;

  // 2: enterFormData — cập nhật giá trị và xóa lỗi của ô vừa sửa.
  function enterFormData(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const name = event.target.name as FieldName;
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  // 3.1: validateRequiredFields — kiểm tra trên trình duyệt trước khi gửi.
  function validateRequiredFields(): FieldErrors {
    const errors: FieldErrors = {};
    for (const field of REQUIRED_FIELDS) {
      if (!form[field].trim()) errors[field] = MESSAGES.MSG09;
    }
    for (const field of Object.keys(MAX_LENGTH) as FieldName[]) {
      const max = MAX_LENGTH[field] ?? Infinity;
      if (!errors[field] && form[field].trim().length > max) errors[field] = MESSAGES.MSG23;
    }
    const questions = Number(form.questionsPerPractice);
    if (!errors.questionsPerPractice && (!Number.isInteger(questions) || questions <= 0)) {
      errors.questionsPerPractice = "Số câu hỏi mỗi lượt phải là số nguyên lớn hơn 0.";
    }
    const order = form.displayOrder.trim() === "" ? 0 : Number(form.displayOrder);
    if (!Number.isInteger(order) || order < 0) {
      errors.displayOrder = "Thứ tự hiển thị phải là số nguyên từ 0 trở lên.";
    }
    // BR-111: chặn sớm trên trình duyệt; backend vẫn kiểm tra lại (3.3.1.6 validatePublishQuota).
    if (
      isEdit &&
      form.status === "PUBLISHED" &&
      !errors.questionsPerPractice &&
      (questions < 5 || questions > (editingForm?.linkedQuestionCount ?? 0))
    ) {
      errors.questionsPerPractice = MESSAGES.MSG32;
    }
    return errors;
  }

  function showError(message: string, errors: FieldErrors = {}) {
    setFieldErrors(errors);
    setErrorMsg(message);
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (first) document.getElementById(`cf-${first}`)?.focus();
  }

  function handleServerError(err: unknown) {
    if (!isAxiosError(err) || !err.response) {
      showError(MESSAGES.MSG26);
      return;
    }
    const { status, data } = err.response;
    const serverMsg =
      (typeof data === "object" && data !== null && "message" in data ? String(data.message) : null) ||
      (typeof data === "string" ? data : null);

    if (status === 409) {
      showError(MESSAGES.MSG30, { code: MESSAGES.MSG30 }); // Create 3.4 / Update 3.5 (break [isExisted = true])
    } else if (status === 404) {
      showError(serverMsg || "Thể chia không còn tồn tại."); // Update 3.4 (break [form không tồn tại])
    } else if (status === 400 && serverMsg === MESSAGES.MSG32) {
      showError(MESSAGES.MSG32, { questionsPerPractice: MESSAGES.MSG32 }); // Update 3.6 (BR-111)
    } else if (status === 400) {
      showError(serverMsg || MESSAGES.MSG09);
    } else if (status === 403) {
      showError(isEdit ? "Bạn không có quyền sửa thể chia." : "Bạn không có quyền tạo thể chia.");
    } else {
      console.error("Conjugation form save failed:", status, data);
      showError(MESSAGES.MSG26);
    }
  }

  // 3: clickSave (tạo mới) / clickUpdate (sửa)
  async function clickSave(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    const errors = validateRequiredFields();
    const messages = Object.values(errors);
    if (messages.length > 0) {
      // alt [thiếu trường bắt buộc] -> 3.2
      showError(messages.includes(MESSAGES.MSG09) ? MESSAGES.MSG09 : messages[0] ?? MESSAGES.MSG09, errors);
      return;
    }

    try {
      setSubmitting(true);
      // 3.3: POST khi tạo mới, PUT /{id} khi sửa
      const payload = toPayload(form, isEdit);
      const saved = editingForm
        ? await updateConjugationForm(editingForm.id, payload)
        : await createConjugationForm(payload);
      onSaved(saved, isEdit);
      onClose();
    } catch (err: unknown) {
      handleServerError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const inputProps = (name: FieldName) => ({
    id: `cf-${name}`,
    name,
    value: form[name],
    onChange: enterFormData,
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `cf-${name}-error` : undefined,
  });

  const fieldClass = (name: FieldName) => `modal-field-group${fieldErrors[name] ? " cf-invalid" : ""}`;

  const errorText = (name: FieldName) =>
    fieldErrors[name] ? (
      <span id={`cf-${name}-error`} className="cf-field-error">
        {fieldErrors[name]}
      </span>
    ) : null;

  const required = <span className="cf-required" aria-hidden="true"> *</span>;

  return (
    <div className="modal-overlay" onClick={() => !submitting && onClose()}>
      <div
        className="modal-card cf-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 id="cf-modal-title" className="modal-title" style={{ margin: 0 }}>
              {isEdit ? "Sửa thể chia" : "Thêm thể chia"}
            </h3>
            <p className="cf-modal-subtitle">
              {isEdit
                ? `Đang sửa ${editingForm?.nameJp} (${editingForm?.code}). Hiện có ${editingForm?.linkedQuestionCount ?? 0} câu hỏi đang hoạt động.`
                : "Thể chia mới được lưu ở trạng thái Nháp. Có thể xuất bản sau khi đã soạn đủ câu hỏi luyện tập."}
            </p>
          </div>
          <button type="button" className="modal-btn-close" disabled={submitting} onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="cf-error-banner" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={clickSave} className="modal-form-body" noValidate>
          <div className="cf-grid-3">
            <div className={fieldClass("code")}>
              <label className="modal-label" htmlFor="cf-code">Mã thể chia{required}</label>
              <input {...inputProps("code")} type="text" className="modal-input" maxLength={MAX_LENGTH.code} placeholder="TE_FORM" autoComplete="off" />
              {errorText("code")}
            </div>
            <div className={fieldClass("nameVi")}>
              <label className="modal-label" htmlFor="cf-nameVi">Tên tiếng Việt{required}</label>
              <input {...inputProps("nameVi")} type="text" className="modal-input" maxLength={MAX_LENGTH.nameVi} placeholder="Thể て" />
              {errorText("nameVi")}
            </div>
            <div className={fieldClass("nameJp")}>
              <label className="modal-label" htmlFor="cf-nameJp">Tên tiếng Nhật{required}</label>
              <input {...inputProps("nameJp")} type="text" lang="ja" className="modal-input cf-jp" maxLength={MAX_LENGTH.nameJp} placeholder="て形" />
              {errorText("nameJp")}
            </div>
          </div>

          <div className={fieldClass("description")}>
            <label className="modal-label" htmlFor="cf-description">Mô tả</label>
            <textarea {...inputProps("description")} className="modal-textarea" rows={2} maxLength={MAX_LENGTH.description} placeholder="Thể này dùng để làm gì, gặp ở bài nào trong giáo trình Dekiru Nihongo." />
            {errorText("description")}
          </div>

          <fieldset className="cf-groups">
            <legend className="modal-label">Quy tắc chia theo nhóm động từ{required}</legend>
            <div className="cf-groups-grid">
              {GROUP_FIELDS.map((group, index) => (
                <div key={group.key} className={`${fieldClass(group.key)} cf-group cf-group--${index + 1}`}>
                  <label className="cf-group-label" htmlFor={`cf-${group.key}`}>{group.label}</label>
                  <span className="cf-group-hint">{group.hint}</span>
                  <textarea {...inputProps(group.key)} lang="ja" className="modal-textarea cf-jp" rows={5} placeholder={group.placeholder} />
                  {errorText(group.key)}
                </div>
              ))}
            </div>
          </fieldset>

          <div className={isEdit ? "cf-grid-3" : "modal-grid-2"}>
            <div className={fieldClass("questionsPerPractice")}>
              <label className="modal-label" htmlFor="cf-questionsPerPractice">Số câu hỏi mỗi lượt{required}</label>
              <input {...inputProps("questionsPerPractice")} type="number" min={1} step={1} inputMode="numeric" className="modal-input" />
              <span className="cf-hint">Khi xuất bản cần từ 5 câu trở lên và không vượt quá số câu hỏi đã soạn.</span>
              {errorText("questionsPerPractice")}
            </div>
            <div className={fieldClass("displayOrder")}>
              <label className="modal-label" htmlFor="cf-displayOrder">Thứ tự hiển thị</label>
              <input {...inputProps("displayOrder")} type="number" min={0} step={1} inputMode="numeric" className="modal-input" />
              <span className="cf-hint">Số nhỏ hiển thị trước. Để trống sẽ là 0.</span>
              {errorText("displayOrder")}
            </div>
            {isEdit && (
              <div className={fieldClass("status")}>
                <label className="modal-label" htmlFor="cf-status">Trạng thái{required}</label>
                <select {...inputProps("status")} className="modal-input">
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errorText("status")}
              </div>
            )}
          </div>

          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" disabled={submitting} onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-modal-submit" style={{ backgroundColor: MOD_COLOR }} disabled={submitting}>
              {submitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Lưu thể chia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
