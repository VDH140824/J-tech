import { useQuery } from "@tanstack/react-query";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { getChapterStudy } from "../../api/courseApi";
import { SECTIONS, type LessonSection } from "../moderator/sectionConfig";
import { ModeratorLessonListTab } from "../moderator/ModeratorLessonListTab";
import { ModeratorVocabularyLessonPage } from "../moderator/vocabulary/ModeratorVocabularyLessonPage";
import { ModeratorSkillItemListPage } from "../moderator/ModeratorSkillItemListPage";
import "./StudentLearningPage.css";
import { StudentKanjiLessonPage } from "./StudentKanjiLessonPage";
import { StudentKanjiContentPage } from "./StudentKanjiContentPage";
import { StudentKanjiFlashcardPage } from "./StudentKanjiFlashcardPage";
import { StudentKanjiTestPage } from "./StudentKanjiTestPage";
import { StudentKanjiChapterPage } from "./StudentKanjiChapterPage";
import { StudentGrammarChapterPage } from "./StudentGrammarChapterPage";
import {
  StudentGrammarLessonPage,
  type GrammarView,
} from "./StudentGrammarLessonPage";
import { StudentVocabularyChapterPage } from "./StudentVocabularyChapterPage";
import { StudentVocabularyChapterTestPage } from "./StudentVocabularyChapterTestPage";
import { VocabularyChapterFlashcards } from "../moderator/vocabulary/VocabularyChapterFlashcards";

