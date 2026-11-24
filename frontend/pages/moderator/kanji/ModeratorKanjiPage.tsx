import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { kanjiErrorMessage as message } from "./kanjiMessages";
import { getKanjiChapter, uploadKanjiDocument, renameKanjiDocument, deleteKanjiDocument, prepareKanjiDocument, listChapterKanji, getChapterKanji, saveChapterKanji, deleteChapterKanji, type KanjiChapterContent, type KanjiDocument } from "../../../api/kanjiChapterApi";
import { type KanjiInput, type KanjiItem, type KanjiPage } from "../../../api/kanjiApi";
import "./kanji.css";
import { KanjiExercisesTab } from "./KanjiExercisesTab";
import { getPdfPreviewUrl } from "../../../utils/lessonDocuments";

const empty: KanjiInput = { characterText: "", sinoVietnamese: "", onyomi: "", kunyomi: "", meaningVi: "", examples: "", mnemonicStory: "", removeImage: false };
const labels: Record<string, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", HIDDEN: "Ẩn", ARCHIVED: "Đã lưu trữ" };
export function ModeratorKanjiPage({ chapterId, onBack }: { chapterId: number; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"document" | "kanji" | "exercise">("document");
  const [content, setContent] = useState<KanjiChapterContent>();
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState("");
  const [contentRetry, setContentRetry] = useState(0);
  const [viewedDocument, setViewedDocument] = useState<{ lessonId: number; url: string }>();
  const [documentFile, setDocumentFile] = useState<File>();
  const [documentName, setDocumentName] = useState("");
  const [renamingDocument, setRenamingDocument] = useState<KanjiDocument>();
  const [renamedName, setRenamedName] = useState("");
  const [savingDocumentName, setSavingDocumentName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [openingExercises, setOpeningExercises] = useState(false);
  const [exerciseLessonId, setExerciseLessonId] = useState<number>();
  const [unassigned, setUnassigned] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [documentNotice, setDocumentNotice] = useState("");
  const documentInputRef = useRef<HTMLInputElement>(null);
  const documents = content?.documentItems ?? [];
  const selectedDocument = documents.find(document => document.lessonId === viewedDocument?.lessonId && document.url === viewedDocument.url);
  const isCloudinaryPdf = !!selectedDocument && /^https:\/\/res\.cloudinary\.com\//i.test(selectedDocument.url)
    && (/\.pdf(?:[?#]|$)/i.test(selectedDocument.url) || /\.pdf$/i.test(selectedDocument.name));
  const documentPreviewUrl = isCloudinaryPdf ? getPdfPreviewUrl(selectedDocument.url) : selectedDocument?.url;
  const exerciseDocument = documents.find(document => !document.sharedLesson && document.lessonId === exerciseLessonId);
  const documentBusy = uploading || deletingDocument || openingExercises || savingDocumentName;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<KanjiPage>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [detail, setDetail] = useState<KanjiItem>();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState<KanjiInput>(empty);
  const [image, setImage] = useState<File>();
  const [preview, setPreview] = useState("");
  const [formError, setFormError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasDialog = editing || !!detail;
  useEffect(() => {
    const controller = new AbortController();
    setContentLoading(true);
    setViewedDocument(undefined);
    setContentError("");
    getKanjiChapter(chapterId, controller.signal)
      .then(result => { if (!controller.signal.aborted) setContent(result); })
      .catch(error => { if (!controller.signal.aborted) setContentError(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setContentLoading(false); });
    return () => controller.abort();
  }, [chapterId, contentRetry]);
  useEffect(() => {
    if (!image) { setPreview(""); return; }
    const url = URL.createObjectURL(image); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    if (!hasDialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) { setEditing(false); setDetail(undefined); }
      if (event.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)");
      if (!nodes?.length) { event.preventDefault(); return; }
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); previous?.focus(); };
  }, [hasDialog, busy]);
  useEffect(() => {
    if (tab !== "kanji") return;
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = window.setTimeout(() => {
      listChapterKanji(chapterId, search, status, page, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        if (page > 0 && page >= result.totalPages) { setPage(Math.max(0, result.totalPages - 1)); return; }
        setData(result);
      }).catch(e => { if (!controller.signal.aborted) setError(message(e)); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [chapterId, search, status, page, reload, tab]);
  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!documentFile || documentBusy) return;
    if (!documentName.trim()) { setDocumentError("Vui lòng nhập tên tài liệu."); return; }
    setUploading(true); setDocumentError(""); setDocumentNotice("");
    try {
      const updated = await uploadKanjiDocument(chapterId, documentFile, documentName.trim());
      setContent(updated);
      setViewedDocument(undefined);
      setDocumentFile(undefined);
      setDocumentName("");
      if (documentInputRef.current) documentInputRef.current.value = "";
      setDocumentNotice("Đã tải tài liệu lên.");
      await invalidateStudentContent();
    } catch (e) {
      setDocumentError(axios.isAxiosError(e) && e.response?.status === 413
        ? "Tài liệu quá lớn. Vui lòng chọn tệp không quá 10 MB."
        : message(e));
    } finally {
      setUploading(false);
    }
  }
  async function invalidateStudentContent() {
    await queryClient.invalidateQueries({
      queryKey: ["chapter-study"],
      predicate: query => query.queryKey[2] === chapterId,
    });
  }
  async function saveDocumentName(event: FormEvent) {
    event.preventDefault();
    if (!renamingDocument || documentBusy) return;
    if (!renamedName.trim()) { setDocumentError("Vui lòng nhập tên tài liệu."); return; }
    setSavingDocumentName(true);
    setDocumentError("");
    setDocumentNotice("");
    try {
      setContent(await renameKanjiDocument(chapterId, renamingDocument, renamedName.trim()));
      setRenamingDocument(undefined);
      setDocumentNotice("Đã đổi tên tài liệu.");
      await invalidateStudentContent();
    } catch (error) {
      setDocumentError(axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
        ? error.response.data.message : message(error));
    } finally {
      setSavingDocumentName(false);
    }
  }
  async function refreshContent() {
    setContent(await getKanjiChapter(chapterId));
    await invalidateStudentContent();
  }
  async function openDocumentExercises(document: KanjiDocument) {
    if (documentBusy) return;
    setOpeningExercises(true);
    setDocumentError("");
    try {
      let lessonId = document.lessonId;
      if (document.sharedLesson) {
        const result = await prepareKanjiDocument(chapterId, document);
        setContent(result.content);
        await invalidateStudentContent();
        lessonId = result.lessonId;
      }
      setExerciseLessonId(lessonId);
      setUnassigned(false);
      setTab("exercise");
    } catch (error) {
      setDocumentError(axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
        ? error.response.data.message : message(error));
    } finally {
      setOpeningExercises(false);
    }
  }
  async function removeDocument(document: KanjiDocument) {
    if (documentBusy || content?.status === "ARCHIVED" || document.status === "ARCHIVED") return;
    const questionNotice = document.exerciseCount > 0
      ? ` Tài liệu có ${document.exerciseCount} câu hỏi. Các câu hỏi này sẽ được lưu trữ để giữ lịch sử.` : "";
    if (!window.confirm(`Xóa tài liệu “${document.name}” khỏi chương?${questionNotice}`)) return;
    setDeletingDocument(true);
    setDocumentError("");
    setDocumentNotice("");
    try {
      const result = await deleteKanjiDocument(chapterId, document);
      setContent(result.content);
      if (viewedDocument?.lessonId === document.lessonId && viewedDocument.url === document.url) setViewedDocument(undefined);
      if (exerciseLessonId === document.lessonId) setExerciseLessonId(undefined);
      setDocumentNotice("Đã xóa tài liệu khỏi chương.");
      if (result.warnings.length) setDocumentError(result.warnings.join(" "));
      if (renamingDocument?.lessonId === document.lessonId && renamingDocument.url === document.url) setRenamingDocument(undefined);
      await invalidateStudentContent();
    } catch (error) {
      setDocumentError(axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
        ? error.response.data.message : message(error));
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        await refreshContent().catch(() => undefined);
      }
    } finally {
      setDeletingDocument(false);
    }
  }
  async function open(id: number) {
    setBusy(true); setError("");
    try { setDetail(await getChapterKanji(chapterId, id)); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  function edit(item?: KanjiItem) {
    setDetail(item);
    setInput(item ? {
      characterText: item.characterText, sinoVietnamese: item.sinoVietnamese ?? "", onyomi: item.onyomi ?? "",
      kunyomi: item.kunyomi ?? "", meaningVi: item.meaningVi, examples: item.examples ?? "", mnemonicStory: item.mnemonicStory ?? "", removeImage: false, displayOrder: item.displayOrder, status: item.status
    } : { ...empty });
    setImage(undefined); setFormError(""); setEditing(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\p{Script=Han}{1,5}$/u.test(input.characterText.trim())) { setFormError("Nhập từ 1 đến 5 chữ Hán hợp lệ."); return; }
    if (!input.meaningVi.trim()) { setFormError("Vui lòng nhập nghĩa tiếng Việt."); return; }
    setBusy(true); setFormError("");
    try {
      const result = await saveChapterKanji(chapterId, detail?.id, input, image);
      setEditing(false); setDetail(result); setReload(n => n + 1); setNotice("Đã lưu Kanji.");
    } catch (e) { setFormError(message(e)); } finally { setBusy(false); }
  }
  async function remove(item: KanjiItem) {
    if (!window.confirm(`Xóa Kanji “${item.characterText}”? Nếu đã có dữ liệu học, Kanji sẽ được lưu trữ.`)) return;
    setBusy(true); setError("");
    try {
      const result = await deleteChapterKanji(chapterId, item.id);
      setDetail(undefined); setReload(n => n + 1);
      setNotice(result === "ARCHIVED" ? "Đã lưu trữ Kanji vì đã có dữ liệu học." : "Đã xóa Kanji.");
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  if (contentLoading) return <p role="status">Đang tải nội dung Kanji của chương…</p>;
  if (contentError || !content) return <div className="admin-page-container kanji-page">
    <button className="mod-btn-back" onClick={onBack}>← Quay lại chương</button>
    <p role="alert">{contentError || "Không tìm thấy nội dung Kanji của chương."}</p>
    <button onClick={() => setContentRetry(value => value + 1)}>Thử lại</button>
  </div>;
  return <div className="admin-page-container kanji-page">
    <button className="mod-btn-back" onClick={onBack}>← Quay lại chương</button>
    <div className="admin-page-header"><div><h2>Kanji · Chương {content.chapterNo}: {content.title}</h2>
      <p>Quản lý tài liệu, bài tập và flashcard Kanji của chương.</p></div>
      {tab === "kanji" && <button className="mod-btn-add" disabled={busy || content?.status === "ARCHIVED"} onClick={() => edit()}>+ Thêm flashcard Kanji</button>}</div>
    <nav className="kanji-content-tabs" aria-label="Nội dung Kanji của chương">
      <button type="button" aria-pressed={tab === "document"} onClick={() => setTab("document")}>Tài liệu Kanji</button>
      <button type="button" aria-pressed={tab === "exercise"} onClick={() => setTab("exercise")}>Bài tập Kanji</button>
      <button type="button" aria-pressed={tab === "kanji"} onClick={() => setTab("kanji")}>Flashcard</button>
    </nav>
    {documentError && <p role="alert" className="kanji-error">{documentError}</p>}
    {documentNotice && <p role="status">{documentNotice}</p>}
    {tab === "document" ? <section className="kanji-document-panel" aria-label="Tài liệu Kanji">
      <form className="kanji-document-upload" onSubmit={uploadDocument}>
        <label htmlFor="kanji-document-name">Tên tài liệu</label>
        <input id="kanji-document-name" required maxLength={200} value={documentName}
          disabled={documentBusy || content.status === "ARCHIVED"}
          onChange={event => setDocumentName(event.target.value)} />
        <label htmlFor="kanji-document-file">Tải tài liệu lên (PDF, DOCX, TXT, PNG, JPG · tối đa 10 MB)</label>
        <div className="kanji-document-toolbar">
          <input id="kanji-document-file" ref={documentInputRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            disabled={documentBusy || content?.status === "ARCHIVED"} onChange={event => {
              const file = event.target.files?.[0];
              setDocumentError(""); setDocumentNotice("");
              if (file && (!file.size || file.size > 10 * 1024 * 1024 || !/\.(pdf|docx|txt|png|jpe?g)$/i.test(file.name))) {
                setDocumentError("Chọn tệp PDF, DOCX, TXT, PNG hoặc JPG có dữ liệu và không quá 10 MB.");
                setDocumentFile(undefined); event.target.value = ""; return;
              }
              setDocumentFile(file);
              setDocumentName(file?.name.slice(0, 200) ?? "");
            }} />
          <button type="submit" className="mod-btn-add" disabled={!documentFile || documentBusy || content?.status === "ARCHIVED"}>
            {uploading ? "Đang tải lên…" : "Tải tài liệu lên"}
          </button>
        </div>
      </form>
      {renamingDocument && <form className="kanji-document-upload" onSubmit={saveDocumentName}>
        <label htmlFor="kanji-document-rename">Đổi tên tài liệu · {renamingDocument.name}</label>
        <input id="kanji-document-rename" autoFocus required maxLength={200} value={renamedName}
          disabled={documentBusy} onChange={event => setRenamedName(event.target.value)} />
        <div className="kanji-document-toolbar">
          <button type="submit" className="mod-btn-add" disabled={documentBusy || content.status === "ARCHIVED"}>
            {savingDocumentName ? "Đang lưu…" : "Lưu tên"}
          </button>
          <button type="button" disabled={documentBusy} onClick={() => setRenamingDocument(undefined)}>Hủy</button>
        </div>
      </form>}
      {documents.length > 0 && <div className="kanji-table kanji-document-list"><table>
        <thead><tr><th>Tài liệu</th><th>Bài tập</th><th>Thao tác</th></tr></thead>
        <tbody>{documents.map((document, index) => <tr key={`${document.lessonId}-${index}`}>
          <td>{document.name}{document.status === "ARCHIVED" && <span> · Đã lưu trữ</span>}</td>
          <td>{document.sharedLesson ? "Câu hỏi cũ cần phân loại" : `${document.exerciseCount} câu hỏi`}</td>
          <td><div className="kanji-exercise-actions">
            <button type="button" disabled={documentBusy} onClick={() => setViewedDocument({ lessonId: document.lessonId, url: document.url })}>Xem tài liệu</button>
            <button type="button" disabled={documentBusy || content.status === "ARCHIVED" || document.status === "ARCHIVED"}
              onClick={() => { setRenamingDocument(document); setRenamedName(document.name); setDocumentError(""); }}>Đổi tên</button>
            <button type="button" disabled={documentBusy || (document.sharedLesson && (content.status === "ARCHIVED" || document.status === "ARCHIVED"))}
              onClick={() => openDocumentExercises(document)}>Bài tập</button>
            <button type="button" disabled={documentBusy || content.status === "ARCHIVED" || document.status === "ARCHIVED"}
              onClick={() => removeDocument(document)}>Xóa tài liệu</button>
          </div></td>
        </tr>)}</tbody>
      </table></div>}
      {content.unassignedExerciseCount > 0 && <p>
        Có {content.unassignedExerciseCount} câu hỏi cũ chưa gán tài liệu.{" "}
        <button type="button" disabled={documentBusy} onClick={() => { setUnassigned(true); setTab("exercise"); }}>Phân loại câu hỏi</button>
      </p>}
      {selectedDocument ? <article className="kanji-document-reader" aria-label={`Tài liệu ${selectedDocument.name}`}>
        <h3>{selectedDocument.name}</h3>
        <iframe key={documentPreviewUrl} className="kanji-document-preview" src={documentPreviewUrl} title={selectedDocument.name}
          sandbox={isCloudinaryPdf ? undefined : "allow-scripts allow-same-origin allow-popups"} referrerPolicy="no-referrer" />
        <div className="kanji-document-reader-actions">
          <button type="button" onClick={() => setViewedDocument(undefined)}>Đóng tài liệu</button>
          <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer">Mở tài liệu trong tab mới ↗</a>
          {deletingDocument && <span role="status">Đang xóa tài liệu…</span>}
        </div>
      </article> : documents.length === 0 ? <p className="admin-empty-state">Chương này chưa có tài liệu Kanji.</p> : null}
    </section> : tab === "exercise" ? <section aria-label="Bài tập theo tài liệu">
      <div className="kanji-document-toolbar">
        <label>Tài liệu{" "}<select aria-label="Tài liệu của bộ bài tập" disabled={documentBusy}
          value={unassigned || !exerciseDocument ? "" : documents.indexOf(exerciseDocument)}
          onChange={event => { if (event.target.value !== "") void openDocumentExercises(documents[Number(event.target.value)]); }}>
          <option value="">Chọn tài liệu</option>
          {documents.map((document, index) => <option key={`${document.lessonId}-${index}`} value={index}
            disabled={document.sharedLesson && (content.status === "ARCHIVED" || document.status === "ARCHIVED")}>{document.name}</option>)}
        </select></label>
        {content.unassignedExerciseCount > 0 && <button type="button" disabled={documentBusy}
          onClick={() => setUnassigned(true)}>Câu hỏi chưa gán tài liệu ({content.unassignedExerciseCount})</button>}
        {openingExercises && <span role="status">Đang mở bộ bài tập…</span>}
      </div>
      {unassigned ? <KanjiExercisesTab key="unassigned" chapterId={chapterId} unassigned
        documents={documents.filter(document => document.status !== "ARCHIVED")}
        readOnly={content.status === "ARCHIVED"} onChanged={refreshContent} />
        : exerciseDocument ? <><h3>Bài tập · {exerciseDocument.name}</h3>
          <KanjiExercisesTab key={exerciseDocument.lessonId} chapterId={chapterId} documentLessonId={exerciseDocument.lessonId} documentName={exerciseDocument.name}
            readOnly={content.status === "ARCHIVED" || exerciseDocument.status === "ARCHIVED"} onChanged={refreshContent} />
        </> : <p>Chọn tài liệu để tạo hoặc xem bộ bài tập tương ứng.</p>}
    </section> : <>
    {error && <p role="alert" className="kanji-error">{error} <button onClick={() => setReload(n => n + 1)}>Thử lại</button></p>}
    {notice && <p role="status">{notice}</p>}
    <div className="mod-section-toolbar">
      <input aria-label="Tìm Kanji" placeholder="Tìm chữ Hán, âm Hán Việt, nghĩa…" maxLength={255} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      <select aria-label="Lọc trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
        <option value="ALL">Tất cả trạng thái</option>{Object.entries(labels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select><span>{data?.totalElements ?? 0} Kanji</span>
    </div>
    {loading ? <p role="status">Đang tải…</p> : !error && <>
      {data?.content.length ? <div className="admin-table-card kanji-table"><table><thead><tr><th>Kanji</th><th>Hán Việt</th><th>Nghĩa</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{data.content.map(k => <tr key={k.id}><td className="kanji-character">{k.characterText}</td><td>{k.sinoVietnamese}</td><td>{k.meaningVi}</td><td>{labels[k.status]}</td>
          <td><button disabled={busy} onClick={() => open(k.id)}>Xem chi tiết</button></td></tr>)}</tbody></table></div>
        : <p className="admin-empty-state">Chưa có Kanji phù hợp. Hãy thêm Kanji hoặc thay đổi bộ lọc.</p>}
      <div className="kanji-pagination"><button disabled={page === 0} onClick={() => setPage(n => n - 1)}>← Trước</button>
        <span>Trang {page + 1} / {Math.max(1, data?.totalPages ?? 0)}</span>
        <button disabled={page + 1 >= (data?.totalPages ?? 0)} onClick={() => setPage(n => n + 1)}>Sau →</button></div>
    </>}
    </>}
    {hasDialog && <div className="kanji-overlay"><section ref={dialogRef} tabIndex={-1} className="kanji-dialog" role="dialog" aria-modal="true" aria-label={editing ? "Nhập Kanji" : "Chi tiết Kanji"}>
      <button className="kanji-close" aria-label="Đóng" disabled={busy} onClick={() => { setEditing(false); setDetail(undefined); }}>×</button>
      {editing ? <form onSubmit={submit}><h3>{detail ? "Cập nhật flashcard Kanji" : "Thêm flashcard Kanji"}</h3>
        {formError && <p role="alert" className="kanji-error">{formError}</p>}
        <fieldset disabled={busy}>
          <label>Thứ tự hiển thị<input type="number" min={0} required={!!detail} value={input.displayOrder ?? ""} onChange={e => setInput({ ...input, displayOrder: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
          <label>Trạng thái<select value={input.status ?? "DRAFT"} onChange={e => setInput({ ...input, status: e.target.value as KanjiItem["status"] })}>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          {([["characterText", "Chữ Hán *", 10], ["sinoVietnamese", "Âm Hán Việt", 50], ["onyomi", "Âm On (音読み)", 100], ["kunyomi", "Âm Kun (訓読み)", 100], ["meaningVi", "Nghĩa tiếng Việt *", 255], ["examples", "Ví dụ", 16000], ["mnemonicStory", "Câu chuyện ghi nhớ", 16000]] as const).map(([key, label, max]) =>
            <label key={key}>{label}{key === "examples" || key === "mnemonicStory" ? <textarea maxLength={max} value={input[key]} onChange={e => setInput({ ...input, [key]: e.target.value })} />
              : <input required={key === "characterText" || key === "meaningVi"} maxLength={max} value={input[key]} onChange={e => setInput({ ...input, [key]: e.target.value })} />}</label>)}
          <label>Ảnh minh họa (PNG, JPEG, GIF · tối đa 5 MB)
            <button type="button" onClick={() => imageInputRef.current?.click()}>Chọn ảnh</button>
            <span>{image?.name || "Chưa chọn ảnh"}</span>
            <input ref={imageInputRef} hidden type="file" accept="image/png,image/jpeg,image/gif" onChange={e => {
            const file = e.target.files?.[0];
            if (file && (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/gif"].includes(file.type))) {
              setFormError("Ảnh phải là PNG, JPEG hoặc GIF và không quá 5 MB."); e.target.value = ""; setImage(undefined); return;
            }
            setImage(file); setFormError(""); setInput({ ...input, removeImage: false });
          }} /></label>
          {(preview || (detail?.imageUrl && !input.removeImage)) && <img className="kanji-image" src={preview || detail?.imageUrl} alt="Ảnh minh họa" />}
          {detail?.imageUrl && <label className="kanji-check"><input type="checkbox" checked={input.removeImage} disabled={!!image} onChange={e => setInput({ ...input, removeImage: e.target.checked })} /> Xóa ảnh hiện tại</label>}
          <button className="mod-btn-add" type="submit">{busy ? "Đang lưu…" : "Lưu Kanji"}</button>
        </fieldset></form> : detail && <><h2 className="kanji-character">{detail.characterText}</h2><p>{labels[detail.status]}</p>
          {error && <p role="alert" className="kanji-error">{error}</p>}
          {detail.imageUrl && <img className="kanji-image" src={detail.imageUrl} alt={`Minh họa ${detail.characterText}`} />}
          <dl>{([["Hán Việt", detail.sinoVietnamese], ["Âm On (音読み)", detail.onyomi], ["Âm Kun (訓読み)", detail.kunyomi], ["Nghĩa", detail.meaningVi], ["Ví dụ", detail.examples], ["Ghi nhớ", detail.mnemonicStory]]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
          <div className="kanji-pagination"><button className="btn-edit" disabled={busy || content.status === "ARCHIVED" || detail.status === "ARCHIVED"} onClick={() => edit(detail)}>Chỉnh sửa</button><button className="btn-delete" disabled={busy || content.status === "ARCHIVED"} onClick={() => remove(detail)}>Xóa / lưu trữ</button></div>
        </>}
    </section></div>}
  </div>;
}
