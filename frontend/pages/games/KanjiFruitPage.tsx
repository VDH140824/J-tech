import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { submitStudentGameResult } from "../../api/gameApi";
import { getCourses } from "../../api/courseApi";
import { getStudentChapters } from "../../api/studentChapterApi";
import { getChapterKanjiCards } from "../../api/studentKanjiApi";
import { KanjiFruitGame } from "./kanji-fruit/KanjiFruitGame";
import { toKanjiFruitCards, type KanjiFruitCard } from "./kanji-fruit/kanjiFruitLogic";
import "./GamesPage.css";

export function KanjiFruitPage() {
  const [courseId, setCourseId] = useState(0);
  const [chapterId, setChapterId] = useState(0);
  const [round, setRound] = useState<{ title: string; cards: KanjiFruitCard[] } | null>(null);
  const courses = useQuery({ queryKey: ["home-courses"], queryFn: getCourses });
  const chapters = useQuery({
    queryKey: ["kanji-fruit-chapters", courseId],
    queryFn: ({ signal }) => getStudentChapters(courseId, signal),
    enabled: courseId > 0 && !round,
  });
  const availableChapters = chapters.data?.chapters.filter((chapter) =>
    chapter.lessons.some((lesson) => lesson.skillType === "KANJI"),
  ) ?? [];
  const chapterKanji = useQuery({
    queryKey: ["kanji-fruit-chapter-cards", chapterId],
    queryFn: ({ signal }) => getChapterKanjiCards(chapterId, signal),
    enabled: chapterId > 0 && !round,
    select: toKanjiFruitCards,
  });
  if (round) return <div className="jtech-games"><KanjiFruitGame {...round} onExit={() => setRound(null)} onComplete={(result) =>
    submitStudentGameResult({ ...result, gameType: "KANJI_FRUIT", title: round.title })
  } /></div>;

  const loading = courses.isLoading || chapters.isLoading || chapterKanji.isLoading;
  const failed = courses.isError || chapters.isError || chapterKanji.isError;
  const cards = chapterKanji.data;
  let emptyMessage = "";
  if (courses.data?.length === 0) emptyMessage = "Chưa có khóa học để chọn.";
  else if (chapters.data && !availableChapters.length) emptyMessage = "Khóa học này chưa có bài Kanji.";
  else if (chapterId && (cards?.length ?? 0) < 2) emptyMessage = "Cần ít nhất hai Kanji đã xuất bản có âm Hán Việt.";

  return (
    <div className="jtech-games">
      <Link className="jtech-games-back" to="/games">← Danh sách trò chơi</Link>
      <h1>Chém Kanji</h1>
      <section className="jtech-games-picker" aria-labelledby="kanji-fruit-title">
        <h2 id="kanji-fruit-title">Chọn khóa học và chương</h2>
        <div className="jtech-games-fields">
          <label>Khóa học<select value={courseId} onChange={(event) => { setCourseId(Number(event.target.value)); setChapterId(0); }}>
            <option value={0}>Chọn khóa học</option>{courses.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label>Chương<select value={chapterId} onChange={(event) => setChapterId(Number(event.target.value))} disabled={!availableChapters.length}>
            <option value={0}>Chọn chương</option>{availableChapters.map((item) => <option key={item.id} value={item.id}>Chương {item.chapterNo} · {item.title}</option>)}
          </select></label>
        </div>
        {loading && <p role="status">Đang tải nội dung…</p>}
        {failed && <p role="alert">Không thể tải nội dung. <button type="button" onClick={() => { void courses.refetch(); void chapters.refetch(); void chapterKanji.refetch(); }}>Thử lại</button></p>}
        {!failed && emptyMessage && <p role="status">{emptyMessage}</p>}
        {!failed && chapterId > 0 && !!cards?.length && <p role="status">{cards.length} Kanji trong chương có thể chơi</p>}
        <button className="jtech-games-action" type="button" disabled={loading || failed || !chapterId || (cards?.length ?? 0) < 2}
          onClick={() => cards && setRound({ title: `Chương ${availableChapters.find((item) => item.id === chapterId)?.chapterNo}`, cards })}>Bắt đầu</button>
      </section>
    </div>
  );
}
