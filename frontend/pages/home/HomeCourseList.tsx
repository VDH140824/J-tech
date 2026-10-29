import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { getCourse, getCourses } from "../../api/courseApi";

export function HomeCourseList({ renderArt }: { renderArt: (index: number) => ReactNode }) {
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get("courseId")) || null;
  const courses = useQuery({ queryKey: ["home-courses"], queryFn: getCourses });
  const detail = useQuery({
    queryKey: ["course", selectedId],
    queryFn: () => getCourse(selectedId!),
    enabled: selectedId !== null && selectedId > 0,
  });
  function select(id: number | null) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (id) next.set("courseId", String(id)); else next.delete("courseId");
      return next;
    });
  }
  return <>
    {courses.isLoading && <p role="status">Đang tải danh sách môn học…</p>}
    {courses.isError && <div role="alert">Không tải được danh sách môn học. <button type="button" onClick={() => courses.refetch()}>Thử lại</button></div>}
    {courses.isSuccess && !courses.data.length && <p>Chưa có môn học được xuất bản.</p>}
    <div className="course-cards-grid">
      {courses.data?.map((course, index) => <button type="button" key={course.id}
        className={`course-card home-course-button ${["pink-card", "blue-card", "green-card", "orange-card"][index % 4]} ${selectedId === course.id ? "home-course-selected" : ""}`}
        aria-expanded={selectedId === course.id} aria-controls="home-chapter-list"
        onClick={() => select(selectedId === course.id ? null : course.id)}>
        <span className="card-art-box">{renderArt(index)}</span>
        <span className="course-card-body"><span className="course-title">{course.name}</span><span className="course-level">{course.code}</span>
          <span className="course-progress-wrapper"><span className="course-progress-info"><span className="progress-text">{course.chapterCount} chương</span><span className="circle-arrow-btn blue-btn" aria-hidden="true">{selectedId === course.id ? "⌃" : "→"}</span></span></span>
        </span>
      </button>)}
    </div>
    {selectedId && <section id="home-chapter-list" className="home-chapter-panel" aria-label="Danh sách chương">
      <div className="home-chapter-header"><h3>Danh sách chương{detail.data ? ` · ${detail.data.name}` : ""}</h3><button type="button" onClick={() => select(null)}>Thu gọn</button></div>
      {detail.isLoading && <p role="status">Đang tải danh sách chương…</p>}
      {detail.isError && <div role="alert">Không tải được danh sách chương. <button type="button" onClick={() => detail.refetch()}>Thử lại</button></div>}
      {detail.data && (detail.data.chapters.length ? <ul className="home-chapter-list">
        {detail.data.chapters.map(chapter => <li key={chapter.id}>
          <Link to={`/courses/${selectedId}/chapters/${chapter.id}`}><span className="home-chapter-number">Chương {chapter.chapterNo}</span><span><strong>{chapter.title}</strong>{chapter.description && <small>{chapter.description}</small>}</span><span className="home-chapter-open">Vào học →</span></Link>
        </li>)}
      </ul> : <p>Chưa có chương được xuất bản.</p>)}
    </section>}
  </>;
}