export function ChapterPage() {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const valid = [courseId, chapterId].every(
    (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0,
  );
  const active = SECTIONS.find(
    (section) =>
      section.key === params.get("skill") ||
      section.skillType === params.get("skill"),
  );
  const chapter = useQuery({
    queryKey: ["chapter-study", Number(courseId), Number(chapterId)],
    queryFn: () => getChapterStudy(Number(courseId), Number(chapterId)),
    enabled: valid,
    refetchOnMount: active?.key === "kanji" ? "always" : true,
    refetchOnWindowFocus: active?.key === "kanji" ? "always" : false,
  });
  const selectedId = Number(params.get("lessonId"));
  const grammarLessonNo = params.has("lessonNo")
    ? Number(params.get("lessonNo"))
    : undefined;
  const vocabularyLessonNo = params.has("lessonNo")
    ? Number(params.get("lessonNo"))
    : undefined;
  const selected = chapter.data?.lessons.find(
    (lesson) =>
      lesson.id === selectedId &&
      lesson.status === "PUBLISHED" &&
      lesson.chapterId === Number(chapterId),
  );
  const selectSkill = (skill: LessonSection | null) => {
    if (skill === "kanji") void chapter.refetch();
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("lessonId");
      next.delete("vocabTab");
      next.delete("kanjiView");
      next.delete("kanjiChapterView");
      next.delete("vocabChapterView");
      next.delete("kanjiId");
      next.delete("document");
      next.delete("grammarView");
      next.delete("lessonNo");
      if (skill) next.set("skill", skill);
      else next.delete("skill");
      return next;
    });
  };
  const openDocument = (lessonId: number, documentIndex: number) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("skill", "KANJI");
      next.set("lessonId", String(lessonId));
      next.set("kanjiView", "content");
      next.set("document", String(documentIndex));
      next.delete("kanjiId");
      next.delete("kanjiChapterView");
      next.delete("vocabTab");
      return next;
    });
  const selectLesson = (id: number | null) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("vocabTab");
      next.delete("kanjiView");
      next.delete("kanjiChapterView");
      next.delete("vocabChapterView");
      next.delete("kanjiId");
      next.delete("document");
      next.delete("grammarView");
      next.delete("lessonNo");
      if (id) next.set("lessonId", String(id));
      else next.delete("lessonId");
      return next;
    });
  const back = () => navigate(`/courses/${courseId}`);
  const backToChapter = () =>
    navigate(`/courses/${courseId}#chapter-${chapterId}`);
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
        "vocabChapterView",
      ])
        next.delete(key);
      if (view) next.set("kanjiChapterView", view);
      return next;
    });

  const openGrammar = (view: GrammarView | null) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (view) next.set("grammarView", view);
      else next.delete("grammarView");
      return next;
    });

  const openGrammarGroup = (lessonNo: number) =>
    setParams({ skill: "GRAMMAR", lessonNo: String(lessonNo) });

  const selectGrammarLesson = (id: number) => {
    const lesson = chapter.data?.lessons.find(
      (item) => item.id === id && item.skillType === "GRAMMAR" &&
        item.status === "PUBLISHED" && item.chapterId === Number(chapterId),
    );
    if (lesson)
      setParams({
        skill: "GRAMMAR",
        lessonNo: String(lesson.lessonNo),
        lessonId: String(lesson.id),
        grammarView: "material",
      });
  };

  const openChapterVocabulary = (view: "flashcards" | "test" | null) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("skill", "VOCABULARY");
      for (const key of [
        "lessonId",
        "lessonNo",
        "vocabTab",
        "kanjiView",
        "kanjiId",
        "document",
        "vocabChapterView",
      ])
        next.delete(key);
      if (view) next.set("vocabChapterView", view);
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
  else if (
    active?.key === "grammar" && grammarLessonNo !== undefined &&
    (!Number.isSafeInteger(grammarLessonNo) || grammarLessonNo <= 0)
  )
    content = (
      <div className="admin-empty-state" role="alert">
        <p>Số bài ngữ pháp không hợp lệ.</p>
        <button className="mod-btn-back" onClick={backToChapter}>
          ← Quay lại chương
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
    const vocabularyChapterView = params.get("vocabChapterView");
    if (
      (active?.key === "vocabulary" || selected?.skillType === "VOCABULARY") &&
      vocabularyChapterView === "flashcards"
    )
      content = (
        <VocabularyChapterFlashcards
          key={data.id}
          chapterId={data.id}
          chapterNo={data.chapterNo}
          courseName={data.courseName}
          student
          onBack={() => openChapterVocabulary(null)}
        />
      );
    else if (
      (active?.key === "vocabulary" || selected?.skillType === "VOCABULARY") &&
      vocabularyChapterView === "test"
    )
      content = (
        <StudentVocabularyChapterTestPage
          key={data.id}
          chapterId={data.id}
          onBack={() => openChapterVocabulary(null)}
        />
      );
    else if (
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
      else if (selected.skillType === "GRAMMAR") {
        const grammarView = params.get("grammarView");
        content = (
          <StudentGrammarLessonPage
            key={selected.id}
            lesson={selected}
            chapterNo={data.chapterNo}
            view={
              grammarView === "material" ||
              grammarView === "exercise" ||
              grammarView === "test"
                ? grammarView
                : "material"
            }
            onOpen={openGrammar}
            onBack={() => openGrammarGroup(selected.lessonNo)}
          />
        );
      } else if (selected.skillType === "KANJI") {
        const view = params.get("kanjiView");
        if (view === "content")
          content = (
            <StudentKanjiContentPage
              key={`${selected.id}-${params.get("kanjiId")}-${params.get("document")}`}
              lesson={selected}
              kanjiId={params.get("kanjiId")}
              documentIndex={params.get("document")}
              onBack={() => openChapterKanji(null)}
            />
          );
        else
          content = (
            <StudentKanjiLessonPage
              key={selected.id}
              lesson={selected}
              {...context}
              onBack={backToChapter}
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
    } else if (active?.key === "vocabulary")
      content = (
        <StudentVocabularyChapterPage
          chapterId={data.id}
          chapterNo={data.chapterNo}
          lessonNo={vocabularyLessonNo}
          lessons={data.lessons}
          onLesson={selectLesson}
          onOpen={openChapterVocabulary}
          onBack={backToChapter}
        />
      );
    else if (active?.key === "kanji")
      content = (
        <StudentKanjiChapterPage
          chapterId={data.id}
          chapterNo={data.chapterNo}
          lessons={data.lessons}
          onDocument={openDocument}
          onOpen={openChapterKanji}
          onBack={backToChapter}
        />
      );
    else if (active?.key === "grammar")
      content = (
        <StudentGrammarChapterPage
          chapterId={data.id}
          chapterNo={data.chapterNo}
          courseName={data.courseName}
          lessons={data.lessons}
          lessonNo={grammarLessonNo}
          onLessonNo={openGrammarGroup}
          onLesson={selectGrammarLesson}
          onBack={backToChapter}
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
        <Navigate to={`/courses/${courseId}#chapter-${chapterId}`} replace />
      );
  }
  return <div className="student-learning-page">{content}</div>;
}
