import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Matrix4, Vector3 } from "three";
import {
  campusQuizError,
  getCampusQuizCourses,
  startCampusQuiz,
  submitCampusQuiz,
  type CampusQuizAnswer,
  type CampusQuizCourse,
  type CampusQuizResult,
  type CampusQuizSession,
  type CampusQuizSubmissionMode,
} from "../api/campusQuizApi";
import type { CampusSeat, SeatingControl } from "./campusSeating";

const screenOrigin = () => [0, 0];

function formatRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CampusComputer({ seat, control, awardPrayerOnce }: {
  seat: CampusSeat;
  control: MutableRefObject<SeatingControl>;
  awardPrayerOnce: (sessionId: string) => boolean;
}) {
  const [courses, setCourses] = useState<CampusQuizCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [courseReload, setCourseReload] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [session, setSession] = useState<CampusQuizSession | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const autoSubmitStarted = useRef(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submittedAnswers, setSubmittedAnswers] = useState<CampusQuizAnswer[] | null>(null);
  const [result, setResult] = useState<CampusQuizResult | null>(null);
  const [quizError, setQuizError] = useState("");
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
  const [earnedPrayer, setEarnedPrayer] = useState(false);
  const [pending, setPending] = useState<"start" | "submit" | null>(null);
  const requestInProgress = useRef(false);
  const quizContent = useRef<HTMLElement>(null);
  const questionHeading = useRef<HTMLLegendElement>(null);
  const focusQuestion = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const nativeFullscreen = useRef(false);
  const fullscreenOwner = useRef<HTMLDivElement | null>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const wasExpanded = useRef(false);
  const expandRequest = useRef(control.current.expandRequest);
  const width = 720;
  const height = width * seat.screen.height / seat.screen.width;
  const { camera, gl, size } = useThree();
  const screenSurface = useRef<HTMLDivElement>(null);
  const screenPortal = useMemo(() => ({ current: gl.domElement.parentElement! }), [gl]);
  const surfaceMatrix = useMemo(() => {
    const scale = seat.screen.width / width;
    // CSS starts at the top-left; the model's screen position is its center.
    return new Matrix4()
      .compose(seat.screen.position, seat.screen.rotation, new Vector3(scale, -scale, 1))
      .multiply(new Matrix4().makeTranslation(-width / 2, -height / 2, 0));
  }, [seat, width, height]);
  const projection = useMemo(() => new Matrix4(), []);

  useEffect(() => {
    const load = new AbortController();
    setCoursesLoading(true);
    setCoursesError("");
    void getCampusQuizCourses(load.signal)
      .then((data) => {
        if (!load.signal.aborted) setCourses(data);
      })
      .catch(() => {
        if (!load.signal.aborted) setCoursesError("Không thể tải danh sách khóa học.");
      })
      .finally(() => {
        if (!load.signal.aborted) setCoursesLoading(false);
      });
    return () => load.abort();
  }, [courseReload]);

  useEffect(() => {
    if (deadline === null || result || sessionUnavailable) return;
    const endsAt = deadline;
    let timeout: number | undefined;
    function tick() {
      window.clearTimeout(timeout);
      const remainingMs = Math.max(0, endsAt - performance.now());
      setSecondsLeft(Math.ceil(remainingMs / 1_000));
      if (remainingMs > 0) {
        // Refresh on the next displayed second, including the deadline.
        timeout = window.setTimeout(tick, remainingMs % 1_000 || 1_000);
      }
    }
    tick();
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline, result, sessionUnavailable]);

  useEffect(() => {
    if (quizContent.current) quizContent.current.scrollTop = 0;
    if (focusQuestion.current) {
      questionHeading.current?.focus({ preventScroll: true });
      focusQuestion.current = false;
    }
  }, [session, currentQuestion, result]);

  useFrame(() => {
    if (screenSurface.current && !expanded) {
      camera.updateMatrixWorld();
      // Project the actual screen plane into canvas pixels. Keep perspective
      // in the matrix so all four edges stay attached to a tilted laptop.
      projection.set(
        size.width / 2, 0, 0, size.width / 2,
        0, -size.height / 2, 0, size.height / 2,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(surfaceMatrix);
      screenSurface.current.style.transform = `matrix3d(${projection.elements.join(",")})`;
    }
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
  const selectedCourse = courses.find((course) => String(course.id) === selectedCourseId);
  const question = session?.questions[currentQuestion];
  const review = result?.questionResults.find((item) => item.questionId === question?.id);
  const timeExpired = deadline !== null && secondsLeft === 0;
  const quizDurationSeconds = session ? (Date.parse(session.expiresAt) - Date.parse(session.serverTime)) / 1_000 : 0;
  const percentLeft = quizDurationSeconds > 0 ? Math.min(100, secondsLeft / quizDurationSeconds * 100) : 0;

  function resetQuiz() {
    setSession(null);
    setDeadline(null);
    setSecondsLeft(0);
    autoSubmitStarted.current = false;
    setAnswers({});
    setCurrentQuestion(0);
    setSubmittedAnswers(null);
    setResult(null);
    setQuizError("");
    setSessionUnavailable(false);
    setEarnedPrayer(false);
  }

  async function start() {
    if (!selectedCourse || requestInProgress.current) return;
    requestInProgress.current = true;
    resetQuiz();
    setPending("start");
    try {
      const data = await startCampusQuiz(selectedCourse.id);
      const remainingMs = Date.parse(data.expiresAt) - Date.parse(data.serverTime);
      setDeadline(performance.now() + remainingMs);
      setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1_000)));
      focusQuestion.current = true;
      setSession(data);
    } catch (error) {
      const failure = campusQuizError(error, "Không thể bắt đầu bài kiểm tra. Vui lòng thử lại.");
      setQuizError(failure.message);
      if (failure.code === "COURSE_UNAVAILABLE") {
        setSelectedCourseId("");
        setCourseReload((value) => value + 1);
      }
    } finally {
      requestInProgress.current = false;
      setPending(null);
    }
  }

  function goToQuestion(index: number) {
    if (index === currentQuestion) {
      questionHeading.current?.focus();
      return;
    }
    focusQuestion.current = true;
    setCurrentQuestion(index);
  }

  const submit = useCallback(async (requestedMode: CampusQuizSubmissionMode) => {
    if (!session || deadline === null || result || sessionUnavailable || requestInProgress.current) return;

    const mode = performance.now() >= deadline ? "TIMEOUT" : requestedMode;
    if (mode === "TIMEOUT") {
      autoSubmitStarted.current = true;
      setSecondsLeft(0);
    }

    const payload = submittedAnswers ?? session.questions.flatMap((item) => {
      const optionId = answers[item.id];
      return optionId === undefined ? [] : [{ questionId: item.id, optionId }];
    });
    requestInProgress.current = true;
    setSubmittedAnswers(payload);
    setQuizError("");
    setPending("submit");
    try {
      const data = await submitCampusQuiz(session.sessionId, payload, mode);
      setEarnedPrayer(data.prayerEligible && awardPrayerOnce(data.sessionId));
      setResult(data);
      setCurrentQuestion(0);
    } catch (error) {
      const failure = campusQuizError(error, "Chưa nhận được kết quả. Vui lòng thử nộp lại.");
      if (failure.code === "DEADLINE_PASSED") {
        setDeadline(performance.now());
        setSecondsLeft(0);
      } else {
        setQuizError(failure.message);
        if (failure.code === "SESSION_UNAVAILABLE" || failure.code === "SUBMISSION_ANSWERS_CHANGED") {
          setSessionUnavailable(true);
        } else if (failure.code === "INVALID_ANSWERS" || failure.code === "INVALID_REQUEST") {
          setSubmittedAnswers(null);
        }
      }
    } finally {
      requestInProgress.current = false;
      setPending(null);
    }
  }, [session, deadline, result, sessionUnavailable, answers, submittedAnswers, awardPrayerOnce]);

  useEffect(() => {
    if (timeExpired && pending === null && !autoSubmitStarted.current) {
      void submit("TIMEOUT");
    }
  }, [timeExpired, pending, submit]);

  const content = (
    <div className={`campus-computer ${expanded ? "campus-computer-expanded" : ""}`}>
      <header className="campus-computer-bar">
        <span>J-Tech · {seat.label}</span>
        <div>
          {expanded
            ? <button type="button" onClick={() => void collapse()}>Thu nhỏ</button>
            : <button ref={expandButton} type="button" onClick={() => { control.current.screenExpanded = true; setExpanded(true); }}>Phóng to</button>}
          <button type="button" disabled={pending === "submit"} onClick={() => void leave()}>Thoát chỗ ngồi</button>
        </div>
      </header>
      <main className="campus-computer-content" ref={quizContent}>
        <h2>{result ? "Kết quả bài kiểm tra" : "Bài kiểm tra Campus 3D"}</h2>
        {!session || !question ? (
          <form className="campus-computer-course" onSubmit={(event) => { event.preventDefault(); void start(); }}>
            <p>Trả lời đúng ít nhất 25/50 câu để nhận 100 xu và 1 lượt rút quẻ. Bài sẽ tự nộp khi hết giờ.</p>
            {coursesLoading ? <p role="status">Đang tải khóa học…</p>
              : coursesError ? (
                <>
                  <p role="alert">{coursesError}</p>
                  <button type="button" onClick={() => setCourseReload((value) => value + 1)}>Tải lại khóa học</button>
                </>
              ) : courses.length === 0 ? <p>Hiện chưa có khóa học khả dụng.</p>
                : (
                  <>
                    <label>
                      Khóa học
                      <select value={selectedCourseId} disabled={pending === "start"} onChange={(event) => {
                        setSelectedCourseId(event.target.value);
                        setQuizError("");
                      }}>
                        <option value="">Chọn khóa học</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>{course.code} · {course.name}</option>
                        ))}
                      </select>
                    </label>
                    <button className="campus-computer-primary" type="submit" disabled={!selectedCourse || pending !== null}>
                      {pending === "start" ? "Đang chuẩn bị đề…" : "Bắt đầu"}
                    </button>
                  </>
                )}
            {quizError && <p className="campus-computer-error" role="alert">{quizError}</p>}
          </form>
        ) : (
          <>
            {result ? (
              <section className="campus-computer-result">
                <div className="campus-computer-rewards" role="status">
                  <strong>{result.passed ? "Đạt" : "Chưa đạt"} · {result.correctCount}/{result.totalCount} câu đúng</strong>
                  <span>Xu nhận được: {result.coinAwarded}</span>
                  <span>Lượt rút quẻ: {earnedPrayer ? "1" : result.prayerEligible ? "Chưa lưu được" : "0"}</span>
                </div>
                {result.prayerEligible && !earnedPrayer && (
                  <button type="button" onClick={() => setEarnedPrayer(awardPrayerOnce(result.sessionId))}>Thử lưu lượt rút quẻ</button>
                )}
                <button type="button" onClick={resetQuiz}>Làm bài mới</button>
              </section>
            ) : (
              <>
                <div className="campus-computer-timer" data-low-time={secondsLeft <= 300}>
                  <div className="campus-computer-timer-label">
                    <span>Thời gian còn lại</span>
                    <strong role="timer">{formatRemainingTime(secondsLeft)}</strong>
                  </div>
                  <div className="campus-computer-timer-track" aria-hidden="true">
                    <div className="campus-computer-timer-fill" style={{ width: `${percentLeft}%` }} />
                  </div>
                  {timeExpired && pending === "submit" && <span role="status">Đã hết giờ. Đang nộp bài…</span>}
                </div>
                <p aria-live="polite">Đã trả lời {Object.keys(answers).length}/{session.questions.length}</p>
              </>
            )}

            <fieldset className="campus-computer-question" disabled={!!result || !!submittedAnswers || sessionUnavailable || timeExpired}>
              <legend ref={questionHeading} tabIndex={-1}>Câu {currentQuestion + 1}. {question.content}</legend>
              {question.mediaUrl && (
                <a href={question.mediaUrl} target="_blank" rel="noreferrer">Mở nội dung đính kèm của câu hỏi</a>
              )}
              {question.options.map((option) => (
                <label key={option.id}>
                  <input type="radio" name={`campus-${seat.id}-${question.id}`} value={option.id}
                    checked={(review ? review.selectedOptionId : answers[question.id]) === option.id}
                    onChange={() => {
                      if (deadline !== null && performance.now() < deadline) {
                        setAnswers((current) => ({ ...current, [question.id]: option.id }));
                      }
                    }} />
                  {option.text}
                  {review?.correctOptionId === option.id && <strong className="campus-computer-correct">Đáp án đúng</strong>}
                </label>
              ))}
              {review && <p data-correct={review.selectedOptionId === review.correctOptionId}>
                {review.selectedOptionId === null ? "Bạn chưa trả lời câu này."
                  : review.selectedOptionId === review.correctOptionId ? "Bạn trả lời đúng." : "Bạn trả lời sai."} {review.explanation}
              </p>}
            </fieldset>
            <div className="campus-computer-nav">
              <button type="button" disabled={currentQuestion === 0} onClick={() => goToQuestion(currentQuestion - 1)}>Câu trước</button>
              <button type="button" disabled={currentQuestion === session.questions.length - 1} onClick={() => goToQuestion(currentQuestion + 1)}>Câu tiếp</button>
              {!result && (sessionUnavailable ? (
                <button className="campus-computer-primary" type="button" onClick={resetQuiz}>Làm bài mới</button>
              ) : (
                <button className="campus-computer-primary" type="button"
                  disabled={pending === "submit" || (timeExpired && !quizError)}
                  onClick={() => void submit(timeExpired ? "TIMEOUT" : "MANUAL")}>
                  {pending === "submit" ? "Đang nộp…" : submittedAnswers || timeExpired ? "Thử nộp lại" : "Nộp bài"}
                </button>
              ))}
            </div>
            {quizError && <p className="campus-computer-error" role="alert">{quizError}</p>}
            <nav className="campus-computer-question-nav" aria-label="Danh sách câu hỏi">
              {session.questions.map((item, index) => {
                const answered = answers[item.id] !== undefined;
                return (
                  <button key={item.id} type="button" data-answered={answered}
                    aria-current={index === currentQuestion ? "step" : undefined}
                    aria-label={`Câu ${index + 1}, ${answered ? "đã trả lời" : "chưa trả lời"}`}
                    onClick={() => goToQuestion(index)}>{index + 1}</button>
                );
              })}
            </nav>
          </>
        )}
      </main>
    </div>
  );

  return (
    <Html position={seat.screen.position} portal={screenPortal} calculatePosition={screenOrigin}
      style={{ pointerEvents: "none" }} zIndexRange={[35, 30]}>
      {expanded ? createPortal(
        <div ref={overlay} className="campus-computer-overlay" role="dialog" aria-modal="true" aria-label="Màn hình máy tính" tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = overlay.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]",
            );
            if (!controls?.length) return;
            const first = controls[0]; const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || document.activeElement === overlay.current)) { event.preventDefault(); first.focus(); }
          }}>{content}</div>, document.body,
      ) : <div ref={screenSurface} className="campus-computer-surface" style={{ width, height }}>{content}</div>}
    </Html>
  );
}
