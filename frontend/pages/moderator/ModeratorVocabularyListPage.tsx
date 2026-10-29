import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { isAxiosError } from "axios";
import type { LessonSummary } from "../../api/lessonApi";
import { archiveVocabulary, getVocabularies, saveVocabulary, type VocabularyInput, type VocabularyStatus, type VocabularyItem } from "../../api/vocabularyApi";
import { VOCABULARY_CONFIG } from "./vocabularyConfig";
import "./ModeratorContent.css";

interface ModeratorVocabularyListPageProps {
  skillLabel: string;
  skillIcon: string;
  skillColor: string;
  courseName: string;
  chapterNo: number;
  chapterTitle: string;
  lesson: LessonSummary;
  onBack: () => void;
  backLabel?: string;
  readOnly?: boolean;
}
const STATUS_LABELS: Record<VocabularyStatus, string> = {
  DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", HIDDEN: "Đã ẩn", ARCHIVED: "Đã lưu trữ",
};
function errorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.length < 300) return data;
    if (typeof data?.message === "string") return data.message;
  }
  return "Không thể thực hiện thao tác. Vui lòng thử lại.";
}

export function ModeratorVocabularyListPage({ skillLabel, skillIcon, skillColor, courseName, chapterNo, chapterTitle, lesson, onBack, backLabel = "danh sách bài học", readOnly = false }: ModeratorVocabularyListPageProps) {
  const config = VOCABULARY_CONFIG;
  const parentId = lesson.id;
  const collectionPath = `/lessons/${parentId}/${config.path}`;
  const itemPath = `/${config.path}`;
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("DEFAULT");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<VocabularyItem | null>(null);
  const [deleting, setDeleting] = useState<VocabularyItem | null>(null);
  const [form, setForm] = useState<VocabularyInput>({ displayOrder: 0, status: "DRAFT" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const locked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    getVocabularies(collectionPath, controller.signal)
      .then(data => { if (!controller.signal.aborted) setItems(data); })
      .catch (error => { if (!controller.signal.aborted) setLoadError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [collectionPath, reload]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!modal && !deleting) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []);
    (focusable()[0] ?? dialog.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !locked.current) { setModal(null); setDeleting(null); }
      if (event.key === "Tab") {
        const nodes = focusable();
        const first = nodes[0]; const last = nodes[nodes.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [modal, deleting]);

  const open = (mode: "create" | "edit" | "view", item?: VocabularyItem) => {
    if (readOnly && mode !== "view") return;
    setSelected(item ?? null); setActionError("");
    const input: VocabularyInput = { displayOrder: Math.max(0, ...items.map(i => i.displayOrder)) + 1, status: "DRAFT" };
    config.fields.forEach(field => { input[field.key] = item?.[field.key] ?? ""; });
    if (item) { input.displayOrder = item.displayOrder; input.status = item.status; }
    if (item?.audioPublicId) input.audioPublicId = item.audioPublicId;
    setForm(input); setModal(mode);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    if (locked.current) return;
    const input = { ...form };
    for (const field of config.fields) {
      input[field.key] = String(input[field.key] ?? "").trim();
      if (field.required && !input[field.key]) { setActionError(`Vui lòng nhập ${field.label.toLowerCase()}.`); return; }
    }
    if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0) { setActionError("Thứ tự phải là số nguyên không âm."); return; }
    locked.current = true; setBusy(true); setActionError("");
    try {
      await saveVocabulary(collectionPath, itemPath, input, modal === "edit" ? selected?.id : undefined);
      setModal(null); setNotice(modal === "edit" ? "Đã cập nhật từ vựng." : "Đã thêm từ vựng mới."); setReload(n => n + 1);
    } catch (error) { setActionError(errorMessage(error)); }
    finally { locked.current = false; setBusy(false); }
  };
  const archive = async () => {
    if (readOnly || !deleting || locked.current) return;
    locked.current = true; setBusy(true); setActionError("");
    try {
      await archiveVocabulary(itemPath, deleting.id);
      setDeleting(null); setNotice("Đã lưu trữ từ vựng và ngừng hiển thị cho học sinh."); setReload(n => n + 1);
    } catch (error) { setActionError(errorMessage(error)); }
    finally { locked.current = false; setBusy(false); }
  };
  const query = search.trim().toLocaleLowerCase("vi");
  const filtered = items.filter(item => (status === "ALL" || (status === "DEFAULT" ? item.status !== "ARCHIVED" : item.status === status)) && config.fields.some(field => String(item[field.key] ?? "").toLocaleLowerCase("vi").includes(query)));
  const close = () => { if (!locked.current) { setModal(null); setDeleting(null); } };
  const context = `Bài ${lesson.lessonNo}: ${lesson.title}`;

  return <div className="admin-page-container mod-content" style={{ "--content-color": skillColor } as CSSProperties}>
    {notice && <div className="mod-content-notice" role="status">✓ {notice}</div>}
    <div className="mod-chapter-back-row">
      <button className="mod-btn-back" onClick={onBack}>← Quay lại {backLabel}</button>
      <span className="mod-chapter-breadcrumb-pill">{courseName} / Chương {chapterNo} / {skillLabel}{` / Bài ${lesson.lessonNo}`}</span>
    </div>
    <div className="admin-page-header">
      <div className="mod-header-action-row">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">{skillIcon} {readOnly ? "Danh sách" : "Quản lý"} {skillLabel.toLowerCase()}</h2>
          <p className="admin-main-subtitle">{context} · {readOnly ? "Từ vựng học tập" : "Biên soạn từ vựng học tập cho học sinh"}</p>
        </div>
        {!readOnly && <button className="mod-btn-add" onClick={() => open("create")} disabled={loading || !!loadError}>＋ Thêm {skillLabel.toLowerCase()}</button>}
      </div>
    </div>
    <div className="mod-content-stats">
      <div>
        <strong>{items.filter(i => i.status !== "ARCHIVED").length}</strong>
        <span>Từ vựng hiện có</span>
      </div>
      <div>
        <strong>{items.filter(i => i.status === "PUBLISHED").length}</strong>
        <span>Đã xuất bản</span>
      </div>
      <div>
        <strong>{items.filter(i => i.status === "DRAFT").length}</strong>
        <span>Đang soạn thảo</span>
      </div>
    </div>
    <div className="mod-section-toolbar">
      <div className="mod-toolbar-left">
        <div className="mod-toolbar-search">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Tìm từ vựng" placeholder="Tìm từ vựng, cách đọc, ý nghĩa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!readOnly && <select className="mod-toolbar-select" aria-label="Lọc trạng thái" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="DEFAULT">Từ vựng chưa lưu trữ</option>
          <option value="ALL">Tất cả trạng thái</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
      </div>
      <span>{filtered.length} từ vựng</span>
    </div>
    <div className="admin-table-card">
      {loading ? <div className="admin-loading-state" role="status">
        <div className="admin-loading-spinner" />
        <p>Đang tải từ vựng...</p>
      </div>
        : loadError ? <div className="admin-empty-state" role="alert">
          <h3>Không thể tải từ vựng</h3>
          <p>{loadError}</p>
          <button className="mod-btn-add" onClick={() => setReload(n => n + 1)}>Thử lại</button>
        </div>
          : !filtered.length ? <div className="admin-empty-state">
            <span className="mod-content-empty-icon">{skillIcon}</span>
            <h3 className="admin-empty-title">{search || status !== "DEFAULT" ? "Không tìm thấy từ vựng phù hợp" : readOnly ? "Chưa có từ vựng được xuất bản" : "Bắt đầu biên soạn từ vựng"}</h3>
            <p className="admin-empty-desc">{readOnly ? "Chọn bài học khác hoặc thử thay đổi từ khóa tìm kiếm." : search || status !== "DEFAULT" ? "Thử thay đổi từ khóa hoặc bộ lọc trạng thái." : `Thêm ${skillLabel.toLowerCase()} đầu tiên cho ${context.toLowerCase()}.`}</p>
            {!readOnly && <button className="mod-btn-add" onClick={() => open("create")}>＋ Thêm từ vựng</button>}
          </div>
            : <div className="table-responsive">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Thứ tự</th>
                    <th>Từ vựng</th>
                    <th>Ý nghĩa</th>
                    <th>Trạng thái</th>
                    {!readOnly && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => <tr key={item.id}>
                    <td>
                      <span className="lesson-order-pill">{item.displayOrder}</span>
                    </td>
                    <td>
                      <button className="mod-content-title" onClick={() => open("view", item)}>{item[config.titleKey]}</button>{item.reading && <div className="mod-content-reading">{item.reading}</div>}</td>
                    <td>
                      <p className="mod-content-excerpt">{item[config.summaryKey]}</p>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status === "PUBLISHED" ? "active" : item.status === "DRAFT" ? "pending" : "rejected"}`}>{STATUS_LABELS[item.status]}</span>
                    </td>
                    {!readOnly && <td>
                      <div className="row-actions-group">
                        <button className="btn-action edit mod-vocab-text-action" title="Chỉnh sửa từ vựng" onClick={() => open("edit", item)}>Sửa</button>
                        <button className="btn-action delete mod-vocab-text-action" title="Xóa từ vựng" disabled={item.status === "ARCHIVED"} onClick={() => { setActionError(""); setDeleting(item); }}>Xóa</button>
                      </div>
                    </td>}
                  </tr>)}
                </tbody>
              </table>
            </div>}
    </div>
    {(modal || deleting) && <div className="modal-overlay" onClick={close}>
      <div ref={dialog} className="modal-card mod-content-dialog" role="dialog" aria-modal="true" aria-labelledby="content-dialog-title" tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" id="content-dialog-title">{deleting ? "Xóa từ vựng" : modal === "view" ? "Chi tiết từ vựng" : modal === "edit" ? "Chỉnh sửa từ vựng" : `Thêm ${skillLabel.toLowerCase()}`}</h3>
          <button className="modal-btn-close" aria-label="Đóng" disabled={busy} onClick={close}>✕</button>
        </div>
        {actionError && <div className="mod-content-error" role="alert">{actionError}</div>}
        {deleting ? <div className="modal-form-body">
          <p>Bạn muốn xóa <strong>{deleting[config.titleKey]}</strong>?</p>
          <p className="modal-description">Từ vựng sẽ được lưu trữ và ẩn khỏi học sinh để giữ nguyên lịch sử học tập. Bạn có thể tìm lại bằng bộ lọc “Đã lưu trữ”.</p>
          <div className="modal-actions-row">
            <button className="btn-modal-cancel" disabled={busy} onClick={close}>Hủy bỏ</button>
            <button className="btn-modal-delete" disabled={busy} onClick={archive}>{busy ? "Đang xử lý..." : "Xác nhận lưu trữ"}</button>
          </div>
        </div>
          : modal === "view" ? <div className="modal-form-body">
            <dl className="mod-content-detail">{config.fields.map(field => <div key={field.key}>
              <dt>{field.label}</dt>
              <dd>{selected?.[field.key] || "Chưa có thông tin"}</dd>
            </div>)}</dl>{selected?.audioUrl && <audio controls preload="none" src={String(selected.audioUrl)} />}<p>Trạng thái: {selected && STATUS_LABELS[selected.status]}</p>
            <div className="modal-actions-row">
              <button className="btn-modal-cancel" onClick={close}>Đóng</button>
              {!readOnly && <button className="btn-modal-submit" onClick={() => selected && open("edit", selected)}>Chỉnh sửa</button>}
            </div>
          </div>
            : <form className="modal-form-body" onSubmit={save} noValidate>
              <p className="mod-content-form-hint">{context}. Các trường có dấu * là bắt buộc.</p>
              <fieldset disabled={busy} className="mod-content-fieldset">
                <div className="modal-grid-2">{config.fields.map(field => <div className={`modal-field-group ${field.type === "textarea" ? "mod-content-wide" : ""}`} key={field.key}>
                  <label className="modal-label" htmlFor={`content-${field.key}`}>{field.label} {field.required && <span className="mod-content-required">*</span>}</label>{field.type === "textarea" ? <textarea id={`content-${field.key}`} className="modal-textarea" rows={4} required={field.required} maxLength={field.maxLength} value={form[field.key] ?? ""} onChange={e => setForm({ ...form, [field.key]: e.target.value })} /> : <input id={`content-${field.key}`} className="modal-input" type={field.type ?? "text"} required={field.required} maxLength={field.maxLength} value={form[field.key] ?? ""} onChange={e => setForm({ ...form, [field.key]: e.target.value })} />}</div>)}<div className="modal-field-group">
                    <label className="modal-label" htmlFor="content-order">Thứ tự hiển thị *</label>
                    <input className="modal-input" id="content-order" type="number" min={0} step={1} required value={Number.isNaN(form.displayOrder) ? "" : form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.valueAsNumber })} />
                  </div>
                  <div className="modal-field-group">
                    <label className="modal-label" htmlFor="content-status">Trạng thái</label>
                    <select className="modal-input" id="content-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as VocabularyStatus })}>{Object.entries(STATUS_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
                  </div>
                </div>
              </fieldset>
              <div className="modal-actions-row">
                <button type="button" className="btn-modal-cancel" disabled={busy} onClick={close}>Hủy bỏ</button>
                <button type="submit" className="btn-modal-submit" disabled={busy}>{busy ? "Đang lưu..." : modal === "edit" ? "Lưu thay đổi" : "Thêm từ vựng"}</button>
              </div>
            </form>}
      </div>
    </div>}
  </div>;
}
