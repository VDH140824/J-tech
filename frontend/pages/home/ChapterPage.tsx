import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getChapterStudy } from "../../api/courseApi";
import { SECTIONS, type LessonSection } from "../moderator/sectionConfig";
import { ModeratorChapterSkillsOverview } from "../moderator/ModeratorChapterSkillsOverview";
import { ModeratorLessonListTab } from "../moderator/ModeratorLessonListTab";
import { ModeratorVocabularyLessonPage } from "../moderator/ModeratorVocabularyLessonPage";
import { ModeratorGrammarListPage } from "../moderator/ModeratorGrammarListPage";
import { ModeratorSkillItemListPage } from "../moderator/ModeratorSkillItemListPage";
import "./StudentLearningPage.css";
import { StudentKanjiLessonPage } from "./StudentKanjiLessonPage";
import { StudentKanjiContentPage } from "./StudentKanjiContentPage";
import { StudentKanjiFlashcardPage } from "./StudentKanjiFlashcardPage";
import { StudentKanjiTestPage } from "./StudentKanjiTestPage";
import { StudentKanjiChapterPage } from "./StudentKanjiChapterPage";

export function ChapterPage() {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const valid = [courseId, chapterId].every(
    (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0,
  );
  const chapter = useQuery({
    queryKey: ["chapter-study", Number(courseId), Number(chapterId)],
    queryFn: () => getChapterStudy(Number(courseId), Number(chapterId)),
    enabled: valid,
  });
  const active = SECTIONS.find(
    (section) =>
      section.key === params.get("skill") ||
      section.skillType === params.get("skill"),
  );
  const selectedId = Number(params.get("lessonId"));
  const selected = chapter.data?.lessons.find(
    (lesson) =>
      lesson.id === selectedId &&
      lesson.status === "PUBLISHED" &&
      lesson.chapterId === Number(chapterId),
  );
  const selectSkill = (skill: LessonSection | null) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("lessonId");
      next.delete("vocabTab");
      next.delete("kanjiView");
      next.delete("kanjiChapterView");
      next.delete("kanjiId");
      next.delete("document");
      if (skill) next.set("skill", skill);
      else next.delete("skill");
      return next;
    });
  const selectLesson = (id: number | null) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("vocabTab");
      next.delete("kanjiView");
      next.delete("kanjiChapterView");
      next.delete("kanjiId");
      next.delete("document");
      if (id) next.set("lessonId", String(id));
      else next.delete("lessonId");
      return next;
    });
  const back = () => navigate(`/courses/${courseId}`);
  const openKanji = (
    view: "content" | "flashcards" | "test" | null,
    kanjiId?: number,
    document?: number,
  ) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("kanjiId");
      next.delete("document");
      if (view) next.set("kanjiView", view);
      else next.delete("kanjiView");
      if (kanjiId !== undefined) next.set("kanjiId", String(kanjiId));
      if (document !== undefined) next.set("document", String(document));
      return next;
    });

  const openChapterKanji = (view: "flashcards" | "test" | null) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("skill", "KANJI");
      for (const key of [
        "lessonId",
        "kanjiView",
        "kanjiId",
        "document",
        "kanjiChapterView",
      ])
        next.delete(key);
      if (view) next.set("kanjiChapterView", view);
      return next;
    });

  let content;
  if (!valid)
    content = <p role="alert">Mã khóa học hoặc chương không hợp lệ.</p>;
  else if (chapter.isLoading)
    content = (
      <div className="admin-loading-state" role="status">
        Đang tải nội dung chương...
      </div>
    );
  else if (chapter.isError || !chapter.data)
    content = (
      <div className="admin-empty-state" role="alert">
        <h3>Không thể tải chương</h3>
        <p>Chương có thể chưa được xuất bản hoặc kết nối bị gián đoạn.</p>
        <button className="mod-btn-back" onClick={back}>
          ← Danh sách môn học
        </button>
        <button className="mod-btn-back" onClick={() => chapter.refetch()}>
          Thử lại
        </button>
      </div>
    );
  else if (selectedId > 0 && !selected)
    content = (
      <div className="admin-empty-state" role="alert">
        <p>Bài học không tồn tại trong chương hoặc chưa được xuất bản.</p>
        <button className="mod-btn-back" onClick={() => selectLesson(null)}>
          ← Danh sách bài học
        </button>
      </div>
    );
  else {
    const data = chapter.data;
    const context = {
      courseName: data.courseName,
      chapterNo: data.chapterNo,
      chapterTitle: data.title,
    };
    const chapterView =
      params.get("kanjiChapterView") ||
      (selected?.skillType === "KANJI" ? params.get("kanjiView") : null);
    if (
      (active?.key === "kanji" || selected?.skillType === "KANJI") &&
      chapterView === "flashcards"
    )
      content = (
        <StudentKanjiFlashcardPage
          key={data.id}
          chapterId={data.id}
          chapterNo={data.chapterNo}
          onBack={() => openChapterKanji(null)}
        />
      );
    else if (
      (active?.key === "kanji" || selected?.skillType === "KANJI") &&
      chapterView === "test"
    )
      content = (
        <StudentKanjiTestPage
          key={data.id}
          chapterId={data.id}
          chapterNo={data.chapterNo}
          onBack={() => openChapterKanji(null)}
        />
      );
    else if (selected) {
      const config = SECTIONS.find(
        (section) => section.skillType === selected.skillType,
      )!;
      const lessonBack = () => selectLesson(null);
      if (selected.skillType === "VOCABULARY")
        content = (
          <ModeratorVocabularyLessonPage
            readOnly
            {...context}
            lessonId={selected.id}
            chapterId={data.id}
            publishedLesson={selected}
            onBack={lessonBack}
          />
        );
      else if (selected.skillType === "GRAMMAR")
        content = (
          <ModeratorGrammarListPage
            readOnly
            {...context}
            lesson={selected}
            onBack={lessonBack}
          />
        );
      else if (selected.skillType === "KANJI") {
        const overview = () => openKanji(null);
        const view = params.get("kanjiView");
        if (view === "content")
          content = (
            <StudentKanjiContentPage
              key={`${selected.id}-${params.get("kanjiId")}-${params.get("document")}`}
              lesson={selected}
              kanjiId={params.get("kanjiId")}
              documentIndex={params.get("document")}
              onBack={overview}
            />
          );
        else
          content = (
            <StudentKanjiLessonPage
              key={selected.id}
              lesson={selected}
              {...context}
              onBack={() => openChapterKanji(null)}
              onOpen={openKanji}
            />
          );
      } else
        content = (
          <ModeratorSkillItemListPage
            readOnly
            {...context}
            lesson={selected}
            skillType={config.skillType}
            skillLabel={config.label}
            skillIcon={config.icon}
            skillColor={config.color}
            onBack={lessonBack}
          />
        );
    } else if (active?.key === "kanji")
      content = (
        <StudentKanjiChapterPage
          chapterId={data.id}
          chapterNo={data.chapterNo}
          lessons={data.lessons}
          onLesson={selectLesson}
          onOpen={openChapterKanji}
          onBack={() => selectSkill(null)}
        />
      );
    else if (active)
      content = (
        <ModeratorLessonListTab
          readOnly
          {...context}
          courseId={data.courseId}
          chapterId={data.id}
          selectedSection={active.key}
          publishedLessons={data.lessons}
          onSelectSection={selectSkill}
          onBackToOverview={() => selectSkill(null)}
          onViewLessonItems={(lesson) => selectLesson(lesson.id)}
        />
      );
    else
      content = (
        <ModeratorChapterSkillsOverview
          readOnly
          {...context}
          onSelectSkill={selectSkill}
          onBack={back}
        />
      );
  }
  return <div className="student-learning-page">{content}</div>;
}
