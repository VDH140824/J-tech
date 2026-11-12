import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  SPEAKING_DEMO,
  finishSpeakingSession,
  formatScore,
  getSpeakingScenarios,
  scoreLevel,
  scriptLineText,
  startSpeakingSession,
  submitSpeakingTurn,
  swapScenarioRoles,
  type SpeakingScenario,
  type SpeakingScriptLine,
  type SpeakingTurnFeedback,
  type SpeakingTurnResult,
  type SpeakingVerdict,
  type SpeakingWordScore,
} from "../../api/speakingApi";
import { useAudioRecorder, type RecorderError } from "../../hooks/useAudioRecorder";
import "../home/StudentLearningPage.css";
import "./SpeakingPage.css";

const NO_JAPANESE_VOICE =
  "Thiết bị chưa có giọng tiếng Nhật. Hãy cài giọng tiếng Nhật trong cài đặt ngôn ngữ của hệ điều hành rồi mở lại trình duyệt.";

const RECORDER_MESSAGES: Record<RecorderError, string> = {
  unsupported: "Trình duyệt này không hỗ trợ thu âm. Hãy dùng Chrome hoặc Edge bản mới.",
  denied: "Trình duyệt đang chặn micro. Hãy cho phép dùng micro ở thanh địa chỉ rồi nhấn nói lại.",
  failed: "Không thu được âm thanh. Kiểm tra micro rồi nhấn nói lại.",
};

const VERDICTS: Record<SpeakingVerdict, { label: string; warn: boolean }> = {
  FOLLOWS_SCRIPT: { label: "✓ Đúng theo bài", warn: false },
  FITS_SITUATION: { label: "✓ Hợp tình huống", warn: false },
  UNNATURAL: { label: "△ Chưa tự nhiên", warn: true },
};

/** Tells the learner that scores and feedback on screen are samples, not their own. */
export function DemoBanner() {
  if (!SPEAKING_DEMO) return null;
  return (
    <p
      className="speaking-demo-banner"
      role="note"
    >
      Chế độ dữ liệu mẫu: điểm và nhận xét là ví dụ, chưa chấm giọng của bạn.
    </p>
  );
}

