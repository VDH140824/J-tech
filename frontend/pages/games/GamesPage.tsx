import { Link } from "react-router-dom";
import "./GamesPage.css";

export function GamesPage() {
  return (
    <div className="jtech-games">
      <h1>Trò chơi</h1>
      <p>Luyện từ vựng tiếng Nhật theo bài học của bạn.</p>
      <div className="jtech-games-grid">
        <article className="jtech-games-card">
          <div className="jtech-games-cover" aria-hidden="true">
            <span>あ</span><span>雨</span><span>カ</span>
          </div>
          <div className="jtech-games-card-body">
            <h2>Mưa Từ Vựng</h2>
            <p>Đọc nghĩa và gõ từ tiếng Nhật trước khi thẻ chạm đáy.</p>
            <Link className="jtech-games-action" to="/games/vocabulary-rain">Chọn nội dung</Link>
          </div>
        </article>
        <article className="jtech-games-card">
          <div className="jtech-kanji-fruit-cover" aria-hidden="true">
            <span>林</span><span>🍊</span><span>🍑</span><span>🍏</span>
          </div>
          <div className="jtech-games-card-body">
            <h2>Chém Kanji</h2>
            <p>Nhìn chữ Kanji và chém trái cây mang âm Hán Việt đúng.</p>
            <Link className="jtech-games-action" to="/games/kanji-fruit">Chọn nội dung</Link>
          </div>
        </article>
        <article className="jtech-games-card">
          <div className="jtech-campus-cover" aria-hidden="true">
            <svg viewBox="0 0 340 155" fill="none">
              <path d="M30 128 170 65 310 128 170 153Z" fill="#b7d6c3" />
              <path d="m73 93 61-27 52 24-61 28Z" fill="#ffe3bf" />
              <path d="M73 93V57l52 24v37Z" fill="#e78156" />
              <path d="m125 81 61-27v36l-61 28Z" fill="#c76642" />
              <path d="m73 57 61-27 52 24-61 27Z" fill="#fff1d9" />
              <path d="m186 117 48-22 35 16-48 22Z" fill="#ffe3bf" />
              <path d="M186 117V76l35 16v41Z" fill="#f0aa70" />
              <path d="m221 92 48-22v41l-48 22Z" fill="#cf8152" />
              <path d="m186 76 48-22 35 16-48 22Z" fill="#fff1d9" />
              <path d="m88 74 22 10m-22 3 22 10m30-10 30-13m-30 26 30-13m64 15 22-10m-22 23 22-10" stroke="#fff0d3" strokeWidth="5" />
              <path d="M52 113V94m235 33v-20" stroke="#54765e" strokeWidth="5" />
              <circle cx="52" cy="89" r="12" fill="#6d9d79" />
              <circle cx="287" cy="100" r="14" fill="#6d9d79" />
            </svg>
            <span>FPTU · 3D</span>
          </div>
          <div className="jtech-games-card-body">
            <h2>FPTU Campus 3D</h2>
            <p>Khám phá bản đồ khuôn viên FPTU trong không gian 3D.</p>
            <Link className="jtech-games-action" to="/games/campus-3d">Khám phá map</Link>
          </div>
        </article>
      </div>
    </div>
  );
}
