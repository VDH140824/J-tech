import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { submitStudentGameResult } from "../../api/gameApi";
import { getCourses } from "../../api/courseApi";
import { getStudentChapters } from "../../api/studentChapterApi";
import { getStudentChapterVocabularyCards, getVocabularies } from "../../api/vocabularyApi";
import { formatChapterLabel } from "../../utils/chapterLabel";
import { VocabularyRainGame } from "./vocabulary-rain/VocabularyRainGame";
import { toRainWords, type RainWord } from "./vocabulary-rain/rainGameLogic";
import "./GamesPage.css";

export function VocabularyRainPage() {
  const [courseId, setCourseId] = useState(0);
  const [chapterId, setChapterId] = useState(0);
  const [lessonId, setLessonId] = useState(0);
  const [mode, setMode] = useState<"lesson" | "chapter">("lesson");
  const [round, setRound] = useState<{ title: string; words: RainWord[] } | null>(null);

  const courses = useQuery({ queryKey: ["home-courses"], queryFn: getCourses });
  const chapters = useQuery({
    queryKey: ["vocabulary-rain-chapters", courseId],
    queryFn: ({ signal }) => getStudentChapters(courseId, signal),
    enabled: courseId > 0 && !round,
  });
  const availableChapters = chapters.data?.chapters.filter((chapter) =>
    chapter.lessons.some((lesson) => lesson.skillType === "VOCABULARY"),
  ) ?? [];
  const selectedChapter = availableChapters.find((chapter) => chapter.id === chapterId);
  const lessons = selectedChapter?.lessons
    .filter((lesson) => lesson.skillType === "VOCABULARY") ?? [];
  const lesson = lessons.find((item) => item.id === lessonId);
  const vocabulary = useQuery({
    queryKey: ["vocabulary-rain-words", lessonId],
    queryFn: ({ signal }) => getVocabularies(`/lessons/${lessonId}/vocabularies?status=PUBLISHED`, signal),
    enabled: mode === "lesson" && !!lesson && !round,
    select: toRainWords,
  });
  const chapterVocabulary = useQuery({
    queryKey: ["vocabulary-rain-chapter-words", chapterId],
    queryFn: ({ signal }) => getStudentChapterVocabularyCards(chapterId, signal),
    enabled: mode === "chapter" && chapterId > 0 && !round,
    select: (cards): RainWord[] => cards.flatMap((card) => {
      const meaning = String(card.meaningVi ?? "").trim();
      const word = String(card.word ?? "").trim();
      const reading = String(card.reading ?? "").trim();
      if (!meaning || !(reading || word)) return [];
      return [{ id: card.id, meaning, word, reading }];
    }),
  });

  if (round) {
    return (
      <div className="jtech-games">
        <VocabularyRainGame {...round} onExit={() => setRound(null)} onComplete={(result) =>
          submitStudentGameResult({ ...result, gameType: "VOCABULARY_RAIN", title: round.title })
        } />
      </div>
    );
  }

  const activeVocabulary = mode === "lesson" ? vocabulary : chapterVocabulary;
  const failedQuery = [courses, chapters, activeVocabulary].find((query) => query.isError);
  const loading = courses.isLoading || chapters.isLoading || activeVocabulary.isLoading;
  const words = activeVocabulary.data;
  const hasContentSelection = mode === "lesson" ? !!lesson : !!selectedChapter;
  let emptyMessage = "";
  if (courses.data?.length === 0) emptyMessage = "Chưa có khóa học để chọn.";
  else if (chapters.data && !availableChapters.length) emptyMessage = "Khóa học này chưa có bài từ vựng.";
  else if (mode === "lesson" && lesson && words?.length === 0) emptyMessage = "Bài này chưa có từ vựng có thể chơi.";
  else if (mode === "chapter" && selectedChapter && words?.length === 0) emptyMessage = "Chương này chưa có từ vựng có thể chơi.";

  return (
    <div className="jtech-games">
      <Link className="jtech-games-back" to="/games">← Danh sách trò chơi</Link>
      <h1>Mưa Từ Vựng</h1>
      <section className="jtech-games-picker" aria-labelledby="rain-picker-title">
        <h2 id="rain-picker-title">Chọn nội dung</h2>
        <div className="kanji-fruit-mode" role="group" aria-label="Phạm vi chơi">
          <button type="button" aria-pressed={mode === "lesson"} onClick={() => setMode("lesson")}>Theo bài học</button>
          <button type="button" aria-pressed={mode === "chapter"} onClick={() => { setMode("chapter"); setLessonId(0); }}>Theo chương</button>
        </div>
        <div className="jtech-games-fields">
          <label>
            Khóa học
            <select value={courseId} onChange={(event) => {
              setCourseId(Number(event.target.value));
              setChapterId(0);
              setLessonId(0);
            }} disabled={!courses.data?.length}>
              <option value={0}>Chọn khóa học</option>
              {courses.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            Chương
            <select value={chapterId} onChange={(event) => {
              setChapterId(Number(event.target.value));
              setLessonId(0);
            }} disabled={!availableChapters.length}>
              <option value={0}>Chọn chương</option>
              {availableChapters.map((item) => <option key={item.id} value={item.id}>{formatChapterLabel(item.chapterNo, item.title, " · ")}</option>)}
            </select>
          </label>
          {mode === "lesson" && <label>
            Bài từ vựng
            <select value={lessonId} onChange={(event) => setLessonId(Number(event.target.value))} disabled={!lessons.length}>
              <option value={0}>Chọn bài từ vựng</option>
              {lessons.map((item) => <option key={item.id} value={item.id}>Bài {item.lessonNo} · {item.title}</option>)}
            </select>
          </label>}
        </div>
        {loading && <p role="status">Đang tải nội dung…</p>}
        {failedQuery ? (
          <p role="alert">Không thể tải nội dung. <button type="button" onClick={() => void failedQuery.refetch()}>Thử lại</button></p>
        ) : emptyMessage ? <p role="status">{emptyMessage}</p> : hasContentSelection && !!words?.length && (
          <p role="status">{words.length} từ {mode === "chapter" ? "trong chương " : ""}có thể chơi</p>
        )}
        <button
          className="jtech-games-action"
          type="button"
          disabled={!hasContentSelection || !words?.length || loading || !!failedQuery}
          onClick={() => {
            if (!words?.length || !selectedChapter) return;
            const title = mode === "lesson"
              ? lesson?.title ?? "Bài từ vựng"
              : formatChapterLabel(selectedChapter.chapterNo, selectedChapter.title);
            setRound({ title, words });
          }}
        >
          Bắt đầu
        </button>
      </section>
    </div>
  );
}
