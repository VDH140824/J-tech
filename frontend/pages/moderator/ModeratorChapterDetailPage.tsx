import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { LessonSummary } from "../../api/lessonApi";
import { getChapter, getCourse, type ChapterDetail } from "../../api/courseApi";
import { SECTIONS, type LessonSection, type SectionConfig } from "./sectionConfig";
import { ModeratorChapterSkillsOverview } from "./ModeratorChapterSkillsOverview";
import { ModeratorLessonListTab } from "./ModeratorLessonListTab";
import { ModeratorGrammarListPage } from "./ModeratorGrammarListPage";
import { ModeratorSkillItemListPage } from "./ModeratorSkillItemListPage";

// Re-export for external consumers
export { SECTIONS, type LessonSection, type SectionConfig };

export interface ModeratorChapterDetailPageProps {
  courseId: number;
  chapterId: number;
  initialCourseName?: string;
  initialChapterNo?: number;
  initialChapterTitle?: string;
  onBack: () => void;
  onChapterLoaded?: (chapter: ChapterDetail) => void;
}

export function ModeratorChapterDetailPage({
  courseId,
  chapterId,
  initialCourseName,
  initialChapterNo,
  initialChapterTitle,
  onBack,
  onChapterLoaded,
}: ModeratorChapterDetailPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // State to hold chapter and course information
  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Try getChapter first, fallback to getCourse, then default fallback
    getChapter(courseId, chapterId)
      .then((data) => {
        if (!isMounted) return;
        setChapterDetail(data);
        onChapterLoaded?.(data);
      })
      .catch(() => {
        return getCourse(courseId)
          .then((course) => {
            const ch = course?.chapters?.find((c) => c.id === chapterId);
            const fallback: ChapterDetail = {
              id: chapterId,
              chapterNo: ch?.chapterNo || chapterId,
              title: ch?.title || `Chương ${chapterId}`,
              description: ch?.description,
              courseId: courseId,
              courseName: course?.name || `Nhật ${courseId}`,
              courseCode: course?.code || "JPD",
            };
            if (!isMounted) return;
            setChapterDetail(fallback);
            onChapterLoaded?.(fallback);
          })
          .catch(() => {
            const safeDefault: ChapterDetail = {
              id: chapterId,
              chapterNo: chapterId,
              title: `Chương ${chapterId}`,
              courseId: courseId,
              courseName: `Nhật ${courseId}`,
              courseCode: `JPD11${courseId}`,
            };
            if (!isMounted) return;
            setChapterDetail(safeDefault);
            onChapterLoaded?.(safeDefault);
          });
      });

    return () => {
      isMounted = false;
    };
  }, [courseId, chapterId]);

  // Read skill from URL (clean identifier only, e.g. skill=grammar)
  const skillFromUrl = searchParams.get("skill") as LessonSection | null;
  const validSkill = SECTIONS.some((s) => s.key === skillFromUrl) ? skillFromUrl : null;

  const [selectedSection, setSelectedSectionState] = useState<LessonSection | null>(() => validSkill);

  // Sync if URL query changes
  useEffect(() => {
    if (validSkill !== selectedSection) {
      setSelectedSectionState(validSkill);
    }
  }, [validSkill]);

  const handleSelectSection = (sec: LessonSection | null) => {
    setSelectedSectionState(sec);
    if (sec) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("skill", sec);
          next.delete("lessonId");
          return next;
        },
        { replace: true }
      );
    } else {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("skill");
          next.delete("lessonId");
          return next;
        },
        { replace: true }
      );
    }
  };

  // Only show lesson sub-items if lessonId is explicitly in URL query
  const lessonIdParam = searchParams.get("lessonId");
  const [activeLessonForItems, setActiveLessonForItemsState] = useState<LessonSummary | null>(() => {
    if (!lessonIdParam) return null;
    const saved = sessionStorage.getItem("moderator-active-lesson");
    if (saved) {
      try {
        const item = JSON.parse(saved) as LessonSummary;
        if (String(item.id) === lessonIdParam) return item;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Sync if lessonId in URL is removed (e.g. user pressed back)
  useEffect(() => {
    if (!lessonIdParam) {
      setActiveLessonForItemsState(null);
    }
  }, [lessonIdParam]);

  const handleViewLessonItems = (lesson: LessonSummary | null) => {
    setActiveLessonForItemsState(lesson);
    if (lesson) {
      sessionStorage.setItem("moderator-active-lesson", JSON.stringify(lesson));
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("lessonId", String(lesson.id));
          return next;
        },
        { replace: true }
      );
    } else {
      sessionStorage.removeItem("moderator-active-lesson");
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("lessonId");
          return next;
        },
        { replace: true }
      );
    }
  };

  const courseName = chapterDetail?.courseName || initialCourseName || `Nhật ${courseId}`;
  const chapterNo = chapterDetail?.chapterNo || initialChapterNo || chapterId;
  const chapterTitle = chapterDetail?.title || initialChapterTitle || `Chương ${chapterNo}`;
  const activeConfig = SECTIONS.find((s) => s.key === selectedSection);

  // 1. SUB-PAGE: LIST OF ITEMS FOR A SPECIFIC LESSON (e.g. list_grammar)
  // ONLY render when lessonId is in URL and activeLessonForItems exists
  if (lessonIdParam && activeLessonForItems && activeConfig) {
    if (activeConfig.key === "grammar") {
      return (
        <ModeratorGrammarListPage
          courseName={courseName}
          chapterNo={chapterNo}
          chapterTitle={chapterTitle}
          lesson={activeLessonForItems}
          onBack={() => handleViewLessonItems(null)}
        />
      );
    } else {
      return (
        <ModeratorSkillItemListPage
          skillType={activeConfig.skillType}
          skillLabel={activeConfig.label}
          skillIcon={activeConfig.icon}
          skillColor={activeConfig.color}
          courseName={courseName}
          chapterNo={chapterNo}
          chapterTitle={chapterTitle}
          lesson={activeLessonForItems}
          onBack={() => handleViewLessonItems(null)}
        />
      );
    }
  }

  // 2. VIEW 1 (Ảnh 2): SKILL OVERVIEW (Kanji, Từ vựng, Ngữ pháp, Nghe, Đọc hiểu)
  if (!selectedSection) {
    return (
      <ModeratorChapterSkillsOverview
        courseName={courseName}
        chapterNo={chapterNo}
        chapterTitle={chapterTitle}
        onSelectSkill={(secKey) => handleSelectSection(secKey)}
        onBack={onBack}
      />
    );
  }

  // 3. VIEW 2 (Ảnh 3): LESSON MANAGEMENT TABLE & CRUD (Bảng bài học trong database)
  return (
    <ModeratorLessonListTab
      courseId={courseId}
      courseName={courseName}
      chapterId={chapterId}
      chapterNo={chapterNo}
      chapterTitle={chapterTitle}
      selectedSection={selectedSection}
      onSelectSection={(secKey) => handleSelectSection(secKey)}
      onBackToOverview={() => handleSelectSection(null)}
      onViewLessonItems={(lesson) => handleViewLessonItems(lesson)}
    />
  );
}
