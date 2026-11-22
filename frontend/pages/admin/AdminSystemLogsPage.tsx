import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import { getSystemLog, getSystemLogs } from "../../api/adminApi";
import type { SystemLog, SystemLogPage } from "../../types/admin";
import "./AdminSystemLogsPage.css";

const displayDate = (value: string) => {
  // Database DATETIME values follow the application's Asia/Ho_Chi_Minh timezone.
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}+07:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 404) return "Không tìm thấy nhật ký này.";
  return "Không tải được nhật ký. Vui lòng thử lại.";
}

export function AdminSystemLogsPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const id = location.pathname.replace(/\/$/, "").split("/").slice(3).join("/");
  const [data, setData] = useState<SystemLogPage | null>(null);
  const [detail, setDetail] = useState<SystemLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [validation, setValidation] = useState("");
  const rawPage = Number(params.get("page") ?? "0");
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const size = [10, 25, 50].includes(Number(params.get("size"))) ? Number(params.get("size")) : 10;

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(""); setDetail(null); setData(null);
    const filters = new URLSearchParams(query);
    const load = async () => {
      try {
        if (id) {
          if (!/^\d+$/.test(id)) throw new Error("Invalid ID");
          const result = await getSystemLog(id, abort.signal);
          if (!abort.signal.aborted) setDetail(result);
        } else {
          const result = await getSystemLogs({
            search: filters.get("search") || undefined, level: filters.get("level") || undefined,
            entityType: filters.get("entityType") || undefined, from: filters.get("from") || undefined,
            to: filters.get("to") || undefined, page, size,
          }, abort.signal);
          if (!abort.signal.aborted) setData(result);
        }
      } catch (failure) {
        if (!abort.signal.aborted) setError(errorMessage(failure));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => abort.abort();
  }, [id, query, page, size, revision]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get("from") ?? ""), to = String(form.get("to") ?? "");
    if (from && to && from > to) { setValidation("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."); return; }
    setValidation("");
    const next = new URLSearchParams();
    for (const [key, value] of form) if (String(value).trim()) next.set(key, String(value).trim());
    setParams(next);
  }
  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params); next.set("page", String(nextPage)); setParams(next);
  }
  const base = `/admin/system-logs${query ? `?${query}` : ""}`;
  return <section className="admin-page-container system-logs">
    <div className="admin-page-header">
      <div><h2 className="admin-main-title">{id ? "Chi tiết nhật ký" : "Nhật ký hệ thống"}</h2>
        <p className="admin-main-subtitle">Lịch sử thao tác và kết quả xử lý của hệ thống.</p></div>
      <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading}>Làm mới</button>
    </div>
    {id ? <Link to={base}>← Quay lại danh sách</Link> : <form key={query} onSubmit={applyFilters} className="system-log-filters">
      <label>Tìm kiếm<input name="search" defaultValue={params.get("search") ?? ""} placeholder="Hành động, tên hoặc email" maxLength={255} /></label>
      <label>Mức độ<select name="level" defaultValue={params.get("level") ?? ""}>
        <option value="">Tất cả</option><option>INFO</option><option>WARNING</option><option>ERROR</option>
      </select></label>
      <label>Loại đối tượng<input name="entityType" defaultValue={params.get("entityType") ?? ""} placeholder="Ví dụ: AdminUser" maxLength={50} /></label>
      <label>Từ ngày<input type="date" name="from" defaultValue={params.get("from") ?? ""} /></label>
      <label>Đến ngày<input type="date" name="to" defaultValue={params.get("to") ?? ""} /></label>
      <label>Số dòng<select name="size" defaultValue={size}><option>10</option><option>25</option><option>50</option></select></label>
      <button type="submit">Áp dụng</button><button type="button" onClick={() => { setValidation(""); setParams({}); }}>Đặt lại</button>
    </form>}
    {validation && <p role="alert">{validation}</p>}
    {loading && <p role="status">Đang tải nhật ký…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}
    {!loading && !error && detail && <article className="admin-table-card system-log-detail">
      <dl>{([
        ["Mã nhật ký", detail.id], ["Thời gian (Việt Nam)", displayDate(detail.createdAt)],
        ["Người thực hiện", detail.fullName || detail.email || "Hệ thống / không xác định"],
        ["Email", detail.email], ["ID người thực hiện", detail.userId], ["Hành động", detail.action],
        ["Loại đối tượng", detail.entityType], ["ID đối tượng", detail.entityId], ["Mức độ", detail.level],
        ["Địa chỉ IP", detail.ipAddress], ["User Agent", detail.userAgent],
      ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>
      <h3>Nội dung chi tiết</h3><pre>{JSON.stringify(detail.detail, null, 2) ?? "Không có nội dung chi tiết."}</pre>
    </article>}
    {!loading && !error && !id && data && <div className="admin-table-card">
      <div className="system-log-table-scroll"><table>
        <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>Mức độ</th><th>Chi tiết</th></tr></thead>
        <tbody>{data.content.map(log => <tr key={log.id}>
          <td>{displayDate(log.createdAt)}</td><td>{log.fullName || log.email || "Hệ thống / không xác định"}</td>
          <td>{log.action}</td><td>{log.entityType ?? "—"}{log.entityId != null ? ` #${log.entityId}` : ""}</td>
          <td><span className={`system-log-level ${log.level.toLowerCase()}`}>{log.level}</span></td>
          <td><Link to={`/admin/system-logs/${log.id}${query ? `?${query}` : ""}`} aria-label={`Xem nhật ký ${log.id}`}>Xem</Link></td>
        </tr>)}</tbody>
      </table></div>
      {data.content.length === 0 && <p className="system-log-empty">Không có nhật ký phù hợp.</p>}
      <div className="system-log-pagination"><span>{data.totalElements} nhật ký · Trang {page + 1}/{Math.max(1, data.totalPages)}</span>
        <button type="button" disabled={page === 0} onClick={() => goToPage(page - 1)}>Trước</button>
        <button type="button" disabled={page + 1 >= data.totalPages} onClick={() => goToPage(page + 1)}>Sau</button>
      </div>
    </div>}
  </section>;
}
