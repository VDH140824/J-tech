import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import "./HomePage.css";

// SVG Graphic Components for pixel-perfect modern rendering
function DekiruLogoIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 3C20 3 23 9.5 28.5 9.5C34 9.5 37 14 34.5 19.5C32 25 26.5 26.5 26.5 26.5C26.5 26.5 27 33 22.5 35.5C18 38 14 34.5 14 34.5C14 34.5 9.5 36.5 6 32.5C2.5 28.5 6.5 23.5 6.5 23.5C6.5 23.5 2.5 18 6 13C9.5 8 15 10 15 10C15 10 16.5 3 20 3Z"
        fill="#FF4B72"
        opacity="0.15"
      />
      {/* 5-Petal Sakura Flower */}
      <g transform="translate(20, 20)">
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <path
            key={i}
            transform={`rotate(${angle})`}
            d="M 0 0 C -5 -9, -7 -16, 0 -18 C 7 -16, 5 -9, 0 0 Z"
            fill="#FF4B72"
          />
        ))}
        <circle cx="0" cy="0" r="3.5" fill="#FFF5F7" />
        <circle cx="0" cy="0" r="2" fill="#FF8CA3" />
      </g>
    </svg>
  );
}

function HeroBannerIllustration() {
  return (
    <svg className="hero-banner-art" viewBox="0 0 500 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="500" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0F2FE" stopOpacity="0.8" />
          <stop offset="0.5" stopColor="#FCE7F3" stopOpacity="0.9" />
          <stop offset="1" stopColor="#F0F9FF" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="fujiGrad" x1="250" y1="80" x2="250" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93C5FD" stopOpacity="0.5" />
          <stop offset="1" stopColor="#C084FC" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#FF7E95" stopOpacity="0.4" />
          <stop offset="1" stopColor="#FFB1C1" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Sun glow */}
      <circle cx="360" cy="110" r="75" fill="url(#sunGrad)" />

      {/* Clouds */}
      <path d="M 50 70 Q 75 55 100 70 Q 120 70 130 85 Q 40 85 50 70 Z" fill="#FFFFFF" opacity="0.7" />
      <path d="M 380 50 Q 400 38 420 50 Q 435 50 445 62 Q 370 62 380 50 Z" fill="#FFFFFF" opacity="0.6" />

      {/* Mount Fuji */}
      <path d="M 240 220 L 330 100 Q 360 100 390 220 Z" fill="url(#fujiGrad)" />
      {/* Fuji Snow Cap */}
      <path d="M 330 100 Q 345 118 360 100 Q 375 125 390 220 L 330 100 Z" fill="#FFFFFF" opacity="0.85" />
      <path d="M 330 100 Q 345 125 350 130 Q 355 120 360 132 Q 370 120 390 220 L 240 220 Z" fill="#FFFFFF" opacity="0.6" />

      {/* Torii Gate Outline */}
      <g opacity="0.35" transform="translate(190, 140)">
        <rect x="10" y="20" width="6" height="55" fill="#F43F5E" />
        <rect x="44" y="20" width="6" height="55" fill="#F43F5E" />
        <rect x="0" y="15" width="60" height="7" rx="2" fill="#F43F5E" />
        <rect x="4" y="10" width="52" height="6" rx="2" fill="#BE123C" />
        <rect x="8" y="28" width="44" height="5" fill="#F43F5E" />
        <rect x="27" y="20" width="6" height="13" fill="#BE123C" />
      </g>

      {/* Japanese Pagoda Silhouette */}
      <g opacity="0.4" transform="translate(410, 110)">
        <path d="M 25 0 L 27 15 L 23 15 Z" fill="#475569" />
        <path d="M 10 20 L 40 20 L 35 15 L 15 15 Z" fill="#475569" />
        <rect x="17" y="20" width="16" height="12" fill="#475569" />
        <path d="M 5 35 L 45 35 L 40 32 L 10 32 Z" fill="#475569" />
        <rect x="14" y="35" width="22" height="15" fill="#475569" />
        <path d="M 0 53 L 50 53 L 44 50 L 6 50 Z" fill="#475569" />
        <rect x="10" y="53" width="30" height="25" fill="#475569" />
      </g>

      {/* Floating Sakura Petals */}
      <circle cx="120" cy="140" r="4" fill="#FF4B72" opacity="0.5" />
      <circle cx="210" cy="90" r="3" fill="#FF4B72" opacity="0.6" />
      <circle cx="450" cy="160" r="5" fill="#FF8CA3" opacity="0.7" />
      <circle cx="280" cy="60" r="3.5" fill="#FF4B72" opacity="0.4" />
      <circle cx="80" cy="180" r="4.5" fill="#FF8CA3" opacity="0.5" />
    </svg>
  );
}

