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
      <div className="admin-page-container">
        <div className="admin-table-loading">
          <div className="admin-spinner" />
          <p>Đang tải dữ liệu sơ đồ & thống kê hệ thống...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page-container">
        <div className="admin-alert-banner error">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchStats} className="admin-retry-btn">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const maxGrowthValue = Math.max(...(stats?.userGrowthStats.map((g) => g.value) || [1]), 1);

  return (
    <div className="admin-page-container">
      {/* 1. Header */}
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">Sơ đồ & Thống kê sinh thái</h2>
          <p className="admin-main-subtitle">
            Tổng quan dữ liệu người dùng, biểu đồ tăng trưởng và trạng thái hệ thống J-Tech.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="admin-btn-refresh-clean"
          title="Cập nhật dữ liệu mới nhất"
        >
          <span className="btn-icon">🔄</span>
          <span>Tải lại dữ liệu</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards Grid */}
      <div className="admin-kpi-grid">
        {/* Card 1: Tổng người dùng */}
        <div className="admin-kpi-card-clean kpi-pink">
          <div className="kpi-icon-bubble bubble-pink">👥</div>
          <div className="kpi-info-group">
            <span className="kpi-title-label">Tổng người dùng</span>
            <span className="kpi-number-val">{stats?.totalUsers.toLocaleString()}</span>
            <div className="kpi-sub-pills">
              <span className="pill-mini pill-mini-success">● {stats?.activeUsers} Hoạt động</span>
              <span className="pill-mini pill-mini-danger">● {stats?.bannedUsers} Bị cấm</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tài khoản hoạt động */}
        <div className="admin-kpi-card-clean kpi-green">
          <div className="kpi-icon-bubble bubble-green">✅</div>
          <div className="kpi-info-group">
            <span className="kpi-title-label">Đang hoạt động</span>
            <span className="kpi-number-val">{stats?.activeUsers.toLocaleString()}</span>
            <div className="kpi-sub-pills">
              <span className="pill-mini pill-mini-success">Sẵn sàng truy cập</span>
            </div>
          </div>
        </div>

        {/* Card 3: Tài khoản bị hạn chế */}
        <div className="admin-kpi-card-clean kpi-red">
          <div className="kpi-icon-bubble bubble-red">🔒</div>
          <div className="kpi-info-group">
            <span className="kpi-title-label">Tài khoản bị hạn chế</span>
            <span className="kpi-number-val">
              {((stats?.lockedUsers || 0) + (stats?.bannedUsers || 0)).toLocaleString()}
            </span>
            <div className="kpi-sub-pills">
              <span className="pill-mini pill-mini-warning">Khóa: {stats?.lockedUsers}</span>
              <span className="pill-mini pill-mini-danger">Cấm: {stats?.bannedUsers}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tài khoản chưa kích hoạt */}
        <div className="admin-kpi-card-clean kpi-amber">
          <div className="kpi-icon-bubble bubble-amber">⏳</div>
          <div className="kpi-info-group">
            <span className="kpi-title-label">Chờ kích hoạt / Chưa kích hoạt</span>
            <span className="kpi-number-val">{stats?.inactiveUsers.toLocaleString()}</span>
            <div className="kpi-sub-pills">
              <span className="pill-mini pill-mini-info">Cần theo dõi</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bar Chart Card: Tăng trưởng người dùng */}
      <div className="admin-chart-card">
        <div className="chart-card-header">
          <div className="chart-title-group">
            <h3 className="chart-title">📈 Biểu đồ tăng trưởng người dùng</h3>
            <span className="chart-subtitle">Thống kê theo chu kỳ 6 tháng gần nhất</span>
          </div>
          <span className="chart-realtime-badge">● Thời gian thực</span>
        </div>

        <div className="admin-barchart-container">
          {stats?.userGrowthStats.map((item) => {
            const heightPercent = Math.round((item.value / maxGrowthValue) * 100);
            return (
              <div key={item.label} className="barchart-column">
                <span className="barchart-tooltip">{item.value}</span>
                <div className="barchart-track">
                  <div
                    className="barchart-fill"
                    style={{ height: `${Math.max(heightPercent, 12)}%` }}
                  />
                </div>
                <span className="barchart-label">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Status Breakdown Grid */}
      <div className="admin-chart-card">
        <div className="chart-card-header">
          <div className="chart-title-group">
            <h3 className="chart-title">🛡️ Phân bổ trạng thái tài khoản hệ thống</h3>
            <span className="chart-subtitle">Chi tiết mức độ phân bổ quyền & an toàn tài khoản</span>
          </div>
        </div>

        <div className="admin-status-boxes-grid">
          <div className="status-metric-box box-active">
            <div className="box-indicator-dot dot-green" />
            <div className="box-metric-info">
              <span className="box-label">Đang hoạt động</span>
              <span className="box-number">{stats?.activeUsers}</span>
            </div>
          </div>

          <div className="status-metric-box box-inactive">
            <div className="box-indicator-dot dot-amber" />
            <div className="box-metric-info">
              <span className="box-label">Chưa kích hoạt</span>
              <span className="box-number">{stats?.inactiveUsers}</span>
            </div>
          </div>

          <div className="status-metric-box box-locked">
            <div className="box-indicator-dot dot-orange" />
            <div className="box-metric-info">
              <span className="box-label">Tạm khóa</span>
              <span className="box-number">{stats?.lockedUsers}</span>
            </div>
          </div>

          <div className="status-metric-box box-banned">
            <div className="box-indicator-dot dot-red" />
            <div className="box-metric-info">
              <span className="box-label">Bị cấm</span>
              <span className="box-number">{stats?.bannedUsers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
