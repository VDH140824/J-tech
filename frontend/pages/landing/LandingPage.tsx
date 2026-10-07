import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

import cyberBanner1 from "../../assets/banner/cyber-banner1.jpg";
import cyberBanner2 from "../../assets/banner/cyber-banner2.jpg";
import cyberCoder from "../../assets/cyber-coder.jpg";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const practiceCards = [
  {
    icon: "あ",
    title: "Từ vựng",
    subtitle: "Vocabulary",
    description: "Luyện tập từ vựng tiếng Nhật theo chủ đề và cấp độ, gắn liền với ngữ cảnh thực tế ngành IT.",
    color: "#38BDF8",
    glow: "rgba(56, 189, 248, 0.4)",
  },
  {
    icon: "文",
    title: "Ngữ pháp",
    subtitle: "Grammar",
    description: "Ôn tập và luyện tập ngữ pháp qua các bài tập có cấu trúc rõ ràng, thực tế trong dự án phần mềm.",
    color: "#A855F7",
    glow: "rgba(168, 85, 247, 0.4)",
  },
  {
    icon: "漢",
    title: "Hán tự",
    subtitle: "Kanji Chuyên ngành",
    description: "Luyện tập và ghi nhớ Kanji theo bộ thủ, nét viết và ý nghĩa trong tài liệu kỹ thuật IT.",
    color: "#F97316",
    glow: "rgba(249, 115, 22, 0.4)",
  },
  {
    icon: "🎧",
    title: "Luyện nghe",
    subtitle: "Listening Lab",
    description: "Luyện nghe hiểu tiếng Nhật qua các đoạn hội thoại họp dự án, Standup Meeting và đời sống.",
    color: "#10B981",
    glow: "rgba(16, 185, 129, 0.4)",
  },
  {
    icon: "📖",
    title: "Luyện đọc",
    subtitle: "Reading Specs",
    description: "Luyện đọc hiểu tiếng Nhật qua tài liệu đặc tả yêu cầu (SRS), task ticket và tài liệu chuyên ngành.",
    color: "#F59E0B",
    glow: "rgba(245, 158, 11, 0.4)",
  },
  {
    icon: "🎤",
    title: "Luyện nói",
    subtitle: "Speaking Practice",
    description: "Thực hành nói và giao tiếp tiếng Nhật, rèn phát âm, phản xạ và ngữ điệu tự nhiên chuẩn Nhật.",
    color: "#EC4899",
    glow: "rgba(236, 72, 153, 0.4)",
  },
  {
    icon: "🎮",
    title: "Trò chơi học tập",
    subtitle: "Practice Games",
    description: "Củng cố kiến thức qua các mini-game tương tác hấp dẫn, tăng phản xạ từ vựng và Kanji.",
    color: "#06B6D4",
    glow: "rgba(6, 182, 212, 0.4)",
  },
  {
    icon: "🤖",
    title: "Luyện nói với AI",
    subtitle: "AI Speaking Bot",
    description: "Thực hành hội thoại với trợ lý AI thông minh, nhận phân tích phát âm và chỉnh sửa thời gian thực.",
    color: "#6366F1",
    glow: "rgba(99, 102, 241, 0.4)",
  },
];

const benefits = [
  {
    icon: "📅",
    title: "Phù hợp lịch học IT",
    description: "Được thiết kế linh hoạt phù hợp với cường độ code và lịch học dày của sinh viên IT FPT University.",
  },
  {
    icon: "📝",
    title: "Luyện tập theo từng bài",
    description: "Nội dung chia theo lộ trình từng sprint rõ ràng, dễ theo dõi và luyện tập có hệ thống.",
  },
  {
    icon: "🧩",
    title: "Chia nhỏ kiến thức",
    description: "Từ vựng, ngữ pháp, Kanji được module hóa thành các micro-lessons dễ tiếp thu và ôn luyện.",
  },
  {
    icon: "🔄",
    title: "Ôn tập chủ động",
    description: "Hệ thống thuật toán lặp lại ngắt quãng (Spaced Repetition) thông minh giúp ghi nhớ lâu bền.",
  },
  {
    icon: "📊",
    title: "Theo dõi tiến độ thông minh",
    description: "Dashboard trực quan với biểu đồ phân tích thời gian thực giúp bạn kiểm soát mục tiêu học tập.",
  },
  {
    icon: "🤖",
    title: "AI tương tác giọng nói",
    description: "Áp dụng công nghệ nhận diện giọng nói AI tiên tiến để luyện phát âm chuẩn người bản xứ.",
  },
];

