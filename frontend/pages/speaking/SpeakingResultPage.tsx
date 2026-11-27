import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { formatScore, getSpeakingSession, scoreLevel } from "../../api/speakingApi";
import {
  DemoBanner,
  SpeakButton,
  VoiceMissingNote,
  useJapaneseSpeech,
} from "./SpeakingSessionPage";
import "../home/StudentLearningPage.css";
import "./SpeakingPage.css";

const FEEDBACK_KINDS = [
  { mark: "✓", label: "Làm tốt", tone: "good" },
  { mark: "△", label: "Cần cải thiện", tone: "mid" },
  { mark: "💡", label: "Lời khuyên", tone: "tip" },
];

type FeedbackItem = { text: string; mark?: string; label?: string; tone?: string };

/** Drops a short "điểm làm tốt:"-style lead-in the AI copies from the prompt, since the label already says it. */
function stripEchoedLabel(text: string) {
  const rest = text.replace(/^[^:：「"“]{1,40}[:：]\s*/, "");
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : text;
}

/** Splits the AI review into labelled lines; older free-text reviews fall back to one sentence per line. */
function parseFeedback(feedback: string): FeedbackItem[] {
  const lines = feedback.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const tagged = lines.map((line) => {
    const kind = FEEDBACK_KINDS.find((candidate) => line.startsWith(candidate.mark));
    return kind ? { ...kind, text: stripEchoedLabel(line.slice(kind.mark.length).trim()) } : null;
  });
  if (tagged.length > 0 && tagged.every((item) => item !== null)) return tagged as FeedbackItem[];
  return lines
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

const JAPANESE = /[぀-ヿ一-龯]/;

/** Marks quoted Japanese as chips and NN/100 scores as bold inside one feedback line. */
function highlightFeedback(text: string) {
  return text.split(/(「[^」]+」|"[^"]+"|“[^”]+”|\d+(?:[.,]\d+)?\/100)/g).map((part, index) => {
    if (/^\d/.test(part)) return <strong key={index}>{part}</strong>;
    const quoted = part.slice(1, -1);
    if (/^[「"“]/.test(part) && JAPANESE.test(quoted))
      return (
        <span
          key={index}
          className="speaking-review-ja"
          lang="ja"
        >
          {quoted}
        </span>
      );
    return part;
  });
}

export function SpeakingResultPage() {
  const { courseId, chapterId, scenarioId, sessionId } = useParams();
  const navigate = useNavigate();
  // Chuyển tiếp nơi người dùng đã vào để trang danh sách quay lại đúng chỗ.
  const { state } = useLocation();
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
  const toList = () => navigate(listPath, { state });

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
            {result.overallFeedback ? (
              <ul className="speaking-review">
                {parseFeedback(result.overallFeedback).map((item, index) => (
                  <li
                    key={index}
                    className={`speaking-review-item ${item.tone ?? ""}`}
                  >
                    {item.label && (
                      <span className="speaking-review-label">
                        {item.label}
                      </span>
                    )}
                    <p>{highlightFeedback(item.text)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Chưa có nhận xét tổng kết.</p>
            )}
            <div className="speaking-actions">
              <button
                type="button"
                className="speaking-btn"
                onClick={() => navigate(`${listPath}/${scenarioId}`, { state })}
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
