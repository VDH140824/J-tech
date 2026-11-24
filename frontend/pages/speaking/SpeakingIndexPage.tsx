import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getCourses } from "../../api/courseApi";
import { getSpeakingScenarios } from "../../api/speakingApi";
import { getStudentChapters } from "../../api/studentChapterApi";
import "../home/StudentLearningPage.css";
import "./SpeakingPage.css";

/** Trang tổng hợp luyện nói: chọn khóa học, liệt kê các chương có tình huống hội thoại. */
export function SpeakingIndexPage() {
  const courses = useQuery({ queryKey: ["courses"], queryFn: getCourses });
  const [tab, setTab] = useState<number>();
  const courseId = tab ?? courses.data?.[0]?.id;
  const chapters = useQuery({
    queryKey: ["student-chapters", courseId],
    queryFn: ({ signal }) => getStudentChapters(courseId!, signal),
    enabled: courseId !== undefined,
  });
  const chapterList = chapters.data?.chapters ?? [];
  // Cùng query key với trang khóa học nên dùng chung cache.
  const scenarioQueries = useQueries({
    queries: chapterList.map((chapter) => ({
      queryKey: ["speaking-scenarios", chapter.id],
      queryFn: () => getSpeakingScenarios(chapter.id),
    })),
  });
  const rows = chapterList
    .map((chapter, i) => ({ chapter, scenarios: scenarioQueries[i]?.data ?? [] }))
    .filter((row) => row.scenarios.length > 0);
  const loading =
    courses.isLoading || chapters.isLoading || scenarioQueries.some((q) => q.isLoading);
  const failed = courses.isError || chapters.isError;

  return (
    <div className="student-learning-page speaking-page">
      <div className="admin-page-container">
        <div className="admin-page-header">
          <div className="admin-header-titles">
            <h2 className="admin-main-title">
              Luyện nói với AI <span className="speaking-title-jp">会話</span>
            </h2>
            <p className="admin-main-subtitle">
              Chọn một chương để luyện hội thoại theo tình huống.
            </p>
          </div>
        </div>

        <div className="speaking-tabs" role="tablist" aria-label="Chọn khóa học">
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

        <div role="tabpanel">
          {failed ? (
            <div className="admin-empty-state" role="alert">
              <h3>Không thể tải danh sách luyện nói</h3>
              <button
                className="mod-btn-back"
                onClick={() => {
                  courses.refetch();
                  chapters.refetch();
                }}
              >
                Thử lại
              </button>
            </div>
          ) : loading ? (
            <div className="admin-loading-state" role="status">
              Đang tải tình huống luyện nói...
            </div>
          ) : rows.length === 0 ? (
            <div className="admin-empty-state">
              <h3>Khóa học này chưa có tình huống luyện nói</h3>
              <p>Hãy quay lại sau khi bài hội thoại được thêm vào.</p>
            </div>
          ) : (
            <div className="speaking-grid">
              {rows.map(({ chapter, scenarios }) => {
                const practiced = scenarios.filter((s) => s.completedCount > 0).length;
                return (
                  <article className="speaking-scn" key={chapter.id}>
                    <h3>
                      Chương {chapter.chapterNo}: {chapter.title}
                    </h3>
                    <p>
                      {scenarios.length} tình huống · đã luyện {practiced}/{scenarios.length}
                    </p>
                    <footer>
                      <Link
                        className="speaking-btn"
                        to={`/courses/${courseId}/chapters/${chapter.id}/speaking`}
                        state={{ from: "/speaking" }}
                      >
                        Vào luyện nói →
                      </Link>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
