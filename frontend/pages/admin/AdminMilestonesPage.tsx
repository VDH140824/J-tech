import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { apiClient } from "../../services/api";
import "../feedback/FeedbackPage.css";

type Milestone = { id: number; targetDays: number; coinAmount: number; enabled: boolean | number; awardedCount: number };
type Draft = { id?: number; targetDays: string; coinAmount: string; enabled: boolean };
const endpoint = "/admin/rewards/milestones";
export function AdminMilestonesPage() {
  const cache = useQueryClient();
  const list = useQuery({ queryKey: ["admin-streak-milestones"], queryFn: async () => (await apiClient.get<Milestone[]>(endpoint)).data });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<Milestone | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function refresh() {
    await cache.invalidateQueries({ queryKey: ["admin-streak-milestones"] });
    void cache.invalidateQueries({ queryKey: ["streak"] });
  }
  function showError(e: unknown) {
    setError(isAxiosError(e) && (e.response?.status ?? 500) < 500
      ? e.response?.data?.message || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại."
      : "Không thể lưu thay đổi. Vui lòng thử lại.");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    const body = { targetDays: Number(draft.targetDays), coinAmount: Number(draft.coinAmount), enabled: draft.enabled };
    if (!Number.isInteger(body.targetDays) || body.targetDays <= 0 || !Number.isInteger(body.coinAmount) || body.coinAmount <= 0) {
      setError("Mốc ngày và số xu phải là số nguyên dương."); return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      if (draft.id) await apiClient.put(`${endpoint}/${draft.id}`, body);
      else await apiClient.post(endpoint, body);
      setDraft(null); setSuccess("Đã lưu mốc thưởng."); await refresh();
    } catch (e) { showError(e); } finally { setBusy(false); }
  }
  async function remove() {
    if (!removing || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await apiClient.delete(`${endpoint}/${removing.id}`);
      setRemoving(null); setSuccess("Đã cập nhật danh sách mốc thưởng."); await refresh();
    } catch (e) { showError(e); } finally { setBusy(false); }
  }
  return <section className="feedback-page">
    <h1>Cấu hình mốc chuỗi học tập</h1>
    <p>Mỗi mốc được thưởng một lần trong mỗi chuỗi học liên tục. Thay đổi áp dụng cho lần đạt mốc sau đó.</p>
    {error && <p className="feedback-error" role="alert">{error}</p>}
    {success && <p className="feedback-success" role="status">{success}</p>}
    {list.isLoading && <p>Đang tải mốc thưởng…</p>}
    {list.isError ? <p className="feedback-error" role="alert">Không tải được mốc thưởng. <button onClick={() => list.refetch()}>Thử lại</button></p> : list.data && <>
      <button className="primary" disabled={busy} onClick={() => { setDraft({ targetDays: "", coinAmount: "", enabled: true }); setError(""); setSuccess(""); }}>Thêm mốc thưởng</button>
      <div className="feedback-card">{!list.data.length ? <p>Chưa có mốc thưởng được cấu hình.</p> : <table>
        <thead><tr><th>Số ngày liên tiếp</th><th>Xu thưởng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{list.data.map(m => <tr key={m.id}><td>{m.targetDays} ngày</td><td>{m.coinAmount.toLocaleString("vi-VN")} xu</td><td>{m.enabled ? "Đang bật" : "Đã tắt"}</td><td>
          <button disabled={busy} onClick={() => { setDraft({ id: m.id, targetDays: String(m.targetDays), coinAmount: String(m.coinAmount), enabled: !!m.enabled }); setError(""); }}>Chỉnh sửa</button>{" "}
          <button disabled={busy} onClick={() => setRemoving(m)}>{m.awardedCount > 0 ? "Tắt mốc" : "Xóa"}</button>
        </td></tr>)}</tbody>
      </table>}</div>
    </>}
    {draft && <form className="feedback-card feedback-form" onSubmit={save}>
      <h2>{draft.id ? "Chỉnh sửa mốc thưởng" : "Thêm mốc thưởng"}</h2>
      <label>Số ngày liên tiếp<input type="number" min="1" max="2147483647" step="1" required disabled={busy || !!draft.id} value={draft.targetDays} onChange={e => setDraft({ ...draft, targetDays: e.target.value })} /></label>
      <label>Xu thưởng<input type="number" min="1" max="4294967295" step="1" required disabled={busy} value={draft.coinAmount} onChange={e => setDraft({ ...draft, coinAmount: e.target.value })} /></label>
      <label>Trạng thái<select disabled={busy} value={draft.enabled ? "on" : "off"} onChange={e => setDraft({ ...draft, enabled: e.target.value === "on" })}><option value="on">Đang bật</option><option value="off">Đã tắt</option></select></label>
      <div className="feedback-actions feedback-wide"><button type="button" disabled={busy} onClick={() => setDraft(null)}>Hủy</button><button className="primary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu mốc thưởng"}</button></div>
    </form>}
    {removing && <div className="feedback-card" role="alertdialog" aria-label="Xác nhận thay đổi mốc thưởng"><h2>{removing.awardedCount > 0 ? "Tắt mốc thưởng" : "Xóa mốc thưởng"}</h2>
      <p>Mốc {removing.targetDays} ngày sẽ được xóa nếu chưa từng cấp thưởng; nếu đã cấp thưởng, hệ thống sẽ tắt mốc và giữ lịch sử.</p>
      <div className="feedback-actions"><button disabled={busy} onClick={() => setRemoving(null)}>Hủy</button><button className="primary" disabled={busy} onClick={remove}>Xác nhận</button></div>
    </div>}
  </section>;
}
