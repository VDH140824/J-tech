import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { formatScore, getSpeakingSession, scoreLevel } from "../../api/speakingApi";
import {
  DemoBanner,
  SpeakButton,
  VoiceMissingNote,
  useJapaneseSpeech,
} from "./SpeakingSessionPage";
import "../home/StudentLearningPage.css";
import "./SpeakingPage.css";

export function SpeakingResultPage() {
  const { courseId, chapterId, scenarioId, sessionId } = useParams();
  const navigate = useNavigate();
  const speech = useJapaneseSpeech();
  const valid = [courseId, chapterId, scenarioId, sessionId].every(
    (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0,
  );
  const listPath = `/courses/${courseId}/chapters/${chapterId}/speaking`;
  const session = useQuery({
    queryKey: ["speaking-session", Number(sessionId)],
    queryFn: () => getSpeakingSession(Number(sessionId)),
    enabled: valid,
    retry: false,
  });
  const toList = () => navigate(listPath);

  let content;
  if (!valid) content = <p role="alert">Mã phiên luyện nói không hợp lệ.</p>;
  else if (session.isLoading)
    content = (
      <div
        className="admin-loading-state"
        role="status"
      >
        Đang tải kết quả...
      </div>
    );
  else if (session.isError || !session.data)
    content = (
      <div
        className="admin-empty-state"
        role="alert"
      >
        <h3>Không thể tải kết quả</h3>
        <p>Phiên luyện nói không tồn tại hoặc kết nối bị gián đoạn.</p>
        <button
          className="mod-btn-back"
          onClick={toList}
        >
          ← Danh sách tình huống
        </button>
        <button
          className="mod-btn-back"
          onClick={() => session.refetch()}
        >
          Thử lại
        </button>
      </div>
    );
  else {
    const result = session.data;
    const metrics = [
      { label: "Điểm phát âm", value: result.pronScore },
      { label: "Chính xác", value: result.accuracy },
      { label: "Trôi chảy", value: result.fluency },
      { label: "Đầy đủ", value: result.completeness },
    ];
    content = (
      <div className="admin-page-container">
        <div className="mod-chapter-back-row">
          <button
            type="button"
            className="mod-btn-back"
            onClick={toList}
          >
            <span>←</span> Danh sách tình huống
          </button>
        </div>

        <div className="admin-page-header">
          <div className="admin-header-titles">
            <h2 className="admin-main-title">Kết quả: {result.scenarioTitle}</h2>
            <p className="admin-main-subtitle">{result.turnCount} lượt nói</p>
          </div>
        </div>

        <DemoBanner />

        <div className="speaking-hero">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <strong>{formatScore(metric.value)}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>

        <div className="speaking-cols">
          <section className="speaking-card">
            <h3 className="speaking-h2">💬 Nhận xét của AI</h3>
            <p>
              {result.overallFeedback ?? "Chưa có nhận xét tổng kết."}
            </p>
            <div className="speaking-actions">
              <button
                type="button"
                className="speaking-btn"
                onClick={() => navigate(`${listPath}/${scenarioId}`)}
              >
                Luyện lại
              </button>
              <button
                type="button"
                className="speaking-btn-ghost"
                onClick={toList}
              >
                Tình huống khác
              </button>
            </div>
          </section>

          <section className="speaking-card">
            <h3 className="speaking-h2">Từ cần luyện lại</h3>
            {result.weakWords.length === 0 ? (
              <p>Không có từ nào dưới 85 điểm 🎉</p>
            ) : (
              <div>
                {result.weakWords.map((word, index) => (
                  <div
                    key={index}
                    className="speaking-fix"
                  >
                    <span
                      className={`speaking-w ${scoreLevel(word.accuracy)}`}
                      lang="ja"
                    >
                      <em>{Math.round(word.accuracy)}</em>
                      <span>{word.text}</span>
                    </span>
                    <SpeakButton
                      label={`Nghe mẫu ${word.text}`}
                      onClick={() => speech.speak(word.text)}
                    />
                  </div>
                ))}
              </div>
            )}
            <VoiceMissingNote show={speech.voiceMissing} />
          </section>
        </div>
      </div>
    );
  }
  return <div className="student-learning-page speaking-page">{content}</div>;
}
