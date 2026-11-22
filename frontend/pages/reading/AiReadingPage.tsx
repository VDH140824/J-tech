import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { getCourse, getCourses } from "../../api/courseApi";
import {
  createAiReading,
  getAiReading,
  submitAiReading,
  type AiReadingDetail,
  type AiReadingResult,
  type AiReadingScope,
} from "../../api/aiReadingApi";
import { FuriganaText } from "../../components/learning/FuriganaText";
import { scopeLabel } from "../../utils/scopeLabel";
import { ReadingQuestionList, type ReadingItemResult } from "./ReadingQuestionList";
import "./AiReadingPage.css";

const FURIGANA_KEY = "ai-reading-furigana";

function readFuriganaPreference(): boolean {
  try {
    return window.localStorage.getItem(FURIGANA_KEY) === "1";
  } catch {
    return false;
  }
}

function saveFuriganaPreference(show: boolean) {
  try {
    window.localStorage.setItem(FURIGANA_KEY, show ? "1" : "0");
  } catch {
    // Trình duyệt chặn lưu trữ: chỉ giữ lựa chọn trong phiên hiện tại.
  }
}

function positiveId(value: string | null): number | undefined {
  const id = Number(value);
  return value && Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function apiError(error: unknown): { status?: number; message?: string } {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
  return { status: response?.status, message: response?.data?.message };
}

function ErrorBox({ error, fallback }: { error: unknown; fallback: string }) {
  const { status, message } = apiError(error);
  return (
    <div className="reading-error" role="alert">
      <p>{message || fallback}</p>
      {status === 429 && (
        <Link to="/ai-reading/history">Xem lại các bài đã tạo trong Lịch sử →</Link>
      )}
    </div>
  );
}

/** Phạm vi tạo bài mới giống bài đang mở: theo bài học nếu có, nếu không theo chương, cuối cùng theo môn. */
function scopeOf(detail: AiReadingDetail): AiReadingScope {
  if (detail.lessonId) return { lessonId: detail.lessonId };
  if (detail.chapterId) return { chapterId: detail.chapterId };
  return { courseId: detail.courseId };
}

function ReadingExercise({
  detail,
  onCreateAgain,
  creating,
}: {
  detail: AiReadingDetail;
  onCreateAgain: () => void;
  creating: boolean;
}) {
  const cache = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (detail.result?.results ?? [])
        .filter((r) => r.selected)
        .map((r) => [String(r.index), r.selected as string]),
    ),
  );
  const [result, setResult] = useState<AiReadingResult | null>(detail.result);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showFurigana, setShowFurigana] = useState(readFuriganaPreference);
  const toggleFurigana = () =>
    setShowFurigana((value) => {
      saveFuriganaPreference(!value);
      return !value;
    });
  const submit = useMutation({
    mutationFn: () => submitAiReading(detail.id, answers),
    retry: false,
    onSuccess: (data) => {
      setResult(data);
      cache.setQueryData<AiReadingDetail>(["ai-reading", detail.id], (old) =>
        old ? { ...old, status: "SUBMITTED", result: data } : old,
      );
      for (const key of ["streak", "coin-history", "store-catalog", "ai-reading-history"])
        void cache.invalidateQueries({ queryKey: [key] });
    },
  });
  const answeredAll = detail.questions.every((q) => answers[String(q.index)]);
  const results = result
    ? Object.fromEntries(result.results.map((r): [string, ReadingItemResult] => [String(r.index), r]))
    : undefined;

  return (
    <article className="reading-article">
      <header className="reading-header">
        <span>ĐỌC HIỂU AI · {scopeLabel(detail.courseName, detail.chapterNo)}</span>
        <h1 lang="ja">
          <FuriganaText text={detail.title} showReading={showFurigana} />
        </h1>
      </header>
      <div className="reading-tools">
        <button
          type="button"
          className="reading-furigana-toggle"
          aria-pressed={showFurigana}
          onClick={toggleFurigana}
        >
          <span lang="ja">ふりがな</span> {showFurigana ? "Ẩn" : "Hiện"}
        </button>
      </div>
      <div className={`reading-passage ${showFurigana ? "with-furigana" : ""}`} lang="ja">
        <FuriganaText text={detail.passageJp} showReading={showFurigana} />
      </div>
      {result && result.translationVi && (
        <div className="reading-translation">
          <button type="button" className="reading-link-btn" onClick={() => setShowTranslation((v) => !v)}>
            {showTranslation ? "Ẩn bản dịch" : "Hiện bản dịch"}
          </button>
          {showTranslation && <p>{result.translationVi}</p>}
        </div>
      )}
      <section aria-label="Câu hỏi">
        <ReadingQuestionList
          name={`reading-${detail.id}`}
          items={detail.questions.map((q) => ({ key: String(q.index), content: q.content, options: q.options }))}
          answers={answers}
          onAnswer={(key, letter) => setAnswers((prev) => ({ ...prev, [key]: letter }))}
          results={results}
          showReading={showFurigana}
        />
      </section>
      {result ? (
        <div className={`reading-result ${result.passed ? "passed" : ""}`} role="status">
          <strong>
            Đúng {result.correct}/{result.total} câu · {Number(result.score)} điểm
          </strong>
          <span>
            {result.passed ? "Đạt yêu cầu." : `Cần đạt ${Number(result.passingScore)} điểm để hoàn thành.`}
            {result.coinsAwarded > 0 && ` Nhận ${result.coinsAwarded} coin.`}
          </span>
          <div className="reading-result-actions">
            <button type="button" disabled={creating} onClick={onCreateAgain}>
              {creating ? "AI đang soạn…" : "Tạo bài mới"}
            </button>
            <Link to="/ai-reading/history">Lịch sử</Link>
          </div>
        </div>
      ) : (
        <div className="reading-actions">
          {submit.isError && <ErrorBox error={submit.error} fallback="Không nộp được bài. Vui lòng thử lại." />}
          <button type="button" disabled={!answeredAll || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Đang chấm…" : "Nộp bài"}
          </button>
        </div>
      )}
    </article>
  );
}

