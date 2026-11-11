import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getCourses } from "../../api/courseApi";
import { getStudentChapters } from "../../api/studentChapterApi";
import { getVocabularies } from "../../api/vocabularyApi";
import { VocabularyRainGame } from "./vocabulary-rain/VocabularyRainGame.jsx";
import { toRainWords, type RainWord } from "./vocabulary-rain/vocabularyRainGame";
import "./GamesPage.css";

export function VocabularyRainPage() {
  const [courseId, setCourseId] = useState(0);
  const [chapterId, setChapterId] = useState(0);
  const [lessonId, setLessonId] = useState(0);
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
  const lessons = availableChapters.find((chapter) => chapter.id === chapterId)?.lessons
    .filter((lesson) => lesson.skillType === "VOCABULARY") ?? [];
  const lesson = lessons.find((item) => item.id === lessonId);
  const vocabulary = useQuery({
    queryKey: ["vocabulary-rain-words", lessonId],
    queryFn: ({ signal }) => getVocabularies(`/lessons/${lessonId}/vocabularies?status=PUBLISHED`, signal),
    enabled: !!lesson && !round,
    select: toRainWords,
  });

  if (round) {
    return (
      <div className="jtech-games">
        <VocabularyRainGame {...round} onExit={() => setRound(null)} />
      </div>
    );
  }

  const failedQuery = [courses, chapters, vocabulary].find((query) => query.isError);
  const loading = courses.isLoading || chapters.isLoading || vocabulary.isLoading;
  const words = vocabulary.data;
  let emptyMessage = "";
  if (courses.data?.length === 0) emptyMessage = "Chưa có khóa học để chọn.";
  else if (chapters.data && !availableChapters.length) emptyMessage = "Khóa học này chưa có bài từ vựng.";
  else if (lesson && words?.length === 0) emptyMessage = "Bài này chưa có từ vựng có thể chơi.";

  return (
    <div className="jtech-games">
      <Link className="jtech-games-back" to="/games">← Danh sách trò chơi</Link>
      <h1>Mưa Từ Vựng</h1>
      <section className="jtech-games-picker" aria-labelledby="rain-picker-title">
        <h2 id="rain-picker-title">Chọn nội dung</h2>
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
              {availableChapters.map((item) => <option key={item.id} value={item.id}>Chương {item.chapterNo} · {item.title}</option>)}
            </select>
          </label>
          <label>
            Bài từ vựng
            <select value={lessonId} onChange={(event) => setLessonId(Number(event.target.value))} disabled={!lessons.length}>
              <option value={0}>Chọn bài từ vựng</option>
              {lessons.map((item) => <option key={item.id} value={item.id}>Bài {item.lessonNo} · {item.title}</option>)}
            </select>
          </label>
        </div>
        {loading && <p role="status">Đang tải nội dung…</p>}
        {failedQuery ? (
          <p role="alert">Không thể tải nội dung. <button type="button" onClick={() => void failedQuery.refetch()}>Thử lại</button></p>
        ) : emptyMessage ? <p role="status">{emptyMessage}</p> : lesson && !!words?.length && (
          <p role="status">{words.length} từ có thể chơi</p>
        )}
        <button
          className="jtech-games-action"
          type="button"
          disabled={!lesson || !words?.length || loading || !!failedQuery}
          onClick={() => {
            if (lesson && words?.length) setRound({ title: lesson.title, words });
          }}
        >
          Bắt đầu
        </button>
      </section>
    </div>
  );
}
