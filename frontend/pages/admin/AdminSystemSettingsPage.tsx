import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getSystemSettings, updateSystemSettings } from "../../api/systemSettingApi";
import type { SystemSettings } from "../../types/systemSetting";
import "./AdminSystemSettingsPage.css";

export function AdminSystemSettingsPage() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: ({ signal }) => getSystemSettings(signal),
    refetchOnWindowFocus: false,
  });
  const [draft, setDraft] = useState<SystemSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => { if (query.data) setDraft({ ...query.data.settings }); }, [query.data]);
  const changed = draft !== null && JSON.stringify(draft) !== JSON.stringify(query.data?.settings);

  function change<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setDraft(current => current ? { ...current, [key]: value } : current);
    setSuccess(""); setError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || busy) return;
    setError(""); setSuccess("");
    if (draft.announcementEnabled && (!draft.announcementTitle.trim() || !draft.announcementContent.trim())) {
      setError("Vui lòng nhập tiêu đề và nội dung khi bật thông báo."); return;
    }
    setBusy(true);
    try {
      const result = await updateSystemSettings(draft);
      setDraft({ ...result.settings });
      client.setQueryData(["admin-system-settings"], result);
      void client.invalidateQueries({ queryKey: ["system-announcement"] });
      setSuccess("Đã lưu cấu hình hệ thống.");
    } catch (failure) {
      setError(axios.isAxiosError(failure) && typeof failure.response?.data?.message === "string"
        ? failure.response.data.message : "Không lưu được cấu hình. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }
  const updated = query.data?.updatedAt;
  return <section className="admin-page-container system-settings">
    <div className="admin-page-header"><div>
      <h2 className="admin-main-title">Cấu hình hệ thống</h2>
      <p className="admin-main-subtitle">Quản lý thông báo và email của nền tảng.</p>
    </div></div>
    {query.isLoading && <p role="status">Đang tải cấu hình…</p>}
    {query.isError && <p role="alert">Không tải được cấu hình. <button type="button" onClick={() => query.refetch()}>Thử lại</button></p>}
    {error && <p className="settings-error" role="alert">{error}</p>}
    {success && <p className="settings-success" role="status">{success}</p>}
    {!query.isError && draft && <form onSubmit={save}>
      <fieldset disabled={busy} className="admin-table-card settings-group">
        <legend>Thông báo hệ thống</legend>
        <label className="settings-toggle"><input type="checkbox" checked={draft.announcementEnabled}
          onChange={event => change("announcementEnabled", event.target.checked)} />Hiển thị thông báo cho người dùng</label>
        <p>Thông báo xuất hiện trên các trang học tập trong giao diện chính. Người đang mở trang nhận cập nhật trong khoảng 30 giây.</p>
        <label className="settings-field">Tiêu đề<input maxLength={200} required={draft.announcementEnabled}
          value={draft.announcementTitle} onChange={event => change("announcementTitle", event.target.value)} /></label>
        <label className="settings-field">Nội dung<textarea maxLength={2000} rows={5} required={draft.announcementEnabled}
          value={draft.announcementContent} onChange={event => change("announcementContent", event.target.value)} /></label>
        <span className="settings-hint">{draft.announcementContent.length}/2000 ký tự</span>
        {draft.announcementEnabled && <aside className="settings-preview"><strong>{draft.announcementTitle || "Tiêu đề thông báo"}</strong><p>{draft.announcementContent || "Nội dung thông báo"}</p></aside>}
      </fieldset>
      <fieldset disabled={busy} className="admin-table-card settings-group">
        <legend>Email hệ thống</legend>
        <label className="settings-toggle"><input type="checkbox" checked={draft.learningReminderEnabled}
          onChange={event => change("learningReminderEnabled", event.target.checked)} />Bật email nhắc học</label>
        <p>Khi bật, hệ thống gửi theo lựa chọn và giờ nhắc của từng người học. Khi tắt, các lượt nhắc tiếp theo sẽ dừng.</p>
        <label className="settings-toggle"><input type="checkbox" checked={draft.feedbackEmailEnabled}
          onChange={event => change("feedbackEmailEnabled", event.target.checked)} />Bật email kết quả xử lý phản hồi</label>
        <p>Thông báo trong ứng dụng vẫn được tạo khi xử lý phản hồi.</p>
      </fieldset>
      <div className="settings-actions"><button type="submit" disabled={busy || !changed}>{busy ? "Đang lưu…" : "Lưu cấu hình"}</button>
        <button type="button" disabled={busy || !changed} onClick={() => { if (query.data) setDraft({ ...query.data.settings }); setError(""); setSuccess(""); }}>Hủy thay đổi</button>
        {changed && <span> Có thay đổi chưa lưu</span>}
      </div>
      <p className="settings-hint">{updated ? `Cập nhật bởi ${query.data?.updatedByName || `Admin #${query.data?.updatedBy}`} · ${new Date(`${updated}+07:00`).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (Việt Nam)` : "Đang sử dụng cấu hình mặc định."}</p>
    </form>}
  </section>;
}
