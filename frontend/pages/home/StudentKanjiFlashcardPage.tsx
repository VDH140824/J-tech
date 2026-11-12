import { StudentKanjiFlashcards } from "./StudentKanjiFlashcards";
import "./StudentKanjiFlashcards.css";

export function StudentKanjiFlashcardPage({
  chapterId,
  chapterNo,
  readOnly = false,
  onBack,
}: {
  chapterId: number;
  chapterNo: number;
  readOnly?: boolean;
  onBack: () => void;
}) {
  return (
    <section className="student-kanji-page">
      <h2>Flashcard chữ Hán · Chương {chapterNo}</h2>

      <StudentKanjiFlashcards
        key={chapterId}
        chapterId={chapterId}
        readOnly={readOnly}
        onBack={onBack}
      />
    </section>
  );
}
