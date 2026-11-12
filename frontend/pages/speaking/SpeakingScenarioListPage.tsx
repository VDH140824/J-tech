import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getChapterStudy } from "../../api/courseApi";
import { getSpeakingScenarios, type SpeakingScenario } from "../../api/speakingApi";
import { DemoBanner } from "./SpeakingSessionPage";
import "../home/StudentLearningPage.css";
import "./SpeakingPage.css";

function ScenarioCard({
  scenario,
  onStart,
}: {
  scenario: SpeakingScenario;
  onStart: (swapped: boolean) => void;
}) {
  const learnerLines = scenario.script.filter((line) => line.speaker === "STUDENT");
  const canSwap = scenario.script.some((line) => line.speaker === "AI");
  const freeParts = learnerLines.reduce(
    (count, line) => count + line.segments.filter((segment) => segment.free).length,
    0,
  );
  return (
    <article className="speaking-scn">
      <h3>{scenario.title}</h3>
      <p>{scenario.situation}</p>
      <div className="speaking-roles">
        <span className="speaking-role">🤖 AI: {scenario.aiRole}</span>
        <span aria-hidden="true">↔</span>
        <span className="speaking-role me">Bạn: {scenario.studentRole}</span>
      </div>
      <footer>
        <span className="speaking-tags">
          <span
            className="speaking-tag"
            title={`${learnerLines.length} câu của bạn`}
          >
            💬 {learnerLines.length}
          </span>
          {freeParts > 0 && (
            <span
              className="speaking-tag slot"
              title={`${freeParts} chỗ tô vàng có thể thay`}
            >
              ✏️ {freeParts}
            </span>
          )}
          {scenario.completedCount > 0 && (
            <span
              className="speaking-tag done"
              title={`Đã luyện ${scenario.completedCount} lần`}
            >
              ✓ {scenario.completedCount}
            </span>
          )}
        </span>
        <span style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {canSwap && (
            <button
              type="button"
              className="speaking-btn-ghost"
              title={`Đổi vai: bạn nói phần của ${scenario.aiRole}, AI nói phần của ${scenario.studentRole}`}
              onClick={() => onStart(true)}
            >
              🔄 Đóng vai {scenario.aiRole}
            </button>
          )}
          <button
            type="button"
            className="speaking-btn"
            onClick={() => onStart(false)}
          >
            Bắt đầu →
          </button>
        </span>
      </footer>
    </article>
  );
}

export function SpeakingScenarioListPage() {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const valid = [courseId, chapterId].every(
    (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0,
  );
  const chapter = useQuery({
    queryKey: ["chapter-study", Number(courseId), Number(chapterId)],
    queryFn: () => getChapterStudy(Number(courseId), Number(chapterId)),
    enabled: valid,
  });
  const scenarios = useQuery({
    queryKey: ["speaking-scenarios", Number(chapterId)],
    queryFn: () => getSpeakingScenarios(Number(chapterId)),
    enabled: valid,
  });
  const chapterPath = `/courses/${courseId}/chapters/${chapterId}`;
  const back = () => navigate(chapterPath);

  let content;
  if (!valid) content = <p role="alert">Mã khóa học hoặc chương không hợp lệ.</p>;
  else if (chapter.isLoading || scenarios.isLoading)
    content = (
      <div
        className="admin-loading-state"
        role="status"
      >
        Đang tải tình huống luyện nói...
      </div>
    );
  else if (chapter.isError || !chapter.data || scenarios.isError || !scenarios.data)
    content = (
      <div
        className="admin-empty-state"
        role="alert"
      >
        <h3>Không thể tải tình huống luyện nói</h3>
        <p>Kết nối bị gián đoạn hoặc chương chưa được xuất bản.</p>
        <button
          className="mod-btn-back"
          onClick={back}
        >
          ← Quay lại chương
        </button>
        <button
          className="mod-btn-back"
          onClick={() => {
            chapter.refetch();
            scenarios.refetch();
          }}
        >
          Thử lại
        </button>
      </div>
    );
  else
    content = (
      <div className="admin-page-container">
        <div className="mod-chapter-back-row">
          <button
            type="button"
            className="mod-btn-back"
            onClick={back}
          >
            <span>←</span> Quay lại chương
          </button>
          <span className="mod-chapter-breadcrumb-pill">
            {chapter.data.courseName} / Chương {chapter.data.chapterNo} / Luyện nói
          </span>
        </div>

        <div className="admin-page-header">
          <div className="admin-header-titles">
            <h2 className="admin-main-title">
              🗣️ Luyện nói với AI <span className="speaking-title-jp">会話</span>
            </h2>
            <p className="admin-main-subtitle">
              Nói theo bài hội thoại; <span className="speaking-slot">phần tô vàng</span> có thể
              thay bằng từ của bạn.
            </p>
          </div>
        </div>

        <DemoBanner />

        {scenarios.data.length === 0 ? (
          <div className="admin-empty-state">
            <h3>Chương này chưa có tình huống luyện nói</h3>
            <p>Hãy học các kỹ năng khác của chương trong lúc chờ bài hội thoại được thêm vào.</p>
            <button
              className="mod-btn-back"
              onClick={back}
            >
              ← Quay lại chương
            </button>
          </div>
        ) : (
          <div className="speaking-grid">
            {scenarios.data.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onStart={(swapped) =>
                  navigate(`${chapterPath}/speaking/${scenario.id}${swapped ? "?role=swap" : ""}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    );
  return <div className="student-learning-page speaking-page">{content}</div>;
}
