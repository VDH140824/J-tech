import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import "./HomePage.css";

const featuredTopics = [
  { label: "Triều đại", value: "Lý - Trần - Lê", icon: "🏯" },
  { label: "Danh nhân", value: "Anh hùng & học giả", icon: "👤" },
  { label: "Sự kiện", value: "Mốc son lịch sử", icon: "⚔️" },
  { label: "Di sản", value: "Đền, thành, bảo tàng", icon: "🏛️" },
];

const communityActivities = [
  { title: "Bài viết chuyên sâu", desc: "Phân tích bối cảnh, diễn biến và ý nghĩa của từng giai đoạn lịch sử.", status: "Đã mở", icon: "✓", tone: "completed" },
  { title: "Thảo luận cộng đồng", desc: "Cùng nhau phản biện, bổ sung tư liệu và chia sẻ góc nhìn lịch sử.", status: "Đang sôi nổi", icon: "★", tone: "current" },
  { title: "Sự kiện trực tuyến", desc: "Giao lưu với người yêu sử, khách mời và nhóm nghiên cứu.", status: "Sắp ra mắt", icon: "⏳", tone: "locked" },
];

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useCurrentUser();
  const { mutate: logout } = useLogout();

  const displayName = user?.username ?? user?.email ?? "";
  const userName = isAuthenticated ? (displayName ? `Xin chào, ${displayName}` : "Xin chào") : "Khách";
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : "H";
  const normalizedRole = user?.role?.trim().toUpperCase();
  const normalizedRoleId = String(user?.roleId ?? "");
  const isAdmin = normalizedRoleId === "1" || normalizedRole === "ADMIN" || normalizedRole === "ROLE_ADMIN";

  return (
    <div className="home-container">
      <header className="home-header">
        <nav className="home-nav">
          <button type="button" className="brand-logo" onClick={() => navigate("/home")}>
            <div className="brand-icon">🇯🇵</div>
            <div className="brand-text">
              <span className="brand-title">J-Tech</span>
              <span className="brand-subtitle">J-Tech Japanese Learning Website</span>
            </div>
          </button>
          <ul className="nav-links">
            <li><button type="button" className="nav-item-btn active">🏠 Trang chủ</button></li>
            <li><button type="button" className="nav-item-btn">🗺️ Dòng thời gian</button></li>
            <li><button type="button" className="nav-item-btn">📰 Bài viết</button></li>
            {isAdmin && <li><Link to="/admin" className="nav-item-btn">🛠️ Quản trị Admin</Link></li>}
          </ul>
          <div className="user-profile-menu">
            <button type="button" className="user-badge" onClick={() => navigate("/profile")} title="Mở trang profile">
              <div className="user-avatar">{avatarInitial}</div>
              <div className="user-info"><span className="user-name">{userName}</span></div>
            </button>
            <button type="button" className="logout-btn" onClick={() => logout()}>Đăng xuất</button>
          </div>
        </nav>
      </header>

      <main className="home-main">
        <section className="hero-section">
          <div className="hero-glow" />
          <div className="hero-copy">
            <div className="hero-greeting-chip">👋 Chào mừng đến với J-Tech</div>
            <h1 className="hero-title">Nền tảng học tiếng Nhật trực tuyến cho mọi trình độ</h1>
            <p className="hero-desc">J-Tech là không gian học tiếng Nhật hiện đại: luyện từ vựng, ngữ pháp, kỹ năng nghe nói, xem video bài học và theo dõi tiến độ cá nhân.</p>
            <div className="topic-pills">
              {featuredTopics.map((topic) => (
                <button key={topic.label} type="button" className="topic-pill">
                  <span>{topic.icon}</span>
                  <span><strong>{topic.label}</strong><small>{topic.value}</small></span>
                </button>
              ))}
            </div>
            <div className="hero-actions">
              <button type="button" className="btn-primary" onClick={() => navigate("/profile")}>Bắt đầu học <span>→</span></button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/profile")}>Hồ sơ của tôi</button>
            </div>
          </div>
          <aside className="continue-card">
            <div className="continue-tag">⚡ Lộ trình nổi bật</div>
            <h3 className="continue-title">Bài học tuần này</h3>
            <p className="continue-subtitle">N5 nền tảng: Hiragana, Katakana và mẫu câu cơ bản</p>
            <div className="progress-container">
              <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: "68%" }} /></div>
              <div className="progress-info"><span>Tiến độ học tập</span><span>68% (14/20 bài)</span></div>
            </div>
            <div className="mini-stats"><div><strong>24</strong><span>Bài học mới</span></div><div><strong>320</strong><span>Lượt luyện tập</span></div></div>
          </aside>
        </section>

        <section className="stats-grid">
          <div className="stat-card"><div className="stat-icon-wrapper">🧭</div><div className="stat-info"><span className="stat-value">128</span><span className="stat-label">Từ vựng</span></div></div>
          <div className="stat-card"><div className="stat-icon-wrapper">📚</div><div className="stat-info"><span className="stat-value">42</span><span className="stat-label">Chủ đề học</span></div></div>
          <div className="stat-card"><div className="stat-icon-wrapper">👥</div><div className="stat-info"><span className="stat-value">1.2K</span><span className="stat-label">Học viên</span></div></div>
          <div className="stat-card"><div className="stat-icon-wrapper">🎬</div><div className="stat-info"><span className="stat-value">86</span><span className="stat-label">Video bài học</span></div></div>
        </section>

        <section className="features-grid">
          <div className="feature-card"><div className="feature-top"><div className="feature-icon">🏛️</div><span className="feature-tag">Lộ trình học</span></div><h3 className="feature-title">Học theo lộ trình rõ ràng</h3><p className="feature-desc">Theo dõi cấp độ JLPT, bài học và mục tiêu qua lộ trình trực quan.</p><div className="feature-action">Xem lộ trình <span>→</span></div></div>
          <div className="feature-card"><div className="feature-top"><div className="feature-icon">🗣️</div><span className="feature-tag">Cộng đồng</span></div><h3 className="feature-title">Luyện tập cùng cộng đồng</h3><p className="feature-desc">Đặt câu hỏi, chia sẻ kinh nghiệm học và luyện giao tiếp cùng các học viên khác.</p><div className="feature-action">Vào cộng đồng <span>→</span></div></div>
          <div className="feature-card"><div className="feature-top"><div className="feature-icon">🎥</div><span className="feature-tag">Video bài học</span></div><h3 className="feature-title">Bài học đa phương tiện</h3><p className="feature-desc">Xem video, ghi chú mẫu câu và luyện nghe nói để tiếp cận tiếng Nhật sinh động hơn.</p><div className="feature-action">Mở video <span>→</span></div></div>
        </section>

        <section className="bottom-grid">
          <div className="word-of-day-card">
            <div className="wotd-header"><span className="wotd-badge">🌸 Từ vựng hôm nay</span></div>
            <div className="wotd-main"><span className="wotd-kanji">J-Tech</span><span className="wotd-furigana">J-Tech Japanese Learning Website</span></div>
            <div className="wotd-meaning"><strong>Trọng tâm:</strong> Học tiếng Nhật đều đặn mỗi ngày</div>
            <div className="wotd-example"><div className="wotd-jp-sentence">日本語を毎日少しずつ勉強しましょう。</div><div className="wotd-vi-sentence">J-Tech giúp bạn học từ vựng, luyện kỹ năng và theo dõi tiến độ trong một cộng đồng thân thiện.</div></div>
          </div>
          <div className="roadmap-card">
            <div className="section-header" style={{ marginBottom: 12 }}><h2 className="section-title"><span>🧭</span> Hoạt động nổi bật</h2><span className="section-link">Xem tất cả</span></div>
            <div className="roadmap-list">
              {communityActivities.map((item) => (
                <div key={item.title} className={`roadmap-item ${item.tone}`}>
                  <div className="roadmap-status-icon">{item.icon}</div>
                  <div className="roadmap-details"><span className="roadmap-step-title">{item.title}</span><span className="roadmap-step-desc">{item.desc}</span></div>
                  <span className="roadmap-badge">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>© 2026 J-Tech — J-Tech Japanese Learning Website. Cùng gìn giữ và lan tỏa lịch sử Việt Nam.</p>
      </footer>
    </div>
  );
}