function CourseCardArt({ type }: { type: 1 | 2 | 3 | 4 }) {
  if (type === 1) {
    // Pink Pagoda
    return (
      <svg width="100%" height="80" viewBox="0 0 160 80" fill="none">
        <rect width="160" height="80" fill="#FFF0F3" />
        <circle cx="130" cy="30" r="35" fill="#FECDD3" opacity="0.4" />
        <g transform="translate(20, 15)" fill="#F43F5E" opacity="0.25">
          <path d="M30 5L32 15H28Z" />
          <path d="M15 22L45 22L40 16H20Z" />
          <rect x="22" y="22" width="16" height="10" />
          <path d="M10 37L50 37L45 32H15Z" />
          <rect x="18" y="37" width="24" height="18" />
        </g>
        <circle cx="35" cy="55" r="3" fill="#F43F5E" opacity="0.4" />
        <circle cx="120" cy="20" r="4" fill="#FF8CA3" opacity="0.5" />
      </svg>
    );
  }
  if (type === 2) {
    // Blue Tokyo skyline
    return (
      <svg width="100%" height="80" viewBox="0 0 160 80" fill="none">
        <rect width="160" height="80" fill="#EFF6FF" />
        <circle cx="40" cy="40" r="30" fill="#DBEAFE" opacity="0.5" />
        <g transform="translate(90, 10)" fill="#3B82F6" opacity="0.25">
          <rect x="20" y="20" width="14" height="40" />
          <rect x="38" y="10" width="18" height="50" />
          <path d="M5 60L15 25L25 60Z" />
        </g>
      </svg>
    );
  }
  if (type === 3) {
    // Green Torii Gate
    return (
      <svg width="100%" height="80" viewBox="0 0 160 80" fill="none">
        <rect width="160" height="80" fill="#F0FDF4" />
        <circle cx="120" cy="50" r="35" fill="#DCFCE7" opacity="0.6" />
        <g transform="translate(30, 18)" fill="#10B981" opacity="0.3">
          <rect x="10" y="15" width="4" height="35" />
          <rect x="30" y="15" width="4" height="35" />
          <rect x="4" y="10" width="36" height="5" rx="1" />
          <rect x="8" y="20" width="28" height="3" />
        </g>
      </svg>
    );
  }
  // Orange Autumn
  return (
    <svg width="100%" height="80" viewBox="0 0 160 80" fill="none">
      <rect width="160" height="80" fill="#FFF7ED" />
      <circle cx="100" cy="30" r="30" fill="#FFEDD5" opacity="0.6" />
      <path d="M10 70 Q40 30 70 70 Z" fill="#F97316" opacity="0.2" />
      <path d="M50 70 Q80 20 110 70 Z" fill="#F97316" opacity="0.15" />
    </svg>
  );
}

