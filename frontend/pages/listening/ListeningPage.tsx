import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { getCourses } from "../../api/courseApi";
import {
  getListening,
  getListeningList,
  submitListening,
  type ListeningDetail,
  type ListeningResult,
} from "../../api/listeningApi";
import { ScriptSpeechButton } from "../../components/learning/ScriptSpeechButton";
import { scopeLabel } from "../../utils/scopeLabel";
import { ListeningQuestionList, type ListeningItemResult } from "./ListeningQuestionList";
import "./ListeningPage.css";

function errorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
  return response?.data?.message || fallback;
}

function ListeningExercise({ detail }: { detail: ListeningDetail }) {
  const cache = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ListeningResult>();
  const [showScript, setShowScript] = useState(false);
  const submit = useMutation({
    mutationFn: () => submitListening(detail.lessonId, answers),
    retry: false,
    onSuccess: (data) => {
      setResult(data);
      for (const key of ["streak", "coin-history", "store-catalog", "listening-list", "listening"])
        void cache.invalidateQueries({ queryKey: [key] });
    },
  });
  const answeredAll = detail.questions.every((q) => answers[String(q.id)]);
  const results = result
    ? Object.fromEntries(
        result.results.map((r): [string, ListeningItemResult] => [String(r.questionId), r]),
      )
    : undefined;
  const restart = () => {
    setAnswers({});
    setResult(undefined);
    setShowScript(false);
    submit.reset();
  };

  return (
    <>
      <section className="listening-player" aria-label="Nghe đoạn hội thoại">
        <ScriptSpeechButton text={detail.scriptJp} audioUrl={detail.audioUrl} />
        {result && (
          <button type="button" className="listening-link-btn" onClick={() => setShowScript((v) => !v)}>
            {showScript ? "Ẩn lời thoại" : "Hiện lời thoại"}
          </button>
        )}
        {result && showScript && (
          <div className="listening-script">
            <p lang="ja">{detail.scriptJp}</p>
            {result.scriptVi && <p className="listening-script-vi">{result.scriptVi}</p>}
          </div>
        )}
      </section>

      {!detail.questions.length ? (
        <p className="listening-state">Bài nghe này chưa có câu hỏi.</p>
      ) : (
        <section aria-label="Câu hỏi">
          <ListeningQuestionList
            name={`listening-${detail.lessonId}`}
            items={detail.questions.map((q) => ({ key: String(q.id), content: q.content, options: q.options }))}
            answers={answers}
            onAnswer={(key, letter) => setAnswers((prev) => ({ ...prev, [key]: letter }))}
            results={results}
          />
          {result ? (
            <div className={`listening-result ${result.passed ? "passed" : ""}`} role="status">
              <strong>
                Đúng {result.correct}/{result.total} câu · {Number(result.score)} điểm
              </strong>
              <span>
                {result.passed
                  ? "Đạt yêu cầu."
                  : `Cần đạt ${Number(result.passingScore)} điểm để hoàn thành.`}
                {result.coinsAwarded > 0 && ` Nhận ${result.coinsAwarded} coin.`}
                {result.completed && " Đã hoàn thành ✓"}
              </span>
              <button type="button" onClick={restart}>
                Làm lại
              </button>
            </div>
          ) : (
            <div className="listening-actions">
              {submit.isError && (
                <p role="alert">{errorMessage(submit.error, "Không nộp được bài. Vui lòng thử lại.")}</p>
              )}
              <button
                type="button"
                disabled={!answeredAll || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? "Đang chấm…" : "Nộp bài"}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function ListeningSidebar({ currentLessonId, currentCourseId }: { currentLessonId: number; currentCourseId?: number }) {
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const [tab, setTab] = useState<number>();
  const courseId = tab ?? currentCourseId ?? courses.data?.[0]?.id;
  const list = useQuery({
    queryKey: ["listening-list", courseId],
    queryFn: () => getListeningList(courseId),
    enabled: courseId !== undefined,
  });
  const currentRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [list.data, currentLessonId]);

  return (
    <aside className="listening-sidebar" aria-label="Các bài nghe khác">
      <div className="listening-tabs" role="tablist" aria-label="Chọn môn">
        {(courses.data ?? []).map((course) => (
          <button
            key={course.id}
            type="button"
            role="tab"
            aria-selected={course.id === courseId}
            onClick={() => setTab(course.id)}
          >
            {course.name}
          </button>
        ))}
      </div>
      <div className="listening-sidebar-list" role="tabpanel">
        {list.isLoading ? (
          <p className="listening-state">Đang tải…</p>
        ) : list.isError ? (
          <p className="listening-state" role="alert">
            Không tải được danh sách bài nghe.
          </p>
        ) : !list.data?.length ? (
          <p className="listening-state">Chưa có bài nghe nào.</p>
        ) : (
          <ul>
            {list.data.map((item) => {
              const current = item.lessonId === currentLessonId;
              return (
                <li key={item.lessonId}>
                  <Link
                    ref={current ? currentRef : undefined}
                    to={`/listening/${item.lessonId}`}
                    aria-current={current ? "page" : undefined}
                    className={current ? "current" : undefined}
                  >
                    <span className="listening-item-title">{item.title}</span>
                    <span className="listening-item-sub">
                      {scopeLabel(item.courseName, item.chapterNo)}
                      {item.completed && <span className="listening-item-done"> · ✓</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

/** Mở từ menu: chuyển tới bài nghe đầu tiên của môn đầu tiên. */
export function ListeningIndexPage() {
  const list = useQuery({ queryKey: ["listening-list", "all"], queryFn: () => getListeningList() });
  const first = list.data?.[0];
  if (first) return <Navigate to={`/listening/${first.lessonId}`} replace />;
  return (
    <main className="listening-page">
      <div className="listening-main">
        {list.isLoading ? (
          <p className="listening-state" role="status">
            Đang tải bài nghe…
          </p>
        ) : list.isError ? (
          <div className="listening-state" role="alert">
            <p>{errorMessage(list.error, "Không tải được danh sách bài nghe.")}</p>
            <button type="button" onClick={() => void list.refetch()}>
              Thử lại
            </button>
          </div>
        ) : (
          <p className="listening-state">Chưa có bài nghe nào.</p>
        )}
      </div>
    </main>
  );
}

export function ListeningPage() {
  const { lessonId } = useParams();
  const id = Number(lessonId);
  const valid = Number.isSafeInteger(id) && id > 0;
  const detail = useQuery({
    queryKey: ["listening", id],
    queryFn: () => getListening(id),
    enabled: valid,
    retry: false,
  });

  return (
    <main className="listening-page">
      <div className="listening-main">
        {detail.data && (
          <Link className="listening-back" to={`/courses/${detail.data.courseId}`}>
            ← Quay lại khóa học
          </Link>
        )}
        {!valid ? (
          <p className="listening-state" role="alert">
            Bài nghe không hợp lệ.
          </p>
        ) : detail.isLoading ? (
          <p className="listening-state" role="status">
            Đang tải bài nghe…
          </p>
        ) : detail.isError || !detail.data ? (
          <div className="listening-state" role="alert">
            <p>{errorMessage(detail.error, "Không tải được bài nghe. Vui lòng thử lại.")}</p>
            <button type="button" onClick={() => void detail.refetch()}>
              Thử lại
            </button>
          </div>
        ) : (
          <>
            <header className="listening-header">
              <span>NGHE HIỂU · {scopeLabel(detail.data.courseName, detail.data.chapterNo)}</span>
              <h1>{detail.data.title}</h1>
              {detail.data.completed && <p className="listening-done">Đã hoàn thành ✓</p>}
            </header>
            <ListeningExercise key={detail.data.lessonId} detail={detail.data} />
          </>
        )}
      </div>
      <ListeningSidebar currentLessonId={id} currentCourseId={detail.data?.courseId} />
    </main>
  );
}
