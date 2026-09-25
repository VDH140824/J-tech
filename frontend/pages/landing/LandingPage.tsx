import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const features = [
  { icon: "あ", title: "Vocabulary", description: "Build practical Japanese vocabulary for everyday conversations." },
  { icon: "漢", title: "Kanji", description: "Learn kanji step by step with clear examples and repetition." },
  { icon: "文", title: "Grammar", description: "Understand Japanese grammar through simple, structured lessons." },
  { icon: "▶", title: "Lesson videos", description: "Learn naturally with engaging video lessons and explanations." },
  { icon: "✓", title: "Practice / Quiz", description: "Review your progress with focused practice and quizzes." },
  { icon: "N5", title: "JLPT N5-N1", description: "Prepare confidently for every level of the JLPT journey." },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <button className="landing-brand" type="button" onClick={() => navigate("/")}>
          <span className="landing-brand-mark">J</span>
          <span>J-Tech</span>
        </button>
        <button className="landing-login-link" type="button" onClick={() => navigate("/login")}>
          Đăng nhập
        </button>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span /> 日本語を学ぼう · Học tiếng Nhật cùng J-Tech</p>
          <h1>J-Tech Japanese<br /><em>Learning Website</em></h1>
          <p className="landing-intro">
            Nền tảng học tiếng Nhật hiện đại giúp bạn xây dựng nền tảng vững chắc,
            luyện tập mỗi ngày và tiến gần hơn đến mục tiêu JLPT.
          </p>
          <button className="landing-cta" type="button" onClick={() => navigate("/login")}>
            Bắt đầu luyện tập <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="landing-hero-art" aria-hidden="true">
          <div className="sun" />
          <div className="torii"><span /><span /><span /></div>
          <div className="hero-kanji">学</div>
          <div className="hero-card">毎日<br /><strong>Learn every day</strong></div>
        </div>
      </section>

      <section className="landing-features" aria-labelledby="features-title">
        <div className="section-heading">
          <p className="landing-eyebrow"><span /> Learning tools</p>
          <h2 id="features-title">Mọi thứ bạn cần để tiến bộ</h2>
          <p>Học đúng cách, luyện tập đều đặn và biến tiếng Nhật thành một phần trong cuộc sống.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">J-Tech · Japanese learning made simple</footer>
    </main>
  );
}
