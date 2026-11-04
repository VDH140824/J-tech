import { useEffect, useState } from "react";
import { useLocation, useNavigate, useMatch, useSearchParams } from "react-router-dom";
import { ModeratorCoursesTab } from "./ModeratorCoursesTab";
import { ClassListPage } from "./ClassListPage";
import { ModeratorChapterDetailPage } from "./ModeratorChapterDetailPage";
import { ModeratorLayout } from "../../layouts/ModeratorLayout";
import { ModeratorKanjiManagementPage } from "./kanji/ModeratorKanjiManagementPage";
import { SECTIONS } from "./sectionConfig";
import type { ChapterDetail } from "../../api/courseApi";
import "../admin/AdminPortalPage.css";
import "./ModeratorPortalPage.css";

export type ModeratorTab = "courses" | "chapter-detail" | "kanji";

//export type ModeratorTab = "courses" | "chapter-detail" | "classes";

export interface ModeratorNavState {
  courseId: number;
  chapterId: number;
  courseName?: string;
  chapterNo?: number;
  chapterTitle?: string;
}

export function ModeratorPortalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Match clean URL pattern: /moderator/courses/:courseId/chapters/:chapterId
  const matchChapter = useMatch("/moderator/courses/:courseId/chapters/:chapterId");
  const matchClasses = useMatch("/moderator/classes");

  const [chapterInfo, setChapterInfo] = useState<ChapterDetail | null>(null);

  // Backward-compatibility: Redirect old query parameter URL to new clean URL
  useEffect(() => {
    const isRoot = location.pathname === "/moderator" || location.pathname === "/moderator/";
    const oldCourseId = searchParams.get("courseId");
    const oldChapterId = searchParams.get("chapterId");
    const oldSkill = searchParams.get("skill");

    if (isRoot && oldCourseId && oldChapterId) {
      const cleanPath = `/moderator/courses/${oldCourseId}/chapters/${oldChapterId}${oldSkill ? `?skill=${oldSkill}` : ""}`;
      navigate(cleanPath, { replace: true });
    }
  }, [location.pathname, searchParams, navigate]);

  const activeTab: ModeratorTab = location.pathname.replace(/\/$/, "") === "/moderator/kanji" ? "kanji" : matchChapter ? "chapter-detail" : "courses";

  const handleSelectTab = (tab: string) => {
    if (tab === "kanji") {
      setChapterInfo(null);
      navigate("/moderator/kanji");
      return;
  const activeTab: ModeratorTab = matchClasses ? "classes" : matchChapter ? "chapter-detail" : "courses";

  const handleSelectTab = (tab: string) => {
    if (tab === "classes") {
      setChapterInfo(null);
      navigate("/moderator/classes");
    }
    if (tab === "courses") {
      setChapterInfo(null);
      navigate("/moderator");
    }
  };

  const handleViewChapter = (state: { courseId: number; chapterId: number }) => {
    navigate(`/moderator/courses/${state.courseId}/chapters/${state.chapterId}`);
  };

  const handleBackToCourses = () => {
    setChapterInfo(null);
    navigate("/moderator");
  };

  // Build clean breadcrumb based on loaded chapter data and optional skill query
  const skillParam = searchParams.get("skill");
  const skillConfig = SECTIONS.find((s) => s.key === skillParam);

  let breadcrumb = "Trang chủ / Danh sách môn học";
  if (activeTab === "classes") breadcrumb = "Trang chủ / Quản lý lớp học";
  if (activeTab === "chapter-detail") {
    if (chapterInfo && chapterInfo.courseName) {
      breadcrumb = `Trang chủ / ${chapterInfo.courseName} / Chương ${chapterInfo.chapterNo}: ${chapterInfo.title}`;
    } else {
      breadcrumb = `Trang chủ / Danh sách môn học / Chi tiết chương`;
    }
    if (skillConfig) {
      breadcrumb += ` / ${skillConfig.label}`;
    }
  }

  const courseId = matchChapter?.params.courseId ? Number(matchChapter.params.courseId) : null;
  if (activeTab === "kanji") breadcrumb = "Trang chủ / Quản lý Kanji";
  const chapterId = matchChapter?.params.chapterId ? Number(matchChapter.params.chapterId) : null;

  return (
    <ModeratorLayout
      activeTab={activeTab === "chapter-detail" ? "courses" : activeTab}
      onSelectTab={handleSelectTab}
      title="Quản trị nội dung"
      breadcrumb={breadcrumb}
    >
      {activeTab === "kanji" && <ModeratorKanjiManagementPage />}
      {activeTab === "classes" && <ClassListPage />}
      {activeTab === "courses" && (
        <ModeratorCoursesTab onViewChapter={handleViewChapter} />
      )}
      {activeTab === "chapter-detail" && courseId && chapterId && (
        <ModeratorChapterDetailPage
          key={`${courseId}-${chapterId}`}
          courseId={courseId}
          chapterId={chapterId}
          onBack={handleBackToCourses}
          onChapterLoaded={(detail) => setChapterInfo(detail)}
        />
      )}
    </ModeratorLayout>
  );
}
