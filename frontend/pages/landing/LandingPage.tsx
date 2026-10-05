import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

import banner1 from "../../assets/banner/banner1.png";
import banner2 from "../../assets/banner/banner2.png";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const practiceCards = [
  {
    icon: "あ",
    title: "Từ vựng",
    subtitle: "Vocabulary",
    description: "Luyện tập từ vựng tiếng Nhật theo chủ đề và cấp độ, gắn liền với ngữ cảnh thực tế.",
    color: "#4A90D9",
    bg: "#EBF4FF",
  },
  {
    icon: "文",
    title: "Ngữ pháp",
    subtitle: "Grammar",
    description: "Ôn tập và luyện tập ngữ pháp qua các bài tập có cấu trúc rõ ràng, dễ nắm bắt.",
    color: "#7C5CBF",
    bg: "#F3EEFF",
  },
  {
    icon: "漢",
    title: "Hán tự",
    subtitle: "Kanji",
    description: "Luyện tập và ghi nhớ Kanji theo bộ thủ, nét viết và ý nghĩa một cách hệ thống.",
    color: "#E05A2B",
    bg: "#FFF0EB",
  },
  {
    icon: "🎧",
    title: "Luyện nghe",
    subtitle: "Listening",
    description: "Luyện nghe hiểu tiếng Nhật qua các đoạn hội thoại và bài nghe đa dạng cấp độ.",
    color: "#16A34A",
    bg: "#EDFDF4",
  },
  {
    icon: "📖",
    title: "Luyện đọc",
    subtitle: "Reading",
    description: "Luyện đọc hiểu tiếng Nhật qua các đoạn văn ngắn, bài báo và ngữ liệu thực tế.",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    icon: "🎤",
    title: "Luyện nói",
    subtitle: "Speaking",
    description: "Thực hành nói và giao tiếp tiếng Nhật, rèn phát âm và ngữ điệu tự nhiên.",
    color: "#DB2777",
    bg: "#FFF0F7",
  },
  {
    icon: "🎮",
    title: "Trò chơi học tập",
    subtitle: "Practice Games",
    description: "Củng cố kiến thức qua các trò chơi tương tác thú vị, nâng cao động lực luyện tập.",
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    icon: "🤖",
    title: "Luyện nói với AI",
    subtitle: "AI Speaking",
    description: "Thực hành nói tiếng Nhật với AI và nhận kết quả phản hồi sau mỗi lần luyện tập.",
    color: "#6366F1",
    bg: "#EEF2FF",
  },
];

const benefits = [
  {
    icon: "📅",
    title: "Phù hợp lịch học IT",
    description: "Được thiết kế phù hợp với đặc thù lịch học và cường độ của sinh viên IT tại FPT University.",
  },
  {
    icon: "📝",
    title: "Luyện tập theo từng bài",
    description: "Nội dung chia theo từng bài học rõ ràng, dễ theo dõi và luyện tập có hệ thống.",
  },
  {
    icon: "🧩",
    title: "Chia nhỏ kiến thức",
    description: "Từ vựng, ngữ pháp, Kanji được chia thành các phần nhỏ, dễ tiếp thu và ôn tập chủ động.",
  },
  {
    icon: "🔄",
    title: "Ôn tập chủ động",
    description: "Hệ thống nhắc lại thông minh giúp bạn ôn tập đúng nội dung vào đúng thời điểm.",
  },
  {
    icon: "📊",
    title: "Theo dõi tiến độ",
    description: "Dashboard trực quan giúp bạn nắm rõ tiến độ luyện tập và điều chỉnh kế hoạch hiệu quả.",
  },
  {
    icon: "🤖",
    title: "AI hỗ trợ luyện nói",
    description: "Kết hợp công nghệ AI để hỗ trợ luyện nói, mang lại trải nghiệm tương tác thực tế.",
  },
];

const banners = [banner1, banner2];

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
            <img src={src} alt={`Banner J-Tech ${i + 1}`} className="banner-img" />
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

/* ─── Main Landing Page ─────────────────────────────────────────────────── */