function ScopePicker({
  initialCourseId,
  initialChapterId,
  disabled,
  onCreate,
}: {
  initialCourseId?: number;
  initialChapterId?: number | null;
  disabled: boolean;
  onCreate: (scope: AiReadingScope) => void;
}) {
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const [pickedCourse, setPickedCourse] = useState<number>();
  const [pickedChapter, setPickedChapter] = useState<number | "">();
  const courseId = pickedCourse ?? initialCourseId ?? courses.data?.[0]?.id;
  const course = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId as number),
    enabled: courseId !== undefined,
  });
  const chapterId =
    pickedChapter !== undefined
      ? pickedChapter
      : pickedCourse === undefined && initialChapterId
        ? initialChapterId
        : "";
  const chapters = [...(course.data?.chapters ?? [])].sort((a, b) => a.chapterNo - b.chapterNo);

  return (
    <section className="reading-picker" aria-label="Chọn phạm vi tạo bài đọc">
      <div className="reading-picker-courses" role="group" aria-label="Chọn môn">
        {(courses.data ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === courseId}
            onClick={() => {
              setPickedCourse(c.id);
              setPickedChapter("");
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
      <label className="reading-picker-chapter">
        <span>Bài</span>
        <select
          value={chapterId}
          disabled={!chapters.length}
          onChange={(event) => setPickedChapter(event.target.value ? Number(event.target.value) : "")}
        >
          <option value="">Tất cả các bài</option>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              Bài {chapter.chapterNo}: {chapter.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="reading-create"
        disabled={disabled || courseId === undefined}
        onClick={() => onCreate(chapterId ? { chapterId } : { courseId })}
      >
        {disabled ? "AI đang soạn…" : "Tạo bài đọc"}
      </button>
      <Link className="reading-history-link" to="/ai-reading/history">
        Lịch sử
      </Link>
    </section>
  );
}

export function AiReadingPage() {
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const sessionId = positiveId(params.get("session"));
  const lessonId = positiveId(params.get("lessonId"));
  const autoCreated = useRef<number>();

  const reading = useQuery({
    queryKey: ["ai-reading", sessionId],
    queryFn: () => getAiReading(sessionId as number),
    enabled: sessionId !== undefined,
    retry: false,
  });
  const create = useMutation({
    mutationFn: createAiReading,
    retry: false,
    onSuccess: (data) => {
      cache.setQueryData(["ai-reading", data.id], data);
      void cache.invalidateQueries({ queryKey: ["ai-reading-history"] });
      // Ghi session lên URL để tải lại trang không mất bài.
      setParams({ session: String(data.id) }, { replace: true });
    },
  });

  // Mở từ bài học: tạo ngay một lần (StrictMode chạy effect 2 lần; server cũng dùng lại bài chưa nộp).
  useEffect(() => {
    if (sessionId !== undefined || lessonId === undefined || autoCreated.current === lessonId) return;
    autoCreated.current = lessonId;
    create.mutate({ lessonId });
  }, [sessionId, lessonId, create]);

  const detail = sessionId !== undefined ? reading.data : undefined;

  return (
    <main className="reading-page">
      <ScopePicker
        key={detail?.id ?? "new"}
        initialCourseId={detail?.courseId}
        initialChapterId={detail?.chapterId}
        disabled={create.isPending}
        onCreate={(scope) => create.mutate(scope)}
      />
      {create.isPending && (
        <div className="reading-loading" role="status">
          <span className="reading-spinner" aria-hidden="true" />
          AI đang soạn bài đọc…
        </div>
      )}
      {create.isError && <ErrorBox error={create.error} fallback="Không tạo được bài đọc. Vui lòng thử lại." />}
      {sessionId !== undefined && reading.isLoading && (
        <p className="reading-state" role="status">
          Đang tải bài đọc…
        </p>
      )}
      {sessionId !== undefined && reading.isError && (
        <ErrorBox error={reading.error} fallback="Không tải được bài đọc. Vui lòng thử lại." />
      )}
      {detail ? (
        <ReadingExercise
          key={detail.id}
          detail={detail}
          creating={create.isPending}
          onCreateAgain={() => create.mutate(scopeOf(detail))}
        />
      ) : (
        sessionId === undefined &&
        lessonId === undefined &&
        !create.isPending && (
          <p className="reading-state">
            Chọn môn và bài rồi nhấn “Tạo bài đọc”. AI sẽ soạn một đoạn văn kèm 5 câu hỏi trắc nghiệm dựa trên từ
            vựng, ngữ pháp và chữ Hán đã học.
          </p>
        )
      )}
    </main>
  );
}
