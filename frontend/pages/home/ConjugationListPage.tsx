import { useNavigate } from "react-router-dom";
import { ConjugationFormTiles } from "./ConjugationFormTiles";
import "./Conjugation.css";

/**
 * 3.6.25 Conjugation List (UC-21, UC-22). Lưới các thể chia; bấm một thể để vào luyện tập ngay.
 * Nhóm động từ, độ khó, hình thức (nhập / trắc nghiệm) và "Xem cách chia" nằm trên màn luyện tập.
 */
export function ConjugationListPage() {
  const navigate = useNavigate();
  return (
    <div className="cj2-page">
      <ConjugationFormTiles
        activeId={null}
        onSelect={(form) => navigate(`/conjugations/${form.id}/practice?group=0&difficulty=ALL&mode=typed`)}
      />
      <section className="cj2-card cj2-start">
        <span className="cj2-start-icon" aria-hidden="true">
          ✍️
        </span>
        <h1>Luyện chia thể động từ</h1>
        <p>Chọn một thể ở trên để bắt đầu. Bạn có thể tự gõ đáp án hoặc làm trắc nghiệm, và xem cách chia bất cứ lúc nào.</p>
      </section>
    </div>
  );
}
