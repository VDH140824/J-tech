import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/api";
import { feedbackCategories, feedbackPath, feedbackStatuses, submitFeedback } from "../../api/feedbackApi";
import type { Feedback, FeedbackInput, FeedbackNotification, FeedbackPage as Page, FeedbackPortal, FeedbackReference, FeedbackStatus } from "../../api/feedbackApi";
import "./FeedbackPage.css";

function errorMessage(error: unknown) {
  const err = error as { response?: { data?: { message?: string } } };
  return err.response?.data?.message || "Không tải hoặc lưu được dữ liệu. Vui lòng thử lại.";
}
const empty: FeedbackInput = { feedbackType: "TECHNICAL", category: "SYSTEM", title: "", content: "" };

export function FeedbackPage({ portal = "student" }: { portal?: FeedbackPortal }) {
  const student = portal === "student";
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState<FeedbackInput>(() => {
    const lessonId = Number(params.get("lessonId"));
    const questionId = Number(params.get("questionId"));
    return lessonId > 0 ? { ...empty, feedbackType: "CONTENT", category: questionId > 0 ? "QUESTION" : "LESSON", lessonId, questionId: questionId > 0 ? questionId : undefined } : empty;
  });
  const [image, setImage] = useState<File>();
  const [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(() => Number(params.get("id")) || null);
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState<Exclude<FeedbackStatus, "PENDING">>("IN_PROGRESS");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const base = feedbackPath(portal);

  useEffect(() => {
    if (!image) { setPreview(""); return; }
    const url = URL.createObjectURL(image); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const references = useQuery({
    queryKey: ["feedback-references", portal],
    queryFn: async () => student
      ? (await apiClient.get<FeedbackReference[]>("/feedback/references")).data
      : (await apiClient.get<FeedbackReference[]>(`/${portal}/feedback/references`)).data,
    enabled: student || portal === "moderator",
  });
  const questions = useQuery({
    queryKey: ["feedback-questions", input.lessonId],
    queryFn: async () => (await apiClient.get<{ id: number; content: string }[]>(`/feedback/references/${input.lessonId}/questions`)).data,
    enabled: student && input.feedbackType === "CONTENT" && input.category === "QUESTION" && !!input.lessonId,
  });
  const list = useQuery({
    queryKey: ["feedback", portal, status, search, courseId, lessonId, page],
    queryFn: async () => (await apiClient.get<Page>(base, { params: {
      page, size: 10, status: status || undefined, search: student ? undefined : search || undefined,
      courseId: courseId || undefined, lessonId: lessonId || undefined,
    } })).data,
  });
  const detail = useQuery({
    queryKey: ["feedback-detail", portal, selectedId],
    queryFn: async () => (await apiClient.get<Feedback>(`${base}/${selectedId}`)).data,
    enabled: !!selectedId,
  });
  const notices = useQuery({
    queryKey: ["feedback-notifications"],
    queryFn: async () => (await apiClient.get<FeedbackNotification[]>("/feedback/notifications")).data,
    enabled: student,
  });
  useEffect(() => {
    if (detail.data) {
      setNote(detail.data.resolutionNote || "");
      setNextStatus(detail.data.status === "PENDING" ? "IN_PROGRESS" : detail.data.status);
    }
  }, [detail.data]);

  function reset() { setInput(empty); setImage(undefined); if (fileRef.current) fileRef.current.value = ""; }
  function open(id: number) { setSelectedId(id); setError(""); setParams(previous => { previous.set("id", String(id)); return previous; }); }
  async function refresh() {
    await Promise.all([client.invalidateQueries({ queryKey: ["feedback"] }), client.invalidateQueries({ queryKey: ["feedback-detail"] }), client.invalidateQueries({ queryKey: ["feedback-notifications"] })]);
  }
  async function send(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      const created = await submitFeedback(input, image);
      reset(); setPage(0); setSuccess("Gửi phản hồi thành công!"); open(created.id); await refresh();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  async function resolve(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      await apiClient.patch(`${base}/${selectedId}`, { status: nextStatus, resolutionNote: note });
      setSuccess("Cập nhật tiến độ xử lý phản hồi thành công!"); await refresh();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  const ticket = detail.data;
  const referenceOptions = references.data || [];
  const courses = [...new Map(referenceOptions.map(ref => [ref.courseId, ref.courseName])).entries()];

  return <section className="feedback-page">
    <header><h1>{student ? "Phản hồi & Báo lỗi" : portal === "admin" ? "Phản hồi & Báo lỗi hệ thống" : "Phản hồi nội dung học"}</h1>
      <p>{student ? "Gửi góp ý và theo dõi kết quả xử lý của bạn." : "Xem thông tin, kiểm tra vấn đề và cập nhật tiến độ xử lý."}</p></header>
    {error && <div role="alert" className="feedback-error">{error}</div>}
    {success && <div role="status" className="feedback-success">{success}</div>}
    {student && <form className="feedback-card feedback-form" onSubmit={send}>
      <h2>Gửi phản hồi mới</h2>
      <label>Nhóm phản hồi<select disabled={busy} value={input.feedbackType} onChange={e => setInput({ ...input, feedbackType: e.target.value as FeedbackInput["feedbackType"], category: e.target.value === "CONTENT" ? "LESSON" : "SYSTEM", lessonId: undefined, questionId: undefined })}>
        <option value="TECHNICAL">Lỗi kỹ thuật / Góp ý</option><option value="CONTENT">Nội dung học</option></select></label>
      <label>Loại phản hồi<select disabled={busy} value={input.category} onChange={e => setInput({ ...input, category: e.target.value, questionId: undefined })}>
        {(input.feedbackType === "CONTENT" ? ["LESSON", "LECTURE", "QUESTION"] : ["SYSTEM", "UX", "OTHER"]).map(key => <option key={key} value={key}>{feedbackCategories[key]}</option>)}</select></label>
      {input.feedbackType === "CONTENT" && <>
        <label>Bài học liên quan<select required disabled={busy || references.isLoading} value={input.lessonId || ""} onChange={e => setInput({ ...input, lessonId: Number(e.target.value), questionId: undefined })}>
          <option value="">Chọn bài học</option>{referenceOptions.map(ref => <option key={ref.id} value={ref.id}>{ref.courseName} / {ref.chapterTitle} / {ref.title}</option>)}</select></label>
        {references.isError && <p role="alert">Không tải được bài học. <button type="button" onClick={() => references.refetch()}>Thử lại</button></p>}
        {input.category === "QUESTION" && <label>Câu hỏi liên quan<select required disabled={busy || questions.isLoading} value={input.questionId || ""} onChange={e => setInput({ ...input, questionId: Number(e.target.value) })}>
          <option value="">Chọn câu hỏi</option>{questions.data?.map(q => <option key={q.id} value={q.id}>#{q.id} — {q.content.slice(0, 100)}</option>)}</select>
          {questions.isError && <button type="button" onClick={() => questions.refetch()}>Tải lại câu hỏi</button>}
          {questions.isSuccess && !questions.data.length && <span>Bài học chưa có câu hỏi khả dụng.</span>}</label>}
      </>}
      <label className="feedback-wide">Tiêu đề<input required maxLength={200} disabled={busy} value={input.title} onChange={e => setInput({ ...input, title: e.target.value })} /></label>
      <label className="feedback-wide">Mô tả chi tiết<textarea required maxLength={10000} rows={5} disabled={busy} value={input.content} onChange={e => setInput({ ...input, content: e.target.value })} /></label>
      <label className="feedback-wide">Ảnh đính kèm (JPG, PNG, WEBP, tối đa 3MB)<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => {
        const file = e.target.files?.[0];
        if (file && (file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
          setError("Ảnh phải là JPG, PNG, WEBP và không quá 3MB."); e.target.value = ""; setImage(undefined); return;
        }
        setError(""); setImage(file);
      }} /></label>
      {preview && <img className="feedback-preview" src={preview} alt="Ảnh sẽ đính kèm" />}
      <div className="feedback-actions feedback-wide"><button type="button" disabled={busy} onClick={reset}>Hủy</button><button className="primary" disabled={busy}>{busy ? "Đang gửi…" : "Gửi phản hồi"}</button></div>
    </form>}

    {student && !!notices.data?.length && <details className="feedback-card"><summary>Thông báo phản hồi ({notices.data.filter(n => !n.isRead).length} chưa đọc)</summary>
      {notices.data.map(notice => <button key={notice.id} className="feedback-notice" onClick={async () => {
        open(Number(new URLSearchParams(notice.linkUrl.split("?")[1]).get("id")));
        try { await apiClient.patch(`/feedback/notifications/${notice.id}/read`); await client.invalidateQueries({ queryKey: ["feedback-notifications"] }); }
        catch (err) { setError(errorMessage(err)); }
      }}>{!notice.isRead && "● "}{notice.content}</button>)}</details>}

    <div className="feedback-card"><h2>{student ? "Phản hồi đã gửi" : "Danh sách phản hồi"}</h2>
      <div className="feedback-filters">
        <label>Trạng thái<select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">Tất cả trạng thái</option>{Object.entries(feedbackStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        {!student && <label>Tìm kiếm<input placeholder="Tiêu đề, tên người gửi, mã nội dung…" maxLength={200} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label>}
        {portal === "moderator" && <><label>Khóa học<select value={courseId} onChange={e => { setCourseId(e.target.value); setLessonId(""); setPage(0); }}><option value="">Tất cả khóa học</option>{courses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Bài học<select value={lessonId} onChange={e => { setLessonId(e.target.value); setPage(0); }}><option value="">Tất cả bài học</option>{referenceOptions.filter(ref => !courseId || ref.courseId === Number(courseId)).map(ref => <option key={ref.id} value={ref.id}>{ref.title}</option>)}</select></label></>}
      </div>
      {list.isLoading && <p role="status">Đang tải phản hồi…</p>}
      {list.isError && <p role="alert">{errorMessage(list.error)} <button onClick={() => list.refetch()}>Thử lại</button></p>}
      {list.isSuccess && !list.data.content.length && <p>{student ? "Bạn chưa có phản hồi phù hợp." : portal === "admin" && !status && !search ? "Hiện không có phản ánh kỹ thuật nào chưa xử lý." : "Không tìm thấy phản hồi phù hợp với điều kiện tìm kiếm."}</p>}
      {!!list.data?.content.length && <div className="feedback-table-wrap"><table><thead><tr><th>Mã / Tiêu đề</th><th>Loại</th>{!student && <th>Người gửi</th>}<th>Khóa học / Bài học</th><th>Ngày gửi</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
        {list.data.content.map(item => <tr key={item.id}><td>#{item.id} · {item.title}</td><td>{feedbackCategories[item.category] || item.category}</td>{!student && <td>{item.submitterName}<small>{item.submitterEmail}</small></td>}<td>{item.courseName || "—"}<small>{item.lessonTitle}</small></td><td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td><span className={`feedback-badge ${item.status}`}>{feedbackStatuses[item.status]}</span></td><td><button onClick={() => open(item.id)}>Xem chi tiết</button></td></tr>)}
      </tbody></table></div>}
      {list.data && list.data.totalElements > 10 && <div className="feedback-actions"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page + 1} / {Math.ceil(list.data.totalElements / 10)}</span><button disabled={(page + 1) * 10 >= list.data.totalElements} onClick={() => setPage(p => p + 1)}>Sau</button></div>}
    </div>
    {selectedId && <section className="feedback-card" aria-label="Chi tiết phản hồi">
      <div className="feedback-actions"><h2>Chi tiết phản hồi #{selectedId}</h2><button onClick={() => { setSelectedId(null); setParams(previous => { previous.delete("id"); return previous; }); }}>Đóng</button></div>
      {detail.isLoading && <p>Đang tải chi tiết…</p>}
      {detail.isError && <p role="alert">{errorMessage(detail.error)} <button onClick={() => detail.refetch()}>Thử lại</button></p>}
      {ticket && <><h3>{ticket.title}</h3><p>{ticket.submitterName} · {ticket.submitterEmail} · {new Date(ticket.createdAt).toLocaleString("vi-VN")}</p>
        <p>{feedbackCategories[ticket.category]} · <span className={`feedback-badge ${ticket.status}`}>{feedbackStatuses[ticket.status]}</span></p>
        <p className="feedback-description">{ticket.content}</p>
        {ticket.lessonId && <p>{ticket.courseName} / {ticket.lessonTitle} (#{ticket.lessonId}){ticket.questionId && ` / Câu hỏi #${ticket.questionId}`}</p>}
        {portal === "moderator" && ticket.lessonId && (ticket.contentAvailable && ticket.courseId && ticket.chapterId
          ? <a target="_blank" rel="noreferrer" href={`/moderator/courses/${ticket.courseId}/chapters/${ticket.chapterId}?skill=${ticket.skillType?.toLowerCase()}&lessonId=${ticket.lessonId}`}>Xem bài giảng / học liệu liên quan</a>
          : <p>Học liệu hoặc câu hỏi liên quan hiện không còn khả dụng hoặc đã bị lưu trữ.</p>)}
        {ticket.attachmentUrl ? <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer"><img className="feedback-preview" src={ticket.attachmentUrl} alt="Ảnh minh chứng phản hồi" /></a> : <p>Không có tệp hình ảnh đính kèm.</p>}
        <p className="feedback-description"><strong>Ghi chú xử lý: </strong>{ticket.resolutionNote || "Chưa có ghi chú xử lý."}</p>
        {ticket.handlerName && <p>Người xử lý: {ticket.handlerName}{ticket.resolvedAt && ` · ${new Date(ticket.resolvedAt).toLocaleString("vi-VN")}`}</p>}
        {!student && <form className="feedback-form" onSubmit={resolve}><label>Trạng thái xử lý<select disabled={busy} value={nextStatus} onChange={e => setNextStatus(e.target.value as typeof nextStatus)}>{(["IN_PROGRESS", "RESOLVED", "REJECTED"] as const).map(key => <option key={key} value={key}>{feedbackStatuses[key]}</option>)}</select></label>
          <label className="feedback-wide">Ghi chú xử lý<textarea disabled={busy} required={nextStatus !== "IN_PROGRESS"} maxLength={10000} rows={4} value={note} onChange={e => setNote(e.target.value)} /></label>
          <button className="primary" disabled={busy}>{busy ? "Đang lưu…" : "Cập nhật trạng thái"}</button></form>}
      </>}
    </section>}
  </section>;
}