function SidebarCatDecoration() {
  return (
    <div className="sidebar-cat-widget">
      <svg width="180" height="130" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sakura Branch */}
        <path d="M 0 30 C 50 20, 90 45, 140 15 C 160 5, 180 10, 200 0" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
        <path d="M 70 28 C 90 10, 110 5, 125 0" stroke="#78350F" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        <path d="M 120 20 C 135 30, 150 35, 165 30" stroke="#78350F" strokeWidth="2" strokeLinecap="round" opacity="0.3" />

        {/* Sakura Flowers on Branch */}
        <circle cx="65" cy="24" r="7" fill="#FF8CA3" opacity="0.8" />
        <circle cx="65" cy="24" r="3" fill="#FFF" />
        <circle cx="100" cy="12" r="8" fill="#FF4B72" opacity="0.85" />
        <circle cx="100" cy="12" r="3.5" fill="#FFF" />
        <circle cx="140" cy="15" r="7.5" fill="#FF8CA3" opacity="0.8" />
        <circle cx="140" cy="15" r="3" fill="#FFF" />
        <circle cx="155" cy="32" r="6" fill="#FF4B72" opacity="0.75" />
        <circle cx="180" cy="8" r="7" fill="#FF8CA3" opacity="0.8" />

        {/* Cute Neko / Kitten Sitting */}
        <g transform="translate(60, 45)">
          {/* Tail */}
          <path d="M 75 75 Q 95 70 90 50 Q 85 45 80 52" stroke="#475569" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Body */}
          <ellipse cx="50" cy="65" rx="28" ry="24" fill="#FFFFFF" stroke="#334155" strokeWidth="3.5" />
          {/* Paws */}
          <ellipse cx="36" cy="84" rx="8" ry="5" fill="#FFFFFF" stroke="#334155" strokeWidth="3" />
          <ellipse cx="64" cy="84" rx="8" ry="5" fill="#FFFFFF" stroke="#334155" strokeWidth="3" />
          {/* Head */}
          <circle cx="50" cy="38" r="25" fill="#FFFFFF" stroke="#334155" strokeWidth="3.5" />
          {/* Ears */}
          <path d="M 30 24 L 20 4 L 40 17 Z" fill="#FFFFFF" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
          <path d="M 31 22 L 24 9 L 38 18 Z" fill="#FFB1C1" />
          <path d="M 70 24 L 80 4 L 60 17 Z" fill="#FFFFFF" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
          <path d="M 69 22 L 76 9 L 62 18 Z" fill="#FFB1C1" />
          {/* Eyes (Happy Closed Curves) */}
          <path d="M 37 36 Q 42 30 46 36" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 54 36 Q 58 30 63 36" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Nose & Mouth */}
          <polygon points="50,40 48,42 52,42" fill="#FF7E95" />
          <path d="M 46 44 Q 50 47 54 44" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Cheeks */}
          <ellipse cx="34" cy="40" rx="5" ry="3" fill="#FFB1C1" opacity="0.7" />
          <ellipse cx="66" cy="40" rx="5" ry="3" fill="#FFB1C1" opacity="0.7" />
          {/* Open Japanese Book */}
          <path d="M 28 72 Q 50 68 50 78 Q 50 68 72 72 L 72 84 Q 50 80 50 86 Q 50 80 28 84 Z" fill="#FFEFF3" stroke="#F43F5E" strokeWidth="2" />
        </g>
      </svg>
      <div className="cat-japanese-text">がんばりましょう</div>
    </div>
  );
}

function MotivationCatArt() {
  return (
    <svg width="90" height="90" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkles / Blossoms */}
      <circle cx="20" cy="25" r="4" fill="#FF4B72" opacity="0.6" />
      <circle cx="105" cy="30" r="5" fill="#FF8CA3" opacity="0.7" />
      <circle cx="15" cy="85" r="3" fill="#FF8CA3" opacity="0.5" />

      {/* Cute White Neko with Bow */}
      <g transform="translate(10, 10)">
        <ellipse cx="50" cy="65" rx="26" ry="22" fill="#FFFFFF" stroke="#334155" strokeWidth="3" />
        <circle cx="50" cy="38" r="24" fill="#FFFFFF" stroke="#334155" strokeWidth="3" />
        {/* Left Ear */}
        <path d="M 31 23 L 20 4 L 41 16 Z" fill="#FFFFFF" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
        <path d="M 32 21 L 24 8 L 39 17 Z" fill="#FFB1C1" />
        {/* Right Ear */}
        <path d="M 69 23 L 80 4 L 59 16 Z" fill="#FFFFFF" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
        <path d="M 68 21 L 76 8 L 61 17 Z" fill="#FFB1C1" />
        {/* Ribbon Bow on Ear */}
        <path d="M 23 15 Q 15 10 20 22 Q 25 18 23 15 Z" fill="#F43F5E" />
        <path d="M 23 15 Q 31 10 26 22 Q 21 18 23 15 Z" fill="#F43F5E" />
        <circle cx="23" cy="15" r="3.5" fill="#FFF" />

        {/* Eyes (Sparkling Big Eyes) */}
        <ellipse cx="40" cy="36" rx="4" ry="5.5" fill="#334155" />
        <circle cx="38.5" cy="34" r="1.8" fill="#FFF" />
        <ellipse cx="60" cy="36" rx="4" ry="5.5" fill="#334155" />
        <circle cx="58.5" cy="34" r="1.8" fill="#FFF" />

        {/* Cute Mouth */}
        <path d="M 46 43 Q 50 46 54 43" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Rosy Cheeks */}
        <ellipse cx="33" cy="41" rx="5" ry="3" fill="#FFB1C1" opacity="0.8" />
        <ellipse cx="67" cy="41" rx="5" ry="3" fill="#FFB1C1" opacity="0.8" />

        {/* Raised Paw Wave */}
        <ellipse cx="74" cy="55" rx="6" ry="9" fill="#FFFFFF" stroke="#334155" strokeWidth="2.5" transform="rotate(25 74 55)" />
      </g>
    </svg>
  );
}

