import { useEffect, useRef, useState, type FormEvent } from "react";
import { kanjiErrorMessage as message } from "./kanjiMessages";
import type { LessonSummary } from "../../../api/lessonApi";
import { listKanji, getKanji, saveKanji, deleteKanji, type KanjiInput, type KanjiItem, type KanjiPage } from "../../../api/kanjiApi";
import "./kanji.css";
import { lessonDocuments } from "./lessonDocuments";
import { KanjiExercisesTab } from "./KanjiExercisesTab";
import { useSearchParams } from "react-router-dom";

const empty: KanjiInput = { characterText: "", sinoVietnamese: "", onyomi: "", kunyomi: "", meaningVi: "", examples: "", mnemonicStory: "", removeImage: false };
const labels: Record<string, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", HIDDEN: "Ẩn", ARCHIVED: "Đã lưu trữ" };
export function ModeratorKanjiPage({ lesson, onBack }: { lesson: LessonSummary; onBack: () => void }) {
  const [tab, setTab] = useState<"kanji" | "exercise">("kanji");
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
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = window.setTimeout(() => {
      listKanji(lesson.id, search, status, page, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        if (page > 0 && page >= result.totalPages) { setPage(Math.max(0, result.totalPages - 1)); return; }
        setData(result);
      }).catch(e => { if (!controller.signal.aborted) setError(message(e)); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [lesson.id, search, status, page, reload]);
  async function open(id: number) {
    setBusy(true); setError("");
    try { setDetail(await getKanji(id)); } catch (e) { setError(message(e)); } finally { setBusy(false); }
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
      const result = await saveKanji(lesson.id, detail?.id, input, image);
      setEditing(false); setDetail(result); setReload(n => n + 1); setNotice("Đã lưu Kanji.");
    } catch (e) { setFormError(message(e)); } finally { setBusy(false); }
  }
  async function remove(item: KanjiItem) {
    if (!window.confirm(`Xóa Kanji “${item.characterText}”? Nếu đã có dữ liệu học, Kanji sẽ được lưu trữ.`)) return;
    setBusy(true); setError("");
    try {
      const result = await deleteKanji(item.id);
      setDetail(undefined); setReload(n => n + 1);
      setNotice(result === "ARCHIVED" ? "Đã lưu trữ Kanji vì đã có dữ liệu học." : "Đã xóa Kanji.");
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  return <div className="admin-page-container kanji-page">
    <button className="mod-btn-back" onClick={onBack}>← Danh sách bài học</button>
    <div className="admin-page-header"><div><h2>Kanji · Bài {lesson.lessonNo}: {lesson.title}</h2>
      <p>Quản lý chữ Hán, cách đọc, ví dụ và hình ảnh minh họa.</p></div>
      {tab === "kanji" && <button className="mod-btn-add" disabled={busy || lesson.status === "ARCHIVED"} onClick={() => edit()}>+ Thêm Kanji</button>}</div>
    {lessonDocuments(lesson.documents).length > 0 && <section aria-label="Tài liệu bài học"><h3>Tài liệu bài học</h3>
      <ul>{lessonDocuments(lesson.documents).map((doc, index) => <li key={`${doc.url}-${index}`}><a href={doc.url} target="_blank" rel="noopener noreferrer">{doc.name}</a></li>)}</ul>
    </section>}
    <nav className="kanji-content-tabs" aria-label="Nội dung bài học Kanji">
      <button type="button" aria-pressed={tab === "kanji"} onClick={() => setTab("kanji")}>Danh sách Kanji</button>
      <button type="button" aria-pressed={tab === "exercise"} onClick={() => setTab("exercise")}>Bài tập Kanji</button>
    </nav>
    {tab === "exercise" ? <KanjiExercisesTab key={lesson.id} lessonId={lesson.id} readOnly={lesson.status === "ARCHIVED"} /> : <>
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
      {editing ? <form onSubmit={submit}><h3>{detail ? "Cập nhật Kanji" : "Thêm Kanji"}</h3>
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
          <div className="kanji-pagination"><button className="btn-edit" disabled={busy || detail.status === "ARCHIVED"} onClick={() => edit(detail)}>Chỉnh sửa</button><button className="btn-delete" disabled={busy} onClick={() => remove(detail)}>Xóa / lưu trữ</button></div>
        </>}
    </section></div>}
  </div>;
}
