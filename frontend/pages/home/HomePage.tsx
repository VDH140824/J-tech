import { useNavigate } from "react-router-dom";
import bannerCatImg from "../../assets/banner-cat.png";
import "./HomePage.css";

// Graphic Component for Hero Banner
function HeroBannerIllustration() {
  return (
    <img
      src={bannerCatImg}
      alt="Dekiru cat banner illustration"
      className="hero-banner-art"
    />
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

  return (
    <div className="dekiru-content-grid">
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
    </div>
  );
}
