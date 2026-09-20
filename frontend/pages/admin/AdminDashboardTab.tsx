import { useEffect, useState } from "react";
import { getAdminDashboardStats } from "../../api/adminApi";
import type { AdminDashboardStatsResponse } from "../../types/admin";

export function AdminDashboardTab() {
  const [stats, setStats] = useState<AdminDashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể tải dữ liệu thống kê hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-spinner" />
        <p>Đang tải dữ liệu sơ đồ & thống kê...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error-box">
        <span>⚠️ {error}</span>
        <button type="button" onClick={fetchStats} className="admin-retry-btn">Thử lại</button>
      </div>
    );
  }

  const maxGrowthValue = Math.max(...(stats?.userGrowthStats.map(g => g.value) || [1]), 1);

  return (
    <div className="admin-tab-content">
      {/* Header Banner */}
      <div className="admin-tab-header">
        <div>
          <h2 className="admin-tab-title">📊 Sơ Đồ & Thống Kê Hệ Thống</h2>
          <p className="admin-tab-subtitle">Tổng quan dữ liệu người dùng và biểu đồ tăng trưởng nền tảng J-Tech</p>
        </div>
        <button type="button" onClick={fetchStats} className="admin-refresh-btn" title="Cập nhật dữ liệu mới nhất">
          🔄 Tải lại
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-users">
          <div className="kpi-icon-wrapper">👥</div>
          <div className="kpi-details">
            <span className="kpi-label">Tổng người dùng</span>
            <span className="kpi-value">{stats?.totalUsers.toLocaleString()}</span>
            <div className="kpi-subtext">
              <span className="text-success">● {stats?.activeUsers} Hoạt động</span>
              <span className="text-danger">● {stats?.bannedUsers} Bị cấm</span>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-videos">
          <div className="kpi-icon-wrapper">✅</div>
          <div className="kpi-details">
            <span className="kpi-label">Tài khoản hoạt động</span>
            <span className="kpi-value">{stats?.activeUsers.toLocaleString()}</span>
            <div className="kpi-subtext">
              <span className="text-success">● Đang hoạt động</span>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-views">
          <div className="kpi-icon-wrapper">🔒</div>
          <div className="kpi-details">
            <span className="kpi-label">Tài khoản bị hạn chế</span>
            <span className="kpi-value">{((stats?.lockedUsers || 0) + (stats?.bannedUsers || 0)).toLocaleString()}</span>
            <div className="kpi-subtext">
              <span>Khóa: {stats?.lockedUsers} · Cấm: {stats?.bannedUsers}</span>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-comments">
          <div className="kpi-icon-wrapper">⏸️</div>
          <div className="kpi-details">
            <span className="kpi-label">Tài khoản chưa kích hoạt</span>
            <span className="kpi-value">{stats?.inactiveUsers.toLocaleString()}</span>
            <div className="kpi-subtext">
              <span className="text-info">Cần theo dõi trạng thái</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts & Diagrams Section */}
      <div className="charts-grid">
        {/* User Growth Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>📈 Tăng Trưởng Người Dùng (6 Tháng)</h3>
            <span className="chart-badge">Thời gian thực</span>
          </div>
          <div className="bar-chart-container">
            {stats?.userGrowthStats.map((item) => {
              const heightPercent = Math.round((item.value / maxGrowthValue) * 100);
              return (
                <div key={item.label} className="bar-column">
                  <div className="bar-val-tooltip">{item.value}</div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.max(heightPercent, 8)}%` }}
                    />
                  </div>
                  <span className="bar-label">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Category Breakdown & Account Status Breakdown Grid */}
      <div className="charts-grid second-row">

        {/* Account Status Breakdown */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>🛡️ Phân Loại Trạng Thái Tài Khoản</h3>
            <span className="chart-badge">Bảo mật</span>
          </div>
          <div className="status-grid">
            <div className="status-box status-active">
              <span className="sb-label">Hoạt động (Active)</span>
              <span className="sb-value">{stats?.activeUsers}</span>
            </div>
            <div className="status-box status-inactive">
              <span className="sb-label">Chưa kích hoạt (Inactive)</span>
              <span className="sb-value">{stats?.inactiveUsers}</span>
            </div>
            <div className="status-box status-locked">
              <span className="sb-label">Tạm khóa (Locked)</span>
              <span className="sb-value">{stats?.lockedUsers}</span>
            </div>
            <div className="status-box status-banned">
              <span className="sb-label">Bị cấm (Banned)</span>
              <span className="sb-value">{stats?.bannedUsers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