const banners = [cyberBanner1, cyberBanner2];

const navLinks = [
  { label: "Trang chủ", href: "#top" },
  { label: "Tính năng", href: "#features" },
  { label: "Lợi ích", href: "#benefits" },
  { label: "Về J-Tech", href: "#about" },
];

/* ─── Banner Component ──────────────────────────────────────────────────── */

function BannerSlider() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startInterval = () => {
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
  };

  useEffect(() => {
    startInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const goTo = (idx: number) => {
    setCurrent(idx);
    if (intervalRef.current) clearInterval(intervalRef.current);
    startInterval();
  };

  return (
    <div className="banner-slider" aria-label="Banner quảng bá J-Tech">
      <div
        className="banner-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((src, i) => (
          <div className="banner-slide" key={i}>
            <img src={src} alt={`Banner J-Tech Cyber ${i + 1}`} className="banner-img" />
            <div className="banner-overlay-gradient" />
          </div>
        ))}
      </div>
      <div className="banner-dots">
        {banners.map((_, i) => (
          <button
            key={i}
            className={`banner-dot${i === current ? " active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Chuyển sang banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Ambient Cyber Background Elements ─────────────────────────────────── */

function CyberAmbient() {
  return (
    <div className="cyber-ambient" aria-hidden="true">
      {/* Tech Grid */}
      <div className="cyber-grid" />

      {/* Floating Glowing Orbs */}
      <div className="cyber-glow cyber-glow--cyan" />
      <div className="cyber-glow cyber-glow--purple" />
      <div className="cyber-glow cyber-glow--orange" />

      {/* Ambient Code Lines */}
      <div className="cyber-code cyber-code--1">
        <code>{"const ano = \"JavaScript\";\nwarding: <errinc>;\nopclude <string>;\npclude <string>;"}</code>
      </div>
      <div className="cyber-code cyber-code--2">
        <code>{"int main() {\n  public defating func() {\n    const k = ...\n    codenitite array(o...;\n    if (dn == 0) {\n      system.out.println(\"J-Tech\");\n    }\n  }\n}"}</code>
      </div>
      <div className="cyber-code cyber-code--3">
        <code>{"public antsole ga array(fano) {\n  asskats<tnct\"cebc...;\n  continue.get\"affi...;\n  console.string;\n}"}</code>
      </div>

      {/* Ambient Binary Matrix Columns */}
      <div className="cyber-binary cyber-binary--1">
        <span>1001010</span>
        <span>0101001</span>
        <span>1100101</span>
        <span>0011010</span>
      </div>
      <div className="cyber-binary cyber-binary--2">
        <span>0110100</span>
        <span>1001011</span>
        <span>1110001</span>
      </div>

      {/* Floating Japanese Kanji */}
      <div className="cyber-kanji cyber-kanji--1">開発</div>
      <div className="cyber-kanji cyber-kanji--2">情報</div>
      <div className="cyber-kanji cyber-kanji--3">技術</div>
      <div className="cyber-kanji cyber-kanji--4">日本語</div>
      <div className="cyber-kanji cyber-kanji--5">未来</div>
      <div className="cyber-kanji cyber-kanji--6">知能</div>

      {/* Sparkling Stars */}
      <div className="cyber-star cyber-star--1">✦</div>
      <div className="cyber-star cyber-star--2">✦</div>
      <div className="cyber-star cyber-star--3">✧</div>
      <div className="cyber-star cyber-star--4">✦</div>
      <div className="cyber-star cyber-star--5">✧</div>
    </div>
  );
}

/* ─── Main Landing Page ─────────────────────────────────────────────────── */

export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("#top");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      const sections = ["#top", "#features", "#benefits", "#about"];
      const scrollPos = window.scrollY + 200;
      for (const s of sections) {
        if (s === "#top") continue;
        const el = document.querySelector(s);
        if (el && el instanceof HTMLElement) {
          if (scrollPos >= el.offsetTop && scrollPos < el.offsetTop + el.offsetHeight) {
            setActiveTab(s);
            return;
          }
        }
      }
      if (window.scrollY < 300) {
        setActiveTab("#top");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    setActiveTab(href);
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="lp-root" id="top">
      {/* Global Ambient Cyber Layer */}
      <CyberAmbient />

      {/* ── Navbar ── */}
      <header className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <button className="lp-logo" onClick={() => scrollTo("#top")} type="button">
            <span className="lp-logo-mark">
              <span className="lp-bracket">&#123;</span>
              <span className="lp-j">J</span>
              <span className="lp-bracket">&#125;</span>
            </span>
            <span className="lp-logo-text">
              J-Tech <span className="lp-logo-kanji">技</span>
            </span>
          </button>

          <nav className="lp-nav-links" aria-label="Điều hướng chính">
            {navLinks.map((l) => (
              <button
                key={l.label}
                className={`lp-nav-link${activeTab === l.href ? " lp-nav-link--active" : ""}`}
                onClick={() => scrollTo(l.href)}
                type="button"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <button className="lp-nav-cta" onClick={() => navigate("/login")} type="button">
            <span>Cùng nhau khám phá</span>
            <span className="lp-nav-cta-arrow">›</span>
          </button>

          <button
            className="lp-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            type="button"
            aria-label="Mở menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {menuOpen && (
          <div className="lp-mobile-menu">
            {navLinks.map((l) => (
              <button
                key={l.label}
                className={`lp-mobile-link${activeTab === l.href ? " lp-mobile-link--active" : ""}`}
                onClick={() => scrollTo(l.href)}
                type="button"
              >
                {l.label}
              </button>
            ))}
            <button className="lp-nav-cta lp-mobile-cta" onClick={() => navigate("/login")} type="button">
              <span>Cùng nhau khám phá</span>
              <span className="lp-nav-cta-arrow">›</span>
            </button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero" aria-label="Giới thiệu J-Tech">
        <div className="lp-hero-content">
          {/* Left Column */}
          <div className="lp-hero-left">
            <div className="lp-eyebrow">
              <span className="lp-eyebrow-dot" />
              <span>DÀNH RIÊNG CHO SINH VIÊN IT - FPT UNIVERSITY</span>
              <span className="lp-eyebrow-icon">💻</span>
            </div>

            <h1 className="lp-hero-heading">
              Luyện tập tiếng <br className="lp-hero-br" />
              Nhật <span className="lp-neon-kanji">技</span> <br />
              hiệu quả cùng J-Tech <span className="lp-neon-it">IT</span>
            </h1>

            <div className="lp-hero-desc-list">
              <div className="lp-hero-desc-item">
                <span className="lp-bullet-dot" />
                <p>
                  Nền tảng luyện tập tiếng Nhật dành cho sinh viên IT tại FPT University, tiếng Nhật IT, giao tiếp để dự án, thuật ngữ chuyên ngành.
                </p>
              </div>
              <div className="lp-hero-desc-item">
                <span className="lp-bullet-dot" />
                <p>
                  Luyện tập từ vựng, ngữ pháp, Kanji, nghe, đọc và nói theo cách trực quan, chủ động và phù hợp với hành trình học tập của sinh viên IT.
                </p>
              </div>
            </div>

            <div className="lp-hero-actions">
              <button
                id="hero-cta"
                className="lp-cta-btn lp-cta-btn--cyber"
                onClick={() => navigate("/login")}
                type="button"
              >
                <span>Cùng nhau khám phá</span>
                <span className="lp-cta-arrow" aria-hidden="true">→</span>
              </button>
            </div>

            <div className="lp-hero-stats">
              <div className="lp-stat-cyber">
                <div className="lp-stat-icon-wrap">
                  <span className="lp-stat-num">8+</span>
                  <span className="lp-stat-badge-icon">🥋</span>
                </div>
                <span className="lp-stat-label">Kỹ năng luyện tập</span>
              </div>

              <div className="lp-stat-cyber">
                <div className="lp-stat-icon-wrap">
                  <span className="lp-stat-num lp-stat-ai">AI</span>
                  <span className="lp-stat-badge-icon">🤖</span>
                </div>
                <span className="lp-stat-label">Hỗ trợ luyện nói</span>
              </div>

              <div className="lp-stat-cyber">
                <div className="lp-stat-icon-wrap">
                  <span className="lp-stat-num lp-stat-fpt">FPT</span>
                  <span className="lp-stat-badge-icon">🎓</span>
                </div>
                <span className="lp-stat-label">University</span>
              </div>
            </div>
          </div>

          {/* Right Column – Interactive Cyber HUD */}
          <div className="lp-hero-right" aria-hidden="true">
            {/* Main Cyber Card */}
            <div className="lp-hero-card lp-hero-card--cyber">
              {/* Card Header */}
              <div className="lp-hero-card-header">
                <div className="lp-practice-badge">J-Tech</div>
                <span className="lp-practice-label">Luyện tập hôm nay</span>
                
                {/* Audio Wave Visualizer */}
                <div className="lp-soundwave">
                  <span /><span /><span /><span /><span /><span />
                </div>

                {/* Cyber Radar */}
                <div className="lp-radar">
                  <div className="lp-radar-sweep" />
                  <div className="lp-radar-ring lp-radar-ring--1" />
                  <div className="lp-radar-ring lp-radar-ring--2" />
                </div>
              </div>

              {/* Progress Bars */}
              <div className="lp-progress-list">
                <div className="lp-progress-item">
                  <div className="lp-progress-top">
                    <span>Từ vựng N3 (IT)</span>
                    <span className="lp-progress-pct lp-progress-pct--orange">78%</span>
                  </div>
                  <div className="lp-progress-bar">
                    <div className="lp-progress-fill lp-progress-fill--orange" style={{ width: "78%" }} />
                  </div>
                </div>

                <div className="lp-progress-item">
                  <div className="lp-progress-top">
                    <span>Kanji 漢字 (Chuyên ngành)</span>
                    <span className="lp-progress-pct lp-progress-pct--pink">54%</span>
                  </div>
                  <div className="lp-progress-bar">
                    <div className="lp-progress-fill lp-progress-fill--pink" style={{ width: "54%" }} />
                  </div>
                </div>

                <div className="lp-progress-item">
                  <div className="lp-progress-top">
                    <span>Ngữ pháp (Dự án)</span>
                    <span className="lp-progress-pct lp-progress-pct--purple">91%</span>
                  </div>
                  <div className="lp-progress-bar">
                    <div className="lp-progress-fill lp-progress-fill--purple" style={{ width: "91%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Circuit Traces & Microchip Connection */}
            <div className="lp-circuit-block">
              {/* Kanji Card */}
              <div className="lp-hero-card lp-hero-card--chip-badge">
                <span className="lp-jp-char">日</span>
                <div className="lp-jp-info">
                  <div className="lp-jp-word">にほんご</div>
                  <div className="lp-jp-meaning">Tiếng Nhật</div>
                </div>
              </div>

              {/* PCB Circuit Trace SVG */}
              <div className="lp-circuit-svg">
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
                  <path d="M 0 20 H 40 L 60 5 H 100 L 120 20" stroke="rgba(56, 189, 248, 0.7)" strokeWidth="2" strokeDasharray="3 3" />
                  <circle cx="10" cy="20" r="3" fill="#38BDF8" />
                  <circle cx="60" cy="5" r="3" fill="#00F0FF" />
                  <circle cx="110" cy="20" r="3" fill="#38BDF8" />
                </svg>
              </div>

              {/* Cyber Microchip */}
              <div className="lp-microchip">
                <div className="lp-microchip-inner">
                  <span className="lp-chip-label">にほんご</span>
                  <div className="lp-chip-glow" />
                </div>
                <div className="lp-chip-pins lp-chip-pins--left">
                  <i /><i /><i />
                </div>
                <div className="lp-chip-pins lp-chip-pins--right">
                  <i /><i /><i />
                </div>
              </div>
            </div>

            {/* Streak Badge */}
            <div className="lp-hero-card lp-hero-card--streak">
              <span className="lp-streak-fire">🔥</span>
              <span className="lp-streak-text">
                <strong>7 ngày</strong> luyện tập liên tiếp
              </span>
              <span className="lp-streak-chain">⛓️</span>
            </div>

            {/* 3D Cyber Anime Coder & Robot Illustration */}
            <div className="lp-coder-visual">
              <div className="lp-coder-glow" />
              <img src={cyberCoder} alt="Sinh viên IT và AI luyện tập tiếng Nhật" className="lp-coder-img" />
              <div className="lp-coder-hologram">
                <div className="lp-holo-tag">AI CORE ONLINE</div>
                <div className="lp-holo-status">● SYNC 100%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Banner Section ── */}
      <section className="lp-banner-section" aria-label="Ảnh bìa">
        <div className="lp-banner-frame">
          <div className="lp-banner-top-bar">
            <span className="lp-dot-red" />
            <span className="lp-dot-yellow" />
            <span className="lp-dot-green" />
            <span className="lp-banner-title">J-TECH CYBER CAMPUS // SYSTEM BROADCAST</span>
          </div>
          <BannerSlider />
        </div>
      </section>

      {/* ── About Section ── */}
      <section className="lp-section lp-about" id="about" aria-labelledby="about-title">
        <div className="lp-container">
          <div className="lp-about-grid">
            {/* Holographic Core Reactor */}
            <div className="lp-about-art" aria-hidden="true">
              <div className="lp-reactor">
                <div className="lp-reactor-ring lp-reactor-ring--outer" />
                <div className="lp-reactor-ring lp-reactor-ring--mid" />
                <div className="lp-reactor-core">
                  <span className="lp-reactor-kanji">練</span>
                  <div className="lp-reactor-pulse" />
                </div>
                <div className="lp-reactor-particles">
                  <span /><span /><span /><span />
                </div>
              </div>
              <div className="lp-about-tag lp-about-tag--1">
                <span className="lp-tag-icon">🎯</span>
                <span>Luyện tập chủ động</span>
              </div>
              <div className="lp-about-tag lp-about-tag--2">
                <span className="lp-tag-icon">💡</span>
                <span>Định hướng IT</span>
              </div>
            </div>

            {/* About Text Content */}
            <div className="lp-about-text">
              <div className="lp-section-eyebrow">
                <span className="lp-section-eyebrow-line" />
                <span>J-Tech là gì?</span>
              </div>
              <h2 id="about-title" className="lp-section-title">
                Môi trường luyện tập tiếng Nhật <br />
                <em>dành riêng</em> cho sinh viên IT
              </h2>
              <p className="lp-about-desc">
                J-Tech được xây dựng để hỗ trợ sinh viên IT tại FPT University luyện tập và củng cố tiếng Nhật thông qua hệ thống bài tập và nội dung tương tác chuyên ngành công nghệ thông tin.
              </p>
              <p className="lp-about-desc">
                Mục tiêu không phải thay thế lớp học, mà tạo ra một môi trường để sinh viên có thể <strong>chủ động luyện tập và ôn lại kiến thức</strong> ngoài giờ học — theo nhịp độ và lịch học của riêng bạn.
              </p>

              <div className="lp-about-pills">
                <div className="lp-pill lp-pill--cyan">
                  <span>🇯🇵</span> Tiếng Nhật IT
                </div>
                <div className="lp-pill lp-pill--blue">
                  <span>💻</span> Chuyên sâu IT
                </div>
                <div className="lp-pill lp-pill--orange">
                  <span>🏫</span> FPT University
                </div>
                <div className="lp-pill lp-pill--purple">
                  <span>🤖</span> Tích hợp AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Practice Features Section ── */}
      <section className="lp-section lp-features" id="features" aria-labelledby="features-title">
        <div className="lp-container">
          <div className="lp-section-header lp-section-header--center">
            <div className="lp-section-eyebrow">
              <span className="lp-section-eyebrow-line" />
              <span>Luyện tập cùng J-Tech</span>
              <span className="lp-section-eyebrow-line" />
            </div>
            <h2 id="features-title" className="lp-section-title">
              Đầy đủ kỹ năng luyện tập <em>tiếng Nhật IT</em>
            </h2>
            <p className="lp-section-desc">
              Từ từ vựng, ngữ pháp đến Kanji, nghe, đọc, nói — J-Tech tổng hợp mọi kỹ năng để bạn tự tin làm việc trong các công ty IT Nhật Bản.
            </p>
          </div>

          <div className="lp-feature-grid">
            {practiceCards.map((card) => (
              <article
                className="lp-feature-card"
                key={card.title}
                style={{
                  "--accent-color": card.color,
                  "--accent-glow": card.glow,
                } as React.CSSProperties}
              >
                <div className="lp-card-corner lp-card-corner--tl" />
                <div className="lp-card-corner lp-card-corner--br" />
                
                <div className="lp-feature-icon-box">
                  <span className="lp-feature-icon">{card.icon}</span>
                  <div className="lp-feature-icon-glow" />
                </div>

                <div className="lp-feature-body">
                  <div className="lp-feature-header-row">
                    <h3 className="lp-feature-title">{card.title}</h3>
                    <span className="lp-feature-sub">{card.subtitle}</span>
                  </div>
                  <p className="lp-feature-desc">{card.description}</p>
                </div>

                <div className="lp-feature-hover-line" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits / For IT Students ── */}
      <section className="lp-section lp-benefits" id="benefits" aria-labelledby="benefits-title">
        <div className="lp-container">
          <div className="lp-benefits-grid">
            <div className="lp-benefits-left">
              <div className="lp-section-eyebrow">
                <span className="lp-section-eyebrow-line" />
                <span>Dành cho sinh viên IT tại FPT</span>
              </div>
              <h2 id="benefits-title" className="lp-section-title">
                Được thiết kế riêng cho <em>hành trình của bạn</em>
              </h2>
              <p className="lp-section-desc">
                J-Tech hiểu rằng sinh viên IT có lịch học code và dự án dày đặc. Vì vậy nền tảng được tối ưu để bạn luyện tập hiệu quả nhất mà không tốn quá nhiều thời gian.
              </p>

              <div className="lp-benefits-list">
                {benefits.map((b) => (
                  <div className="lp-benefit-item" key={b.title}>
                    <div className="lp-benefit-icon-wrap">
                      <span className="lp-benefit-icon">{b.icon}</span>
                    </div>
                    <div>
                      <strong className="lp-benefit-title">{b.title}</strong>
                      <p className="lp-benefit-desc">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Cyber Mockup */}
            <div className="lp-benefits-art" aria-hidden="true">
              <div className="lp-mockup">
                <div className="lp-mockup-bar">
                  <span className="lp-mockup-dot lp-mockup-dot--red" />
                  <span className="lp-mockup-dot lp-mockup-dot--yellow" />
                  <span className="lp-mockup-dot lp-mockup-dot--green" />
                  <span className="lp-mockup-title">TELEMETRY_DASHBOARD.exe</span>
                </div>
                <div className="lp-mockup-content">
                  <div className="lp-mockup-header-row">
                    <div className="lp-mockup-section-name">Tiến độ luyện tập tuần</div>
                    <span className="lp-mockup-badge">LIVE SYNC</span>
                  </div>

                  <div className="lp-mockup-week">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
                      <div className="lp-mockup-day" key={d}>
                        <div
                          className="lp-mockup-bar-fill"
                          style={{ height: `${[45, 75, 60, 95, 80, 50, 70][i]}%` }}
                        />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>

                  <div className="lp-mockup-stats">
                    <div className="lp-mockup-stat">
                      <span className="lp-mockup-stat-val">127</span>
                      <span className="lp-mockup-stat-label">Bài đã luyện</span>
                    </div>
                    <div className="lp-mockup-stat">
                      <span className="lp-mockup-stat-val lp-mockup-stat-val--cyan">85%</span>
                      <span className="lp-mockup-stat-label">Chính xác</span>
                    </div>
                    <div className="lp-mockup-stat">
                      <span className="lp-mockup-stat-val lp-mockup-stat-val--orange">14</span>
                      <span className="lp-mockup-stat-label">Ngày liên tiếp</span>
                    </div>
                  </div>

                  <div className="lp-mockup-recent">
                    <div className="lp-mockup-recent-title">Nội dung vừa luyện tập</div>
                    {[
                      { name: "IT Vocabulary N3 - Database", score: "96%", level: "EXCELLENT" },
                      { name: "Kanji IT - Network & Cloud", score: "84%", level: "PASSED" },
                      { name: "Project Grammar - Git & Scrum", score: "92%", level: "EXCELLENT" },
                    ].map((item) => (
                      <div className="lp-mockup-recent-item" key={item.name}>
                        <div className="lp-mockup-recent-name-wrap">
                          <span className="lp-recent-dot" />
                          <span>{item.name}</span>
                        </div>
                        <div className="lp-recent-score-wrap">
                          <span className="lp-mockup-recent-score">{item.score}</span>
                          <span className="lp-recent-tag">{item.level}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Progress Tracking Section ── */}
      <section className="lp-section lp-tracking" aria-labelledby="tracking-title">
        <div className="lp-container">
          <div className="lp-section-header lp-section-header--center">
            <div className="lp-section-eyebrow">
              <span className="lp-section-eyebrow-line" />
              <span>Theo dõi tiến độ luyện tập</span>
              <span className="lp-section-eyebrow-line" />
            </div>
            <h2 id="tracking-title" className="lp-section-title">
              Nắm rõ hành trình <em>luyện tập mỗi ngày</em>
            </h2>
            <p className="lp-section-desc">
              Theo dõi kết quả, xem thống kê chi tiết và duy trì chuỗi ngày rèn luyện với dashboard chuẩn phong cách công nghệ.
            </p>
          </div>

          <div className="lp-tracking-cards">
            {[
              {
                emoji: "📊",
                title: "Thống kê chi tiết",
                desc: "Xem biểu đồ tiến độ luyện tập theo ngày, tuần và tháng theo từng kỹ năng IT cụ thể.",
                tag: "REALTIME ANALYTICS",
                color: "#38BDF8",
              },
              {
                emoji: "✅",
                title: "Nội dung đã hoàn thành",
                desc: "Kiểm tra chính xác những bài luyện tập đã hoàn thành, điểm số và các câu cần lưu ý.",
                tag: "MILESTONES",
                color: "#10B981",
              },
              {
                emoji: "🔔",
                title: "Duy trì thói quen",
                desc: "Hệ thống nhắc nhở thông minh giúp duy trì streak luyện tập đều đặn và không bị gián đoạn.",
                tag: "STREAK SYSTEM",
                color: "#F97316",
              },
              {
                emoji: "🏆",
                title: "Bảng xếp hạng & Danh hiệu",
                desc: "Nhận huy hiệu thành tích và so tài tiến độ cùng các sinh viên IT khác trong cộng đồng FPT.",
                tag: "LEADERBOARD",
                color: "#A855F7",
              },
            ].map((item) => (
              <div
                className="lp-tracking-card"
                key={item.title}
                style={{ "--card-accent": item.color } as React.CSSProperties}
              >
                <div className="lp-tracking-card-header">
                  <span className="lp-tracking-emoji">{item.emoji}</span>
                  <span className="lp-tracking-tag">{item.tag}</span>
                </div>
                <strong className="lp-tracking-title">{item.title}</strong>
                <p className="lp-tracking-desc">{item.desc}</p>
                <div className="lp-tracking-corner-decor" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Speaking Section ── */}
      <section className="lp-section lp-ai" aria-labelledby="ai-title">
        <div className="lp-container">
          <div className="lp-ai-grid">
            <div className="lp-ai-art" aria-hidden="true">
              <div className="lp-ai-visual">
                <div className="lp-ai-avatar">
                  <span className="lp-ai-avatar-icon">🤖</span>
                  <div className="lp-ai-avatar-ring" />
                </div>
                <div className="lp-ai-waves">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className={`lp-ai-wave lp-ai-wave--${n}`} />
                  ))}
                </div>
                <div className="lp-ai-bubble lp-ai-bubble--bot">
                  <span className="lp-ai-bubble-flag">🇯🇵</span>
                  <div>
                    <div className="lp-ai-bubble-speaker">AI SENPAI // VOICE ASSISTANT</div>
                    <div className="lp-ai-bubble-text">おはようございます！今日の練習を始めましょうか？</div>
                  </div>
                </div>
                <div className="lp-ai-bubble lp-ai-bubble--user">
                  <span className="lp-ai-bubble-mic">🎤</span>
                  <div className="lp-ai-user-speech">
                    <div className="lp-ai-wave-bars">
                      <span /><span /><span /><span /><span /><span />
                    </div>
                    <span>はい、よろしくお願いします！</span>
                  </div>
                </div>
                <div className="lp-ai-feedback">
                  <span className="lp-feedback-check">✅</span>
                  <div>
                    <div className="lp-feedback-title">Phát âm chuẩn xác (96%)</div>
                    <div className="lp-feedback-sub">Ngữ điệu tự nhiên, phản xạ tốt!</div>
                  </div>
                  <span className="lp-feedback-points">+15 XP</span>
                </div>
              </div>
            </div>

            <div className="lp-ai-text">
              <div className="lp-section-eyebrow">
                <span className="lp-section-eyebrow-line" />
                <span>Luyện nói AI</span>
              </div>
              <h2 id="ai-title" className="lp-section-title">
                Luyện nói cùng <em>Trợ lý AI thông minh</em>
              </h2>
              <p className="lp-ai-desc">
                Thực hành giao tiếp tiếng Nhật với trợ lý AI và nhận đánh giá tức thì sau mỗi câu thoại. Tính năng mô phỏng tình huống trao đổi công việc, phỏng vấn dự án IT thực tế giúp bạn tự tin giao tiếp.
              </p>
              <ul className="lp-ai-points">
                <li>
                  <span className="lp-ai-point-check">✓</span>
                  <span>Nhận xét và sửa lỗi phát âm theo thời gian thực (Real-time Speech Recognition)</span>
                </li>
                <li>
                  <span className="lp-ai-point-check">✓</span>
                  <span>Mô phỏng hội thoại phỏng vấn dự án và trao đổi kỹ thuật tự nhiên</span>
                </li>
                <li>
                  <span className="lp-ai-point-check">✓</span>
                  <span>Theo dõi mức độ lưu loát và từ vựng chuyên ngành được sử dụng</span>
                </li>
                <li>
                  <span className="lp-ai-point-check">✓</span>
                  <span>Luyện tập không giới hạn số lần, linh hoạt 24/7 mọi lúc mọi nơi</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA Section ── */}
      <section className="lp-section lp-final-cta" aria-labelledby="final-cta-title">
        <div className="lp-final-cta-bg" aria-hidden="true">
          <div className="lp-final-glow lp-final-glow--1" />
          <div className="lp-final-glow lp-final-glow--2" />
          <div className="lp-final-kanji">練習</div>
          <div className="lp-final-grid" />
        </div>
        <div className="lp-container lp-final-cta-inner">
          <div className="lp-section-eyebrow lp-section-eyebrow--light">
            <span className="lp-section-eyebrow-line" />
            <span>Bắt đầu ngay hôm nay</span>
            <span className="lp-section-eyebrow-line" />
          </div>
          <h2 id="final-cta-title" className="lp-final-cta-title">
            Sẵn sàng cùng J-Tech <br />
            chinh phục tiếng Nhật IT?
          </h2>
          <p className="lp-final-cta-sub">
            Khám phá lộ trình luyện tập bài bản, làm chủ từ vựng chuyên ngành và nâng cao lợi thế cạnh tranh ngay hôm nay.
          </p>
          <div className="lp-final-btn-wrap">
            <button
              id="final-cta-btn"
              className="lp-cta-btn lp-cta-btn--cyber-large"
              onClick={() => navigate("/login")}
              type="button"
            >
              <span>Cùng nhau khám phá</span>
              <span className="lp-cta-arrow" aria-hidden="true">→</span>
            </button>
          </div>
          <p className="lp-final-tagline">
            ✦ Luyện tập tiếng Nhật · Nâng tầm kỹ năng · Cùng J-Tech bứt phá mỗi ngày ✦
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-logo">
              <span className="lp-logo-mark">
                <span className="lp-bracket">&#123;</span>
                <span className="lp-j">J</span>
                <span className="lp-bracket">&#125;</span>
              </span>
              <span className="lp-logo-text">
                J-Tech <span className="lp-logo-kanji">技</span>
              </span>
            </div>
            <p className="lp-footer-desc">
              Nền tảng luyện tập tiếng Nhật dành cho sinh viên IT tại FPT University.
            </p>
          </div>

          <div className="lp-footer-status">
            <span className="lp-status-dot" />
            <span className="lp-status-text">Hệ thống đang hoạt động // J-Tech Core v2.4</span>
          </div>

          <p className="lp-footer-copy">
            © 2024 J-Tech · FPT University · Built with ❤️ for IT Students
          </p>
        </div>
      </footer>
    </div>
  );
}