export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="lp-root" id="top">
      {/* ── Navbar ── */}
      <header className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <button className="lp-logo" onClick={() => scrollTo("#top")} type="button">
            <span className="lp-logo-mark">J</span>
            <span className="lp-logo-text">J-Tech</span>
          </button>

          <nav className="lp-nav-links" aria-label="Điều hướng chính">
            {navLinks.map((l) => (
              <button key={l.label} className="lp-nav-link" onClick={() => scrollTo(l.href)} type="button">
                {l.label}
              </button>
            ))}
          </nav>

          <button className="lp-nav-cta" onClick={() => navigate("/login")} type="button">
            Cùng nhau khám phá
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
              <button key={l.label} className="lp-mobile-link" onClick={() => scrollTo(l.href)} type="button">
                {l.label}
              </button>
            ))}
            <button className="lp-nav-cta lp-mobile-cta" onClick={() => navigate("/login")} type="button">
              Cùng nhau khám phá
            </button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero" aria-label="Giới thiệu J-Tech">
        <div className="lp-hero-bg">
          <div className="lp-hero-blob lp-hero-blob--1" />
          <div className="lp-hero-blob lp-hero-blob--2" />
          <div className="lp-hero-kanji-bg" aria-hidden="true">語</div>
        </div>

        <div className="lp-hero-content">
          <div className="lp-hero-left">
            <div className="lp-eyebrow">
              <span className="lp-eyebrow-dot" />
              Dành riêng cho sinh viên IT · FPT University
            </div>

            <h1 className="lp-hero-heading">
              Luyện tập tiếng Nhật <br />
              <em>hiệu quả cùng J-Tech</em>
            </h1>

            <p className="lp-hero-sub">
              Nền tảng luyện tập tiếng Nhật dành cho sinh viên IT tại FPT University.
            </p>
            <p className="lp-hero-desc">
              Luyện tập từ vựng, ngữ pháp, Kanji, nghe, đọc và nói theo cách trực quan, chủ động và phù hợp với hành trình học tập của sinh viên IT.
            </p>

            <div className="lp-hero-actions">
              <button
                id="hero-cta"
                className="lp-cta-btn lp-cta-btn--primary"
                onClick={() => navigate("/login")}
                type="button"
              >
                Cùng nhau khám phá <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="lp-hero-stats">
              <div className="lp-stat">
                <span className="lp-stat-num">8+</span>
                <span className="lp-stat-label">Kỹ năng luyện tập</span>
              </div>
              <div className="lp-stat-divider" />
              <div className="lp-stat">
                <span className="lp-stat-num">AI</span>
                <span className="lp-stat-label">Hỗ trợ luyện nói</span>
              </div>
              <div className="lp-stat-divider" />
              <div className="lp-stat">
                <span className="lp-stat-num">FPT</span>
                <span className="lp-stat-label">University</span>
              </div>
            </div>
          </div>

          <div className="lp-hero-right" aria-hidden="true">
            <div className="lp-hero-card lp-hero-card--main">
              <div className="lp-hero-card-header">
                <div className="lp-practice-badge">J-Tech</div>
                <span className="lp-practice-label">Luyện tập hôm nay</span>
              </div>
              <div className="lp-progress-list">
                {[
                  { name: "Từ vựng N3", pct: 78, color: "#4A90D9" },
                  { name: "Kanji 漢字", pct: 54, color: "#E05A2B" },
                  { name: "Ngữ pháp", pct: 91, color: "#7C5CBF" },
                ].map((item) => (
                  <div className="lp-progress-item" key={item.name}>
                    <div className="lp-progress-top">
                      <span>{item.name}</span>
                      <span className="lp-progress-pct">{item.pct}%</span>
                    </div>
                    <div className="lp-progress-bar">
                      <div
                        className="lp-progress-fill"
                        style={{ width: `${item.pct}%`, background: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-hero-card lp-hero-card--floating lp-hero-card--vocab">
              <span className="lp-jp-char">日</span>
              <div>
                <div className="lp-jp-word">にほんご</div>
                <div className="lp-jp-meaning">Tiếng Nhật</div>
              </div>
            </div>

            <div className="lp-hero-card lp-hero-card--floating lp-hero-card--streak">
              🔥 &nbsp;<strong>7 ngày</strong> luyện tập liên tiếp
            </div>

            <div className="lp-deco-circle lp-deco-circle--1" />
            <div className="lp-deco-circle lp-deco-circle--2" />
          </div>
        </div>

        <div className="lp-hero-floaters" aria-hidden="true">
          <span className="lp-float lp-float--1">あ</span>
          <span className="lp-float lp-float--2">語</span>
          <span className="lp-float lp-float--3">漢</span>
          <span className="lp-float lp-float--4">日</span>
        </div>
      </section>

      {/* ── Banner ── */}
      <section className="lp-banner-section" aria-label="Ảnh bìa">
        <BannerSlider />
      </section>

      {/* ── About ── */}
      <section className="lp-section lp-about" id="about" aria-labelledby="about-title">
        <div className="lp-container">
          <div className="lp-about-grid">
            <div className="lp-about-art" aria-hidden="true">
              <div className="lp-about-circle">
                <span className="lp-about-kanji">練</span>
              </div>
              <div className="lp-about-tag lp-about-tag--1">🎯 Luyện tập chủ động</div>
              <div className="lp-about-tag lp-about-tag--2">💡 Định hướng IT</div>
            </div>

            <div className="lp-about-text">
              <div className="lp-section-eyebrow">J-Tech là gì?</div>
              <h2 id="about-title" className="lp-section-title">
                Môi trường luyện tập tiếng Nhật <em>dành riêng</em> cho sinh viên IT
              </h2>
              <p className="lp-about-desc">
                J-Tech được xây dựng để hỗ trợ sinh viên IT tại FPT University luyện tập và củng cố tiếng Nhật thông qua hệ thống bài tập và nội dung tương tác.
              </p>
              <p className="lp-about-desc">
                Mục tiêu không phải thay thế lớp học, mà tạo ra một môi trường để sinh viên có thể <strong>chủ động luyện tập và ôn lại kiến thức</strong> ngoài giờ học — theo nhịp độ và lịch học của riêng bạn.
              </p>
              <div className="lp-about-pills">
                <span className="lp-pill">🇯🇵 Tiếng Nhật</span>
                <span className="lp-pill">💻 Chuyên sâu IT</span>
                <span className="lp-pill">🏫 FPT University</span>
                <span className="lp-pill">🤖 Tích hợp AI</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Practice Features ── */}
      <section className="lp-section lp-features" id="features" aria-labelledby="features-title">
        <div className="lp-container">
          <div className="lp-section-header lp-section-header--center">
            <div className="lp-section-eyebrow">Luyện tập cùng J-Tech</div>
            <h2 id="features-title" className="lp-section-title">
              Đầy đủ kỹ năng luyện tập tiếng Nhật
            </h2>
            <p className="lp-section-desc">
              Từ từ vựng, ngữ pháp đến Kanji, nghe, đọc, nói — J-Tech tổng hợp mọi kỹ năng để bạn luyện tập toàn diện.
            </p>
          </div>

          <div className="lp-feature-grid">
            {practiceCards.map((card) => (
              <article className="lp-feature-card" key={card.title} style={{ "--card-color": card.color, "--card-bg": card.bg } as React.CSSProperties}>
                <div className="lp-feature-icon">{card.icon}</div>
                <div className="lp-feature-body">
                  <h3 className="lp-feature-title">{card.title}</h3>
                  <span className="lp-feature-sub">{card.subtitle}</span>
                  <p className="lp-feature-desc">{card.description}</p>
                </div>
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
              <div className="lp-section-eyebrow">Dành cho sinh viên IT tại FPT</div>
              <h2 id="benefits-title" className="lp-section-title">
                Được thiết kế riêng cho <em>hành trình của bạn</em>
              </h2>
              <p className="lp-section-desc">
                J-Tech hiểu rằng sinh viên IT có lịch học dày và kiến thức rất đa dạng. Vì vậy chúng tôi thiết kế trải nghiệm luyện tập phù hợp nhất với bạn.
              </p>

              <div className="lp-benefits-list">
                {benefits.map((b) => (
                  <div className="lp-benefit-item" key={b.title}>
                    <span className="lp-benefit-icon">{b.icon}</span>
                    <div>
                      <strong className="lp-benefit-title">{b.title}</strong>
                      <p className="lp-benefit-desc">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-benefits-art" aria-hidden="true">
              <div className="lp-mockup">
                <div className="lp-mockup-bar">
                  <span /><span /><span />
                </div>
                <div className="lp-mockup-content">
                  <div className="lp-mockup-title">Tiến độ luyện tập</div>
                  <div className="lp-mockup-week">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
                      <div className="lp-mockup-day" key={d}>
                        <div
                          className="lp-mockup-bar-fill"
                          style={{ height: `${[40, 65, 55, 88, 70, 45, 60][i]}%` }}
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
                      <span className="lp-mockup-stat-val">85%</span>
                      <span className="lp-mockup-stat-label">Chính xác</span>
                    </div>
                    <div className="lp-mockup-stat">
                      <span className="lp-mockup-stat-val">14</span>
                      <span className="lp-mockup-stat-label">Ngày luyện tập</span>
                    </div>
                  </div>
                  <div className="lp-mockup-recent">
                    <div className="lp-mockup-recent-title">Gần đây</div>
                    {[
                      { name: "N3 Vocabulary", score: "92%" },
                      { name: "Kanji JLPT N4", score: "78%" },
                      { name: "Grammar N3", score: "88%" },
                    ].map((item) => (
                      <div className="lp-mockup-recent-item" key={item.name}>
                        <span>{item.name}</span>
                        <span className="lp-mockup-recent-score">{item.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Progress Tracking ── */}
      <section className="lp-section lp-tracking" aria-labelledby="tracking-title">
        <div className="lp-container">
          <div className="lp-section-header lp-section-header--center">
            <div className="lp-section-eyebrow">Theo dõi tiến độ luyện tập</div>
            <h2 id="tracking-title" className="lp-section-title">
              Nắm rõ hành trình luyện tập của bạn
            </h2>
            <p className="lp-section-desc">
              Theo dõi kết quả, xem thống kê và duy trì quá trình luyện tập mỗi ngày với dashboard trực quan.
            </p>
          </div>

          <div className="lp-tracking-cards">
            {[
              { emoji: "📊", title: "Thống kê chi tiết", desc: "Xem biểu đồ tiến độ luyện tập theo ngày, tuần và tháng." },
              { emoji: "✅", title: "Nội dung đã hoàn thành", desc: "Kiểm tra những bài luyện tập đã hoàn thành và chưa hoàn thành." },
              { emoji: "🔔", title: "Duy trì thói quen", desc: "Hệ thống nhắc nhở giúp bạn luyện tập đều đặn mỗi ngày." },
              { emoji: "🏆", title: "Kết quả luyện tập", desc: "Xem điểm số và kết quả chi tiết sau mỗi bài luyện tập." },
            ].map((item) => (
              <div className="lp-tracking-card" key={item.title}>
                <span className="lp-tracking-emoji">{item.emoji}</span>
                <strong className="lp-tracking-title">{item.title}</strong>
                <p className="lp-tracking-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Speaking ── */}
      <section className="lp-section lp-ai" aria-labelledby="ai-title">
        <div className="lp-container">
          <div className="lp-ai-grid">
            <div className="lp-ai-art" aria-hidden="true">
              <div className="lp-ai-visual">
                <div className="lp-ai-avatar">🤖</div>
                <div className="lp-ai-waves">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className={`lp-ai-wave lp-ai-wave--${n}`} />
                  ))}
                </div>
                <div className="lp-ai-bubble lp-ai-bubble--bot">
                  <span className="lp-ai-bubble-flag">🇯🇵</span>
                  おはようございます！何を練習しますか？
                </div>
                <div className="lp-ai-bubble lp-ai-bubble--user">
                  🎤 Thực hành luyện nói...
                </div>
                <div className="lp-ai-feedback">
                  ✅ Phát âm tốt! <span>+15 điểm</span>
                </div>
              </div>
            </div>

            <div className="lp-ai-text">
              <div className="lp-section-eyebrow">Luyện nói AI</div>
              <h2 id="ai-title" className="lp-section-title">
                Luyện nói cùng AI
              </h2>
              <p className="lp-ai-desc">
                Thực hành nói tiếng Nhật với AI và nhận kết quả sau mỗi lần luyện tập. Đây là một tính năng hỗ trợ luyện nói được tích hợp vào J-Tech, giúp bạn thực hành giao tiếp bất cứ lúc nào.
              </p>
              <ul className="lp-ai-points">
                <li>🎙️ Nhận xét phát âm sau mỗi lần luyện tập</li>
                <li>💬 Thực hành hội thoại tự nhiên</li>
                <li>📈 Theo dõi sự tiến bộ trong luyện nói</li>
                <li>🔁 Luyện lại nhiều lần theo nhu cầu</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-section lp-final-cta" aria-labelledby="final-cta-title">
        <div className="lp-final-cta-bg" aria-hidden="true">
          <div className="lp-final-blob lp-final-blob--1" />
          <div className="lp-final-blob lp-final-blob--2" />
          <div className="lp-final-kanji" aria-hidden="true">練習</div>
        </div>
        <div className="lp-container lp-final-cta-inner">
          <div className="lp-section-eyebrow lp-section-eyebrow--light">Bắt đầu ngay hôm nay</div>
          <h2 id="final-cta-title" className="lp-final-cta-title">
            Sẵn sàng cùng J-Tech<br />luyện tập tiếng Nhật?
          </h2>
          <p className="lp-final-cta-sub">
            Bắt đầu hành trình luyện tập và củng cố tiếng Nhật của bạn.
          </p>
          <button
            id="final-cta-btn"
            className="lp-cta-btn lp-cta-btn--white"
            onClick={() => navigate("/login")}
            type="button"
          >
            Cùng nhau khám phá <span aria-hidden="true">→</span>
          </button>
          <p className="lp-final-tagline">
            Luyện tập tiếng Nhật. Nâng cao kỹ năng. Cùng J-Tech tiến bộ mỗi ngày.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-logo-mark">J</span>
            <span className="lp-logo-text">J-Tech</span>
          </div>
          <p className="lp-footer-desc">
            Nền tảng luyện tập tiếng Nhật dành cho sinh viên IT tại FPT University.
          </p>
          <p className="lp-footer-copy">© 2024 J-Tech · FPT University · Made with ❤️ for IT students</p>
        </div>
      </footer>
    </div>
  );
}
