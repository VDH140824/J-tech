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
      </div>
    </div>
  );
}