/** One script line with its replaceable parts highlighted in yellow. */
export function ScriptText({ line }: { line: SpeakingScriptLine }) {
  return (
    <>
      {line.segments.map((segment, index) =>
        segment.free ? (
          <span
            key={index}
            className="speaking-slot"
          >
            {segment.text}
          </span>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

export function WordScores({ words }: { words: SpeakingWordScore[] }) {
  return (
    <div className="speaking-words">
      {words.map((word, index) => (
        <span
          key={index}
          className={`speaking-w ${scoreLevel(word.accuracy)}${word.free ? " free" : ""}`}
        >
          <em>{Math.round(word.accuracy)}</em>
          <span>{word.text}</span>
        </span>
      ))}
    </div>
  );
}

/** Reads Japanese text aloud with the browser's own speech synthesis. */
export function useJapaneseSpeech() {
  const [voiceMissing, setVoiceMissing] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    // Browsers load voices lazily; asking once makes them ready for the first click.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  /** `reportMissing` is off for automatic playback so it never raises an error unprompted. */
  const speak = useCallback((text: string, reportMissing = true) => {
    const supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    const voices = supported
      ? window.speechSynthesis.getVoices().filter((voice) => /^ja(?:[-_]|$)/i.test(voice.lang))
      : [];
    if (!voices.length) {
      if (reportMissing) setVoiceMissing(true);
      return;
    }
    setVoiceMissing(false);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.voice = voices.find((voice) => voice.localService) ?? voices[0];
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, cancel, voiceMissing };
}

export function VoiceMissingNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p
      className="speaking-voice-error"
      role="alert"
    >
      {NO_JAPANESE_VOICE}
    </p>
  );
}

/** Round icon-only button; `label` is what screen readers and the tooltip say. */
export function SpeakButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="speaking-icon-btn"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      🔊
    </button>
  );
}

/**
 * A row of small toggle chips (e.g. "Dịch", "Gợi ý"). Each chip shows its text below the row only
 * when pressed, so the translation and hints stay out of the way until the learner asks for them.
 */
function RevealRow({
  onSpeak,
  speakLabel = "Nghe lại",
  items,
}: {
  onSpeak?: () => void;
  speakLabel?: string;
  items: { label: string; text?: string }[];
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const shown = items.filter((item) => item.text);
  return (
    <>
      <div className="speaking-tools">
        {onSpeak && (
          <SpeakButton
            label={speakLabel}
            onClick={onSpeak}
          />
        )}
        {shown.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={`speaking-chip${open[index] ? " on" : ""}`}
            aria-expanded={!!open[index]}
            onClick={() => setOpen((previous) => ({ ...previous, [index]: !previous[index] }))}
          >
            {item.label}
          </button>
        ))}
      </div>
      {shown.map((item, index) =>
        open[index] ? (
          <div
            key={item.label}
            className="speaking-reveal"
          >
            {item.text}
          </div>
        ) : null,
      )}
    </>
  );
}

function TurnScores({ result }: { result: SpeakingTurnResult }) {
  const scores = [
    { label: "Tổng", value: result.pronScore },
    { label: "Chính xác", value: result.accuracy },
    { label: "Trôi chảy", value: result.fluency },
  ];
  return (
    <div className="speaking-scores">
      {scores.map((score) => (
        <span
          key={score.label}
          className={`speaking-score ${scoreLevel(score.value)}`}
        >
          <small>{score.label}</small>
          {formatScore(score.value)}
        </span>
      ))}
    </div>
  );
}

function TurnFeedback({ feedback }: { feedback: SpeakingTurnFeedback | null }) {
  // Without a review the pronunciation scores above already say enough.
  if (!feedback) return null;
  const verdict = VERDICTS[feedback.verdict];
  const hasDetail = Boolean(feedback.comment) || !!feedback.tips?.length;
  return (
    <div className={`speaking-fb${verdict.warn ? " warn" : ""}`}>
      <div className="speaking-fb-h">
        <b>{verdict.label}</b>
        {feedback.suggestion && (
          <span className="speaking-fb-say">
            ✍️{" "}
            <span lang="ja">{feedback.suggestion}</span>
          </span>
        )}
      </div>
      {hasDetail && (
        <details className="speaking-fb-more">
          <summary>Chi tiết</summary>
          {feedback.comment && <p>{feedback.comment}</p>}
          {!!feedback.tips?.length && (
            <ul>
              {feedback.tips.map((tip, index) => (
                <li key={index}>
                  <b lang="ja">{tip.word}</b>: {tip.issue}
                  {tip.fix && <> → {tip.fix}</>}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
    </div>
  );
}

const MIC_ICON = (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect
      x="9"
      y="3"
      width="6"
      height="11"
      rx="3"
      fill="currentColor"
    />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

interface ConversationProps {
  scenario: SpeakingScenario;
  sessionId: number;
  listPath: string;
}

function Conversation({ scenario, sessionId, listPath }: ConversationProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const recorder = useAudioRecorder();
  const speech = useJapaneseSpeech();
  const [results, setResults] = useState<Record<number, SpeakingTurnResult>>({});
  const logEndRef = useRef<HTMLDivElement>(null);

  const { script } = scenario;
  const learnerTotal = script.filter((line) => line.speaker === "STUDENT").length;
  const turnsDone = Object.keys(results).length;
  // The learner's next line; -1 once every learner line has been spoken.
  const currentIndex = script.findIndex(
    (line, index) => line.speaker === "STUDENT" && !results[index],
  );
  const done = currentIndex === -1;
  const currentLine = done ? null : script[currentIndex];
  const shownCount = done ? script.length : currentIndex;

  const submit = useMutation({
    mutationFn: (turn: { lineIndex: number; audio: Blob }) =>
      submitSpeakingTurn(sessionId, turn.lineIndex, turn.audio),
    onSuccess: (result) => {
      setResults((previous) => ({ ...previous, [result.lineIndex]: result }));
      const reply = script[result.lineIndex + 1];
      if (reply?.speaker === "AI") speech.speak(scriptLineText(reply), false);
    },
  });

  const finish = useMutation({
    mutationFn: () => finishSpeakingSession(sessionId),
    onSuccess: (result) => {
      queryClient.setQueryData(["speaking-session", result.id], result);
      queryClient.invalidateQueries({ queryKey: ["speaking-scenarios"] });
      navigate(`${listPath}/${scenario.id}/result/${result.id}`);
    },
  });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turnsDone]);

  const toggleMic = async () => {
    if (recorder.recording) {
      const audio = await recorder.stop();
      if (audio && currentIndex >= 0) submit.mutate({ lineIndex: currentIndex, audio });
      return;
    }
    speech.cancel();
    submit.reset();
    await recorder.start();
  };

  const endSession = () => {
    if (turnsDone === 0) navigate(listPath);
    else finish.mutate();
  };

  const busy = submit.isPending || finish.isPending;
  let micTitle = "Nhấn để nói";
  let micHint = "";
  if (done) {
    micTitle = "Đã xong hội thoại";
  } else if (submit.isPending) {
    micTitle = "Đang chấm…";
  } else if (recorder.recording) {
    const clock = `${Math.floor(recorder.seconds / 60)}:${String(recorder.seconds % 60).padStart(2, "0")}`;
    micTitle = `Đang nghe… ${clock}`;
    micHint = "Nhấn lần nữa để dừng";
  }

  return (
    <div className="admin-page-container">
      <div className="mod-chapter-back-row">
        <button
          type="button"
          className="mod-btn-back"
          onClick={() => navigate(listPath)}
        >
          <span>←</span> Thoát
        </button>
      </div>

      <DemoBanner />

      <div className="speaking-sess">
        <section
          className="speaking-chat"
          aria-label="Hội thoại"
        >
          <div className="speaking-chat-head">
            <h2 className="speaking-h2">{scenario.title}</h2>
            <div className="speaking-turns">
              Lượt {turnsDone}/{learnerTotal}
              <span
                className="speaking-bar"
                aria-hidden="true"
              >
                <i style={{ width: `${learnerTotal ? (turnsDone / learnerTotal) * 100 : 0}%` }} />
              </span>
            </div>
          </div>

          <div
            className="speaking-log"
            aria-live="polite"
          >
            {script.slice(0, shownCount).map((line, index) => {
              if (line.speaker === "AI")
                return (
                  <div
                    key={index}
                    className="speaking-msg"
                  >
                    <div
                      className="speaking-who"
                      aria-hidden="true"
                    >
                      🤖
                    </div>
                    <div className="speaking-bub">
                      <div className="speaking-bub-name">{scenario.aiRole}</div>
                      <div
                        className="speaking-bub-ja"
                        lang="ja"
                      >
                        <ScriptText line={line} />
                      </div>
                      <RevealRow
                        onSpeak={() => speech.speak(scriptLineText(line))}
                        items={[{ label: "Dịch", text: line.translation }]}
                      />
                    </div>
                  </div>
                );
              const result = results[index];
              return (
                <div
                  key={index}
                  className="speaking-msg me"
                >
                  <div className="speaking-bub">
                    <div className="speaking-bub-name">{scenario.studentRole}</div>
                    {result.words.length ? (
                      <div lang="ja">
                        <WordScores words={result.words} />
                      </div>
                    ) : (
                      <div className="speaking-bub-vi">
                        {result.recognizedText || "Không nhận ra câu bạn vừa nói."}
                      </div>
                    )}
                  </div>
                  <TurnScores result={result} />
                  <TurnFeedback feedback={result.feedback} />
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>

          {currentLine && (
            <div className="speaking-yourline">
              <div className="speaking-yourline-k">Câu mẫu</div>
              <div
                className="speaking-yourline-ja"
                lang="ja"
              >
                <ScriptText line={currentLine} />
              </div>
              <RevealRow
                key={currentIndex}
                items={[
                  { label: "Dịch", text: currentLine.translation },
                  { label: "💡 Gợi ý", text: currentLine.hint },
                ]}
              />
            </div>
          )}

          {speech.voiceMissing && (
            <div
              className="speaking-alert"
              role="alert"
            >
              {NO_JAPANESE_VOICE}
            </div>
          )}
          {recorder.error && (
            <div
              className="speaking-alert"
              role="alert"
            >
              {RECORDER_MESSAGES[recorder.error]}
            </div>
          )}
          {submit.isError && (
            <div
              className="speaking-alert"
              role="alert"
            >
              Chưa gửi được câu vừa nói.
              <button
                type="button"
                className="speaking-btn-ghost"
                onClick={() => submit.variables && submit.mutate(submit.variables)}
              >
                Gửi lại
              </button>
            </div>
          )}
          {finish.isError && (
            <div
              className="speaking-alert"
              role="alert"
            >
              Chưa lưu được kết quả. Thử lại sau.
            </div>
          )}

          <div className="speaking-dock">
            <button
              type="button"
              className={`speaking-mic${recorder.recording ? " rec" : ""}`}
              aria-label={recorder.recording ? "Dừng thu âm" : "Bắt đầu thu âm"}
              aria-pressed={recorder.recording}
              disabled={done || busy}
              onClick={toggleMic}
            >
              {MIC_ICON}
            </button>
            <div
              className="speaking-mic-label"
              role="status"
            >
              {micTitle}
              {micHint && <small>{micHint}</small>}
            </div>
            <button
              type="button"
              className={done ? "speaking-btn" : "speaking-btn-ghost"}
              disabled={busy || recorder.recording}
              onClick={endSession}
            >
              {finish.isPending ? "Đang lưu…" : done ? "Xem kết quả →" : "Kết thúc"}
            </button>
          </div>
        </section>

        <details className="speaking-panel">
          <summary>Tình huống</summary>
          <div className="speaking-panel-in">
            <p>{scenario.situation}</p>
            <div className="speaking-roles">
              <span className="speaking-role">🤖 {scenario.aiRole}</span>
              <span aria-hidden="true">↔</span>
              <span className="speaking-role me">Bạn: {scenario.studentRole}</span>
            </div>

            <h3 className="speaking-h2">Bài hội thoại</h3>
            <ol className="speaking-script">
              {script.map((line, index) => (
                <li
                  key={index}
                  className={index === currentIndex ? "cur" : undefined}
                >
                  <b>{line.speaker === "AI" ? "AI" : "Bạn"}</b>
                  <span lang="ja">
                    <ScriptText line={line} />
                  </span>
                </li>
              ))}
            </ol>
            <p>
              <span className="speaking-slot">Tô vàng</span> = có thể thay bằng từ của bạn.
            </p>

            <div className="speaking-legend">
              <span className="speaking-w good">
                <em>85+</em>
                <span>Tốt</span>
              </span>
              <span className="speaking-w mid">
                <em>60+</em>
                <span>Tạm</span>
              </span>
              <span className="speaking-w low">
                <em>&lt;60</em>
                <span>Cần luyện</span>
              </span>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export function SpeakingSessionPage() {
  const { courseId, chapterId, scenarioId } = useParams();
  const navigate = useNavigate();
  const valid = [courseId, chapterId, scenarioId].every(
    (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0,
  );
  const listPath = `/courses/${courseId}/chapters/${chapterId}/speaking`;
  const scenarios = useQuery({
    queryKey: ["speaking-scenarios", Number(chapterId)],
    queryFn: () => getSpeakingScenarios(Number(chapterId)),
    enabled: valid,
  });
  const [params] = useSearchParams();
  const swapped = params.get("role") === "swap";
  const original = scenarios.data?.find((item) => item.id === Number(scenarioId));
  // The swapped view matches the script the server validates a swapped session against.
  const scenario = original && swapped ? swapScenarioRoles(original) : original;
  // Opening the page starts one session. A query (not an effect) keeps React's
  // development double-mount from creating two, and gcTime 0 makes every visit a new session.
  const session = useQuery({
    queryKey: ["speaking-session-start", Number(scenarioId), swapped],
    queryFn: () => startSpeakingSession(Number(scenarioId), swapped),
    enabled: Boolean(scenario),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const backButton = (
    <button
      className="mod-btn-back"
      onClick={() => navigate(listPath)}
    >
      ← Danh sách tình huống
    </button>
  );

  let content;
  if (!valid) content = <p role="alert">Mã tình huống luyện nói không hợp lệ.</p>;
  else if (scenarios.isLoading || (scenario && !session.data && !session.isError))
    content = (
      <div
        className="admin-loading-state"
        role="status"
      >
        Đang chuẩn bị phiên luyện nói...
      </div>
    );
  else if (scenarios.isError || session.isError)
    content = (
      <div
        className="admin-empty-state"
        role="alert"
      >
        <h3>Không thể bắt đầu phiên luyện nói</h3>
        <p>Kết nối bị gián đoạn. Hãy thử lại sau ít phút.</p>
        {backButton}
        <button
          className="mod-btn-back"
          onClick={() => (scenarios.isError ? scenarios.refetch() : session.refetch())}
        >
          Thử lại
        </button>
      </div>
    );
  else if (!scenario || !session.data)
    content = (
      <div
        className="admin-empty-state"
        role="alert"
      >
        <p>Tình huống không tồn tại trong chương này.</p>
        {backButton}
      </div>
    );
  else
    content = (
      <Conversation
        key={session.data.id}
        scenario={scenario}
        sessionId={session.data.id}
        listPath={listPath}
      />
    );
  return <div className="student-learning-page speaking-page">{content}</div>;
}