function ProgressDonutSvg({ percentage }: { percentage: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="donut-chart-wrapper">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#0D9488"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="donut-percentage">{percentage}%</div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useCurrentUser();
  const { mutate: logout } = useLogout();

  const [activeTab, setActiveTab] = useState("trang-chu");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const displayName = user?.username ?? user?.email ?? "";
  const userName = isAuthenticated ? (displayName ? displayName : "Học viên") : "Khách";
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : "H";
  const normalizedRole = user?.role?.trim().toUpperCase();
  const normalizedRoleId = String(user?.roleId ?? "");
  const isAdmin = normalizedRoleId === "1" || normalizedRole === "ADMIN" || normalizedRole === "ROLE_ADMIN";

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="dekiru-app-container">
      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className="dekiru-sidebar">
        <div className="sidebar-brand" onClick={() => navigate("/home")}>
          <DekiruLogoIcon />
          <div className="brand-titles">
            <span className="dekiru-brand-name">Dekiru</span>
            <span className="dekiru-brand-sub">できる</span>
          </div>
        </div>
        <div className="sidebar-tagline">Luyện tiếng Nhật cùng Dekiru</div>

        <nav className="sidebar-nav-menu">
          <button
            type="button"
            className={`nav-link-btn ${activeTab === "trang-chu" ? "active" : ""}`}
            onClick={() => setActiveTab("trang-chu")}
          >
            <span className="nav-link-icon">🌸</span>
            <span className="nav-link-text">Trang chủ</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "bai-hoc" ? "active" : ""}`}
            onClick={() => setActiveTab("bai-hoc")}
          >
            <span className="nav-link-icon">📖</span>
            <span className="nav-link-text">Bài học</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "tu-vung" ? "active" : ""}`}
            onClick={() => setActiveTab("tu-vung")}
          >
            <span className="nav-link-icon">🎴</span>
            <span className="nav-link-text">Từ vựng</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "ngu-phap" ? "active" : ""}`}
            onClick={() => setActiveTab("ngu-phap")}
          >
            <span className="nav-link-icon">📑</span>
            <span className="nav-link-text">Ngữ pháp</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "luyen-de" ? "active" : ""}`}
            onClick={() => setActiveTab("luyen-de")}
          >
            <span className="nav-link-icon">📝</span>
            <span className="nav-link-text">Luyện đề</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "thong-ke" ? "active" : ""}`}
            onClick={() => setActiveTab("thong-ke")}
          >
            <span className="nav-link-icon">📊</span>
            <span className="nav-link-text">Thống kê</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn ${activeTab === "cai-dat" ? "active" : ""}`}
            onClick={() => setActiveTab("cai-dat")}
          >
            <span className="nav-link-icon">⚙️</span>
            <span className="nav-link-text">Cài đặt</span>
          </button>

          {/* ADMIN PORTAL SPECIAL ITEM (Only visible if user has ADMIN privileges) */}
          {isAdmin && (
            <div className="admin-nav-wrapper">
              <div className="nav-divider" />
              <button
                type="button"
                className="nav-link-btn admin-portal-btn"
                onClick={() => navigate("/admin")}
                title="Truy cập Trang quản trị Admin"
              >
                <span className="nav-link-icon">🛠️</span>
                <span className="nav-link-text">Quản trị Admin</span>
                <span className="admin-badge-pill">ADMIN</span>
              </button>
            </div>
          )}
        </nav>

        {/* Bottom Sidebar Decorative Illustration */}
        <SidebarCatDecoration />
      </aside>

      {/* RIGHT WORKSPACE AREA */}
      <div className="dekiru-main-area">
        {/* TOP HEADER BAR */}
        <header className="dekiru-topbar">
          <div className="topbar-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm bài học, từ vựng, ngữ pháp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="topbar-actions">
            {/* Notification Bell */}
            <button type="button" className="icon-btn notif-btn" title="Thông báo">
              <span className="bell-icon">🔔</span>
              <span className="notif-badge-dot" />
            </button>

            {/* User Profile Menu */}
            <div className="user-profile-wrapper" ref={profileRef}>
              <button
                type="button"
                className="user-profile-trigger"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="user-avatar-circle">{avatarInitial}</div>
                <span className="user-display-name">{userName}</span>
                <span className={`dropdown-arrow ${isProfileOpen ? "open" : ""}`}>▾</span>
              </button>

              {isProfileOpen && (
                <div className="profile-dropdown-card">
                  <div className="dropdown-user-header">
                    <div className="dropdown-user-name">{displayName || "Học viên"}</div>
                    <div className="dropdown-user-email">{user?.email || "user@jtech.edu.vn"}</div>
                    {isAdmin && <span className="admin-role-badge">ADMIN SYSTEM</span>}
                  </div>

                  <div className="dropdown-menu-list">
                    {isAdmin && (
                      <button
                        type="button"
                        className="dropdown-item admin-item"
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate("/admin");
                        }}
                      >
                        🛠️ Quản trị Admin
                      </button>
                    )}

                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate("/profile");
                      }}
                    >
                      👤 Hồ sơ cá nhân
                    </button>

                    <button
                      type="button"
                      className="dropdown-item logout-item"
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT GRID */}
        <main className="dekiru-content-grid">
          {/* MAIN COLUMN (LEFT SIDE OF WORKSPACE) */}
          <div className="dekiru-left-workspace">
            {/* HERO BANNER SECTION */}
            <section className="dekiru-hero-banner">
              <HeroBannerIllustration />
              <div className="hero-banner-content">
                <div className="hero-jp-script">できる、を一緒に。</div>
                <h1 className="hero-heading">Chinh phục tiếng Nhật cùng Dekiru!</h1>
                <p className="hero-subtext">
                  Học theo giáo trình Dekiru - từng bước vững chắc, hiệu quả và thú vị hơn mỗi ngày.
                </p>
                <button
                  type="button"
                  className="hero-cta-button"
                  onClick={() => navigate("/profile")}
                >
                  <span className="play-icon">▶</span> Bắt đầu học ngay
                </button>
              </div>
            </section>

            {/* SECTION 1: CHỌN BÀI HỌC THEO GIÁO TRÌNH DEKIRU */}
            <section className="workspace-section">
              <div className="section-header-bar">
                <h2 className="section-heading">
                  <span className="section-heading-icon">📖</span> Chọn bài học theo giáo trình Dekiru
                </h2>
                <button type="button" className="see-all-btn">
                  Xem tất cả <span className="arrow">→</span>
                </button>
              </div>

              <div className="course-cards-grid">
                {/* CARD 1: Dekiru 1 */}
                <div className="course-card pink-card">
                  <div className="card-art-box">
                    <CourseCardArt type={1} />
                  </div>
                  <div className="course-card-body">
                    <h3 className="course-title">Dekiru 1</h3>
                    <div className="course-level">Sơ cấp (A1)</div>
                    <div className="course-progress-wrapper">
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill pink-fill" style={{ width: "50%" }} />
                      </div>
                      <div className="course-progress-info">
                        <span className="progress-text">6 / 12 bài</span>
                        <button type="button" className="circle-arrow-btn pink-btn" title="Vào bài học">
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Dekiru 2 */}
                <div className="course-card blue-card">
                  <div className="card-art-box">
                    <CourseCardArt type={2} />
                  </div>
                  <div className="course-card-body">
                    <h3 className="course-title">Dekiru 2</h3>
                    <div className="course-level">Sơ cấp (A2)</div>
                    <div className="course-progress-wrapper">
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill blue-fill" style={{ width: "25%" }} />
                      </div>
                      <div className="course-progress-info">
                        <span className="progress-text">3 / 12 bài</span>
                        <button type="button" className="circle-arrow-btn blue-btn" title="Vào bài học">
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 3: Dekiru 3 */}
                <div className="course-card green-card">
                  <div className="card-art-box">
                    <CourseCardArt type={3} />
                  </div>
                  <div className="course-card-body">
                    <h3 className="course-title">Dekiru 3</h3>
                    <div className="course-level">Trung cấp (B1)</div>
                    <div className="course-progress-wrapper">
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill green-fill" style={{ width: "0%" }} />
                      </div>
                      <div className="course-progress-info">
                        <span className="progress-text">0 / 12 bài</span>
                        <button type="button" className="circle-arrow-btn green-btn" title="Vào bài học">
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: Dekiru 4 */}
                <div className="course-card orange-card">
                  <div className="card-art-box">
                    <CourseCardArt type={4} />
                  </div>
                  <div className="course-card-body">
                    <h3 className="course-title">Dekiru 4</h3>
                    <div className="course-level">Trung cấp (B2)</div>
                    <div className="course-progress-wrapper">
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill orange-fill" style={{ width: "0%" }} />
                      </div>
                      <div className="course-progress-info">
                        <span className="progress-text">0 / 12 bài</span>
                        <button type="button" className="circle-arrow-btn orange-btn" title="Vào bài học">
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: TÍNH NĂNG NỔI BẬT */}
            <section className="workspace-section">
              <div className="section-header-bar">
                <h2 className="section-heading">
                  <span className="section-heading-icon">⭐</span> Tính năng nổi bật
                </h2>
              </div>

              <div className="features-cards-grid">
                {/* FEATURE 1: Từ vựng */}
                <div className="feature-item-card pink-feature">
                  <div className="feature-icon-badge pink-bg">📕</div>
                  <h3 className="feature-card-title">Từ vựng</h3>
                  <p className="feature-card-desc">
                    Học từ mới theo từng bài học, kèm phát âm và ví dụ minh họa.
                  </p>
                  <button type="button" className="circle-arrow-btn pink-btn feature-arrow">
                    →
                  </button>
                </div>

                {/* FEATURE 2: Ngữ pháp */}
                <div className="feature-item-card blue-feature">
                  <div className="feature-icon-badge blue-bg">📄</div>
                  <h3 className="feature-card-title">Ngữ pháp</h3>
                  <p className="feature-card-desc">
                    Giải thích chi tiết, dễ hiểu, kèm bài tập thực hành.
                  </p>
                  <button type="button" className="circle-arrow-btn blue-btn feature-arrow">
                    →
                  </button>
                </div>

                {/* FEATURE 3: Luyện đề */}
                <div className="feature-item-card green-feature">
                  <div className="feature-icon-badge green-bg">📋</div>
                  <h3 className="feature-card-title">Luyện đề</h3>
                  <p className="feature-card-desc">
                    Làm bài tập theo từng kỹ năng (Nghe - Đọc - Viết - Nói).
                  </p>
                  <button type="button" className="circle-arrow-btn green-btn feature-arrow">
                    →
                  </button>
                </div>

                {/* FEATURE 4: Thống kê */}
                <div className="feature-item-card purple-feature">
                  <div className="feature-icon-badge purple-bg">📈</div>
                  <h3 className="feature-card-title">Thống kê</h3>
                  <p className="feature-card-desc">
                    Theo dõi tiến độ học tập, đánh giá năng lực của bạn.
                  </p>
                  <button type="button" className="circle-arrow-btn purple-btn feature-arrow">
                    →
                  </button>
                </div>
              </div>
            </section>

            {/* SECTION 3: BÀI HỌC GẦN ĐÂY */}
            <section className="workspace-section">
              <div className="section-header-bar">
                <h2 className="section-heading">
                  <span className="section-heading-icon">📖</span> Bài học gần đây
                </h2>
                <button type="button" className="see-all-btn">
                  Xem tất cả <span className="arrow">→</span>
                </button>
              </div>

              <div className="recent-lesson-banner-card">
                <div className="recent-lesson-left">
                  <div className="lesson-thumb-box">
                    <CourseCardArt type={1} />
                    <div className="thumb-info-overlay">
                      <span className="thumb-title">Dekiru 1</span>
                      <span className="thumb-sub">Bài 6 かぞく</span>
                      <span className="learning-badge">Đang học</span>
                    </div>
                  </div>
                </div>

                <div className="recent-lesson-right">
                  <h3 className="recent-lesson-title">Từ vựng: Gia đình</h3>
                  <p className="recent-lesson-desc">Học 15 từ vựng mới trong bài 6</p>
                </div>

                <button type="button" className="circle-arrow-btn blue-btn recent-arrow" title="Tiếp tục học">
                  →
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT SIDEBAR WIDGETS PANEL */}
          <aside className="dekiru-widgets-column">
            {/* WIDGET 1: TIẾN ĐỘ HỌC TẬP */}
            <div className="widget-card">
              <h3 className="widget-title">
                <span className="widget-icon">🎯</span> Tiến độ học tập
              </h3>

              <div className="progress-donut-container">
                <ProgressDonutSvg percentage={42} />
                <div className="donut-side-info">
                  <div className="current-lesson-label">Bài học hiện tại</div>
                  <div className="current-lesson-name">Dekiru 1 - Bài 6</div>
                  <div className="current-lesson-jp">だい6か かぞく</div>
                </div>
              </div>

              <div className="widget-progress-breakdown">
                {/* Item 1: Từ vựng */}
                <div className="breakdown-row">
                  <div className="breakdown-header">
                    <span className="breakdown-label">
                      <span className="dot green-dot" /> Từ vựng
                    </span>
                    <span className="breakdown-val">32 / 68</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-fill green-bg-fill" style={{ width: "47%" }} />
                  </div>
                </div>

                {/* Item 2: Ngữ pháp */}
                <div className="breakdown-row">
                  <div className="breakdown-header">
                    <span className="breakdown-label">
                      <span className="dot blue-dot" /> Ngữ pháp
                    </span>
                    <span className="breakdown-val">12 / 18</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-fill blue-bg-fill" style={{ width: "66%" }} />
                  </div>
                </div>

                {/* Item 3: Luyện đề */}
                <div className="breakdown-row">
                  <div className="breakdown-header">
                    <span className="breakdown-label">
                      <span className="dot purple-dot" /> Luyện đề
                    </span>
                    <span className="breakdown-val">3 / 6</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-fill purple-bg-fill" style={{ width: "50%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* WIDGET 2: MOTIVATION CARD WITH CAT */}
            <div className="widget-card motivation-card">
              <div className="motivation-left">
                <div className="motivation-jp-title">一歩ずつ、がんばろう！</div>
                <div className="motivation-vi-desc">Cố lên! Bạn đang làm rất tốt!</div>
              </div>
              <MotivationCatArt />
            </div>

            {/* WIDGET 3: THÀNH TÍCH */}
            <div className="widget-card">
              <div className="widget-header-row">
                <h3 className="widget-title">
                  <span className="widget-icon">🏆</span> Thành tích
                </h3>
                <button type="button" className="see-all-small">
                  Xem tất cả →
                </button>
              </div>

              <div className="achievements-badges-list">
                <div className="badge-item">
                  <div className="badge-icon-shield green-shield">⭐</div>
                  <span className="badge-label-text">Hoàn thành bài học đầu tiên</span>
                </div>

                <div className="badge-item">
                  <div className="badge-icon-shield blue-shield">⭐</div>
                  <span className="badge-label-text">Học 10 từ vựng</span>
                </div>

                <div className="badge-item">
                  <div className="badge-icon-shield purple-shield">⭐</div>
                  <span className="badge-label-text">Luyện đề đạt 80%</span>
                </div>
              </div>
            </div>

            {/* WIDGET 4: ĐỌC THÊM */}
            <div className="widget-card read-more-card">
              <h3 className="widget-title">
                <span className="widget-icon">📖</span> Đọc thêm
              </h3>
              <a href="#about-dekiru" className="read-more-link" onClick={(e) => e.preventDefault()}>
                Giới thiệu về giáo trình Dekiru <span className="arrow">→</span>
              </a>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
