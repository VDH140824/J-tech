import { useState } from "react";
import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getStreakSummary, type StreakSummary } from "../../api/streakApi";
import { useAuthStore } from "../../store/authStore";
import "./StudentStreakPage.css";

function StreakDashboard({ data }: { data: StreakSummary }) {
  const [offset, setOffset] = useState(0);
  const [year, month] = data.today.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const prefix = first.toISOString().slice(0, 7);
  const studied = new Set(data.learningDays);
  const next = data.nextMilestone;
  return <>
    <div className="streak-hero">
      <div><span aria-hidden="true">🔥</span><strong>{data.currentStreak}</strong><p>Ngày học liên tiếp</p></div>
      <div><span aria-hidden="true">📅</span><strong>{studied.size}</strong><p>Tổng số ngày đã học</p></div>
      <div><span aria-hidden="true">🏆</span><strong>{data.longestStreak}</strong><p>Kỷ lục chuỗi ngày học</p></div>
    </div>
    <article className="streak-next">
      <div className="streak-calendar-header">
        <h2>📅 Lịch học tập</h2>
        <div>
          <button aria-label="Tháng trước" onClick={() => setOffset(offset - 1)}>‹</button>
          <strong>Tháng {first.getUTCMonth() + 1}, {first.getUTCFullYear()}</strong>
          <button aria-label="Tháng sau" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>›</button>
        </div>
      </div>
      <div className="streak-calendar">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(day => <span key={day}>{day}</span>)}
        {Array.from({ length: (first.getUTCDay() + 6) % 7 }, (_, i) => <span key={i} aria-hidden="true" />)}
        {Array.from({ length: count }, (_, i) => {
          const day = i + 1;
          const date = prefix + "-" + String(day).padStart(2, "0");
          const learned = studied.has(date);
          const active = learned && data.streakStart !== null && date >= data.streakStart;
          const state = active ? "Trong chuỗi hiện tại" : learned ? "Đã học" : "Chưa học";
          return <div key={date} className={`streak-day ${active ? "active" : learned ? "learned" : ""}`}
            aria-current={date === data.today ? "date" : undefined} title={state}>
            <strong>{day}</strong><span aria-label={state}>{active ? "🔥" : learned ? "✓" : "•"}</span>
          </div>;
        })}
      </div>
      <p className="streak-note">• Chưa học　✓ Đã học　🔥 Trong chuỗi hiện tại</p>
    </article>
    <article className="streak-next">
      <h2>🏆 Thành tích chuỗi</h2>
      {data.milestones.length ? <div className="streak-milestones">{data.milestones.map(m => {
        const reached = data.longestStreak >= m.targetDays;
        return <div key={m.id} className={reached ? "learned" : ""}>
          <strong>{m.targetDays} ngày</strong>
          <span>{reached ? "✓ Đã đạt số ngày" : `${data.currentStreak}/${m.targetDays} ngày`}</span>
          <span>{m.coinAmount.toLocaleString("vi-VN")} xu theo cấu hình</span>
        </div>;
      })}</div> : <p>Chưa có mốc thưởng được cấu hình.</p>}
    </article>
    <article className="streak-next">
      <h2>🎯 Mốc thưởng tiếp theo</h2>
      {next ? <>
        <p>Còn <strong>{next.targetDays - data.currentStreak} ngày</strong> để đạt mốc {next.targetDays} ngày liên tiếp.</p>
        <progress aria-label="Tiến độ đến mốc thưởng" value={data.currentStreak} max={next.targetDays} />
        <p className="streak-coins">{next.coinAmount.toLocaleString("vi-VN")} xu</p>
      </> : <p>Hiện không có mốc thưởng tiếp theo.</p>}
    </article>
    <p className="streak-note">Ngày học được ghi nhận khi hoàn thành hoạt động, tối đa một lần mỗi ngày theo giờ Việt Nam.</p>
  </>;
}

export function StudentStreakPage() {
  const userId = useAuthStore(s => s.user?.id);
  const summary = useQuery({ queryKey: ["streak", userId], queryFn: getStreakSummary });
  const response = isAxiosError(summary.error) ? summary.error.response : undefined;
  let errorMessage = "Không tải được chuỗi ngày học.";
  if (isAxiosError(summary.error) && !response) {
    errorMessage = "Không kết nối được với backend. Kiểm tra backend đã chạy rồi thử lại.";
  } else if (response?.status === 404) {
    errorMessage = "Backend chưa có API chuỗi ngày học. Kiểm tra phiên bản backend đang chạy.";
  } else if (response?.status === 503 && typeof response.data?.message === "string") {
    errorMessage = response.data.message;
  }
  return <section className="student-streak-page">
    <Link to="/home">← Trang chủ</Link>
    <header><h1>Chuỗi ngày học</h1><p>Duy trì thói quen học tiếng Nhật mỗi ngày.</p></header>
    {summary.isLoading && <p role="status">Đang tải chuỗi ngày học…</p>}
    {summary.isError ? <div className="streak-error" role="alert">
      {errorMessage} <button onClick={() => summary.refetch()}>Thử lại</button>
    </div> : summary.data && <StreakDashboard data={summary.data} />}
  </section>;
}
