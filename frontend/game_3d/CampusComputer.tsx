import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { CampusSeat, SeatingControl } from "./campusSeating";

export const CAMPUS_DEMO_QUESTIONS = [
  { id: "greeting", content: "「こんにちは」 có nghĩa là gì?", options: ["Xin chào", "Cảm ơn", "Tạm biệt"], correct: 0, explanation: "こんにちは là lời chào thường dùng vào ban ngày." },
  { id: "book", content: "「本（ほん）」 có nghĩa là gì?", options: ["Cái bàn", "Quyển sách", "Cửa sổ"], correct: 1, explanation: "本（ほん） có nghĩa là quyển sách." },
];

export function gradeCampusDemo(answers: Record<string, number>) {
  return CAMPUS_DEMO_QUESTIONS.filter((question) => answers[question.id] === question.correct).length;
}

export function CampusComputer({ seat, control, onQuizCompleted }: {
  seat: CampusSeat;
  control: MutableRefObject<SeatingControl>;
  onQuizCompleted: (correct: number, total: number) => boolean;
}) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [earnedPrayer, setEarnedPrayer] = useState(false);
  const submissionLocked = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const nativeFullscreen = useRef(false);
  const fullscreenOwner = useRef<HTMLDivElement | null>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const wasExpanded = useRef(false);
  const expandRequest = useRef(control.current.expandRequest);
  const width = 720;
  const height = width * seat.screen.height / seat.screen.width;

  useFrame(() => {
    if (expandRequest.current === control.current.expandRequest) return;
    expandRequest.current = control.current.expandRequest;
    control.current.screenExpanded = true;
    setExpanded(true);
  });

  useEffect(() => {
    control.current.screenExpanded = expanded;
    if (expanded) {
      wasExpanded.current = true;
      overlay.current?.focus();
      // Keep the fixed overlay as a fallback when Fullscreen API is unavailable.
      const element = overlay.current;
      if (element?.requestFullscreen) {
        void element.requestFullscreen().catch(() => {});
      }
    } else if (wasExpanded.current) {
      expandButton.current?.focus();
    }
  }, [expanded, control]);

  useEffect(() => {
    const fullscreen = () => {
      const active = document.fullscreenElement === overlay.current && !!overlay.current;
      if (active) fullscreenOwner.current = overlay.current;
      if (nativeFullscreen.current && !active) {
        control.current.screenExpanded = false;
        setExpanded(false);
      }
      nativeFullscreen.current = active;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && control.current.screenExpanded && !document.fullscreenElement) {
        event.preventDefault();
        control.current.screenExpanded = false;
        setExpanded(false);
      }
    };
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("keydown", escape);
      control.current.screenExpanded = false;
      if (fullscreenOwner.current && document.fullscreenElement === fullscreenOwner.current) void document.exitFullscreen().catch(() => {});
    };
  }, [control]);

  const collapse = async () => {
    if (overlay.current && document.fullscreenElement === overlay.current && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    }
    control.current.screenExpanded = false;
    setExpanded(false);
  };
  const leave = async () => {
    await collapse();
    control.current.exitRequest++;
  };
  const complete = CAMPUS_DEMO_QUESTIONS.every((question) => answers[question.id] !== undefined);
  const submit = () => {
    if (!complete || submissionLocked.current) return;
    submissionLocked.current = true;
    setEarnedPrayer(onQuizCompleted(gradeCampusDemo(answers), CAMPUS_DEMO_QUESTIONS.length));
    setSubmitted(true);
  };
  const content = (
    <div className={`campus-computer ${expanded ? "campus-computer-expanded" : ""}`} style={expanded ? undefined : { width, height }}>
      <header className="campus-computer-bar">
        <span>J-Tech · {seat.label}</span>
        <div>
          {expanded
            ? <button type="button" onClick={() => void collapse()}>Thu nhỏ</button>
            : <button ref={expandButton} type="button" onClick={() => { control.current.screenExpanded = true; setExpanded(true); }}>Phóng to</button>}
          <button type="button" onClick={() => void leave()}>Thoát chỗ ngồi</button>
        </div>
      </header>
      <main className="campus-computer-content">
        {!started ? (
          <div className="campus-computer-welcome">
            <span aria-hidden="true">あ</span>
            <h2>Góc học tập của bạn</h2>
            <p>Thử sức với 2 câu hỏi tiếng Nhật ngay tại máy tính này.</p>
            <button className="campus-computer-primary" type="button" onClick={() => setStarted(true)}>Làm bài kiểm tra</button>
            <p className="campus-computer-prayer-hint">Đúng từ 50% số câu hỏi để nhận 1 lượt khấn Cóc Tiến Sĩ.</p>
            <small>Bài mẫu · Lượt khấn lưu trên trình duyệt theo tài khoản, điểm chưa lưu lên hệ thống.</small>
          </div>
        ) : (
          <>
            <h2>Bài kiểm tra mẫu</h2>
            <p>Chọn một đáp án cho mỗi câu rồi bấm Nộp bài.</p>
            {CAMPUS_DEMO_QUESTIONS.map((question, index) => (
              <fieldset key={question.id} className="campus-computer-question" disabled={submitted}>
                <legend>Câu {index + 1}. {question.content}</legend>
                {question.options.map((option, optionIndex) => (
                  <label key={option}>
                    <input type="radio" name={`campus-${seat.id}-${question.id}`} value={optionIndex}
                      checked={answers[question.id] === optionIndex}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} />
                    {option}
                  </label>
                ))}
                {submitted && <p data-correct={answers[question.id] === question.correct}>
                  {answers[question.id] === question.correct ? "Đúng. " : "Chưa đúng. "}{question.explanation}
                </p>}
              </fieldset>
            ))}
            {submitted ? (
              <div className="campus-computer-result" role="status">
                <strong>Bạn trả lời đúng {gradeCampusDemo(answers)}/{CAMPUS_DEMO_QUESTIONS.length} câu.</strong>
                <span className="campus-computer-prayer-result">{earnedPrayer
                  ? "Đã nhận 1 lượt khấn Cóc Tiến Sĩ!"
                  : "Chưa nhận lượt khấn. Hãy trả lời đúng từ 50% số câu và thử lại nhé."}</span>
                <button type="button" onClick={() => { submissionLocked.current = false; setAnswers({}); setSubmitted(false); setEarnedPrayer(false); }}>Làm lại</button>
              </div>
            ) : <button className="campus-computer-primary" type="button" disabled={!complete} onClick={submit}>Nộp bài</button>}
          </>
        )}
      </main>
    </div>
  );

  return (
    <Html position={seat.screen.position} quaternion={seat.screen.rotation} transform
      distanceFactor={seat.screen.width * 400 / width} zIndexRange={[35, 30]}>
      {expanded ? createPortal(
        <div ref={overlay} className="campus-computer-overlay" role="dialog" aria-modal="true" aria-label="Màn hình máy tính" tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = overlay.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
            if (!controls?.length) return;
            const first = controls[0]; const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || document.activeElement === overlay.current)) { event.preventDefault(); first.focus(); }
          }}>{content}</div>, document.body,
      ) : content}
    </Html>
  );
}
