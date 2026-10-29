import { useEffect, useState } from "react";
import { getCourses, getCourse, type CourseSummary, type CourseDetail, type ChapterSummary } from "../../api/courseApi";
import type { ModeratorNavState } from "./ModeratorPortalPage";

interface ModeratorCoursesTabProps {
  onViewChapter: (state: ModeratorNavState) => void;
  initialCourseId?: number;
  readOnly?: boolean;
}

export function ModeratorCoursesTab({ onViewChapter, initialCourseId, readOnly = false }: ModeratorCoursesTabProps) {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Expanded course detail map
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleCourse = async (courseId: number) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      setCourseDetail(null);
      return;
    }
    setExpandedCourseId(courseId);
    setLoadingDetail(true);
    const selectedCourse = courses.find((c) => c.id === courseId);
    try {
      const detail = await getCourse(courseId);
      if (readOnly || (detail && detail.chapters && detail.chapters.length > 0)) {
        setCourseDetail(detail);
      } else {
        // Fallback default chapters if empty
        setCourseDetail({
          id: courseId,
          code: selectedCourse?.code || "JPD",
          name: selectedCourse?.name || "Khóa học tiếng Nhật",
          description: selectedCourse?.description,
          chapters: [
            { id: 1, chapterNo: 1, title: "Chương 1: Giới thiệu bản thân", description: "Làm quen với tiếng Nhật, bảng chữ cái, ngữ pháp và từ vựng cơ bản" },
            { id: 2, chapterNo: 2, title: "Chương 2: Đồ vật xung quanh", description: "Chỉ thị từ これ, それ, あれ và đồ dùng hàng ngày" },
            { id: 3, chapterNo: 3, title: "Chương 3: Nơi chốn và vị trí", description: "Chỉ vị trí ここ, そこ, あそこ và hỏi giá cả" },
          ],
        });
      }
    } catch {
      if (readOnly) { setCourseDetail(null); return; }
      // Fallback for offline/preview
      setCourseDetail({
        id: courseId,
        code: selectedCourse?.code || "JPD",
        name: selectedCourse?.name || "Khóa học tiếng Nhật",
        description: selectedCourse?.description,
        chapters: [
          { id: 1, chapterNo: 1, title: "Chương 1: Giới thiệu bản thân", description: "Làm quen với tiếng Nhật, bảng chữ cái, ngữ pháp và từ vựng cơ bản" },
          { id: 2, chapterNo: 2, title: "Chương 2: Đồ vật xung quanh", description: "Chỉ thị từ これ, それ, あれ và đồ dùng hàng ngày" },
          { id: 3, chapterNo: 3, title: "Chương 3: Nơi chốn và vị trí", description: "Chỉ vị trí ここ, そこ, あそこ và hỏi giá cả" },
        ],
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (initialCourseId && expandedCourseId !== initialCourseId && courses.some(course => course.id === initialCourseId)) {
      void handleToggleCourse(initialCourseId);
    }
  }, [initialCourseId, courses]);

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q)
    );
  });

  const courseColorClass = (index: number) => {
    const colors = ["mod-card-teal", "mod-card-blue", "mod-card-purple", "mod-card-rose"];
    return colors[index % colors.length];
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">📚 Danh sách môn học</h2>
          <p className="admin-main-subtitle">{readOnly ? "Nội dung các môn học theo giáo trình Dekiru." : "Quản lý nội dung các môn học theo giáo trình Dekiru."}</p>
        </div>
      </div>

      {/* Search / Filter */}
      <div className="admin-filter-card">
        <div className="admin-filter-form">
          <div className="admin-search-wrapper">
            <span className="search-mag-icon">🔍</span>
            <input
              type="text"
              className="admin-filter-input"
              placeholder="Tìm kiếm môn học theo tên, mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="admin-quick-stats-row">
          <span className="quick-stats-label">Tổng quan:</span>
          <span className="stat-pill pill-total">
            {courses.length} Môn học
          </span>
          <span className="stat-pill pill-active">
            {courses.reduce((sum, c) => sum + c.chapterCount, 0)} Chương
          </span>
        </div>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="admin-table-card">
          <div className="admin-table-loading">
            <div className="admin-spinner mod-spinner" />
            <span>Đang tải danh sách môn học...</span>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="admin-table-card">
          <div className="admin-table-empty">
            <span style={{ fontSize: "2rem" }}>📭</span>
            <p style={{ marginTop: "8px", fontWeight: 700, color: "#0f172a" }}>
              {searchQuery ? "Không tìm thấy môn học phù hợp" : "Chưa có môn học nào"}
            </p>
          </div>
        </div>
      ) : (
        <div className="mod-courses-grid">
          {filteredCourses.map((course, index) => (
            <div key={course.id} className={`mod-course-card ${courseColorClass(index)}`}>
              {/* Card Header */}
              <div className="mod-course-card-header">
                <div className="mod-course-icon-badge">
                  {["📘", "📗", "📕", "📙"][index % 4]}
                </div>
                <div className="mod-course-info">
                  <h3 className="mod-course-name">{course.name}</h3>
                  <span className="mod-course-code">{course.code}</span>
                </div>
                <div className="mod-course-chapter-count">
                  <span className="mod-count-number">{course.chapterCount}</span>
                  <span className="mod-count-label">chương</span>
                </div>
              </div>

              {/* Description */}
              {course.description && (
                <p className="mod-course-desc">{course.description}</p>
              )}

              {/* Actions */}
              <div className="mod-course-actions">
                <button
                  type="button"
                  className="mod-btn-detail"
                  onClick={() => handleToggleCourse(course.id)}
                >
                  {expandedCourseId === course.id ? (
                    <>
                      <span>▲</span> Thu gọn
                    </>
                  ) : (
                    <>
                      <span>📋</span> Chi tiết
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Chapter List */}
              {expandedCourseId === course.id && (
                <div className="mod-chapters-panel">
                  {loadingDetail ? (
                    <div className="mod-chapters-loading">
                      <div className="admin-spinner mod-spinner" />
                      <span>Đang tải danh sách chương...</span>
                    </div>
                  ) : courseDetail && courseDetail.chapters.length > 0 ? (
                    <>
                      <div className="mod-chapters-header">
                        <span className="mod-chapters-title">Danh sách chương</span>
                        <span className="mod-chapters-count">{courseDetail.chapters.length} chương</span>
                      </div>
                      <div className="mod-chapters-list">
                        {courseDetail.chapters.map((ch: ChapterSummary) => (
                          <div key={ch.id} className="mod-chapter-row">
                            <div className="mod-chapter-info">
                              <span className="mod-chapter-no">Chương {ch.chapterNo}</span>
                              <span className="mod-chapter-title">{ch.title}</span>
                              {ch.description && (
                                <span className="mod-chapter-desc">{ch.description}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="mod-btn-view-chapter"
                              onClick={() =>
                                onViewChapter({
                                  courseId: course.id,
                                  chapterId: ch.id,
                                })
                              }
                            >
                              <span>📖</span> Xem bài học
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="mod-chapters-empty">
                      <span style={{ fontSize: "1.5rem" }}>📭</span>
                      <p>Chưa có chương nào được tạo cho môn học này.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
