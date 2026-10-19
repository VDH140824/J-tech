import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ModeratorCoursesTab } from "./ModeratorCoursesTab";
import { ModeratorChapterDetailPage } from "./ModeratorChapterDetailPage";
import { ModeratorLayout } from "../../layouts/ModeratorLayout";
import "../admin/AdminPortalPage.css";
import "./ModeratorPortalPage.css";

export type ModeratorTab = "courses" | "chapter-detail";

export interface ModeratorNavState {
  courseId?: number;
  courseName?: string;
  chapterId?: number;
  chapterNo?: number;
  chapterTitle?: string;
}

export function ModeratorPortalPage() {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<ModeratorTab>("courses");
  const [navState, setNavState] = useState<ModeratorNavState>({});

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab as ModeratorTab);
  };

  const handleViewChapter = (state: ModeratorNavState) => {
    setNavState(state);
    setActiveTab("chapter-detail");
  };

  const handleBackToCourses = () => {
    setNavState({});
    setActiveTab("courses");
  };

  // Build dynamic breadcrumb
  let breadcrumb = "Trang chủ / Danh sách môn học";
  if (activeTab === "chapter-detail" && navState.courseName) {
    breadcrumb = `Trang chủ / ${navState.courseName} / Chương ${navState.chapterNo}: ${navState.chapterTitle}`;
  }

  return (
    <ModeratorLayout
      activeTab={activeTab === "chapter-detail" ? "courses" : activeTab}
      onSelectTab={handleSelectTab}
      title="Quản trị nội dung"
      breadcrumb={breadcrumb}
    >
      {activeTab === "courses" && (
        <ModeratorCoursesTab onViewChapter={handleViewChapter} />
      )}
      {activeTab === "chapter-detail" && (
        <ModeratorChapterDetailPage
          courseId={navState.courseId!}
          courseName={navState.courseName!}
          chapterId={navState.chapterId!}
          chapterNo={navState.chapterNo!}
          chapterTitle={navState.chapterTitle!}
          onBack={handleBackToCourses}
        />
      )}
    </ModeratorLayout>
  );
}
