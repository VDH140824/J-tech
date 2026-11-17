import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import {
  getStudentVocabularyChapterTest,
  submitStudentVocabularyChapterTest,
} from "../../api/vocabularyChapterTestApi";
import type { StudentVocabularyExercise } from "../../api/vocabularyExerciseApi";
import { VocabularyExercisePreview } from "../moderator/vocabulary/VocabularyExercisePreview";
import "../moderator/vocabulary/VocabularyExercises.css";

export function StudentVocabularyChapterTestPage({
  chapterId,
  onBack,
}: {
  chapterId: number;
  onBack: () => void;
}) {
  const [test, setTest] = useState<StudentVocabularyExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    setLoading(true);
    setError("");
    getStudentVocabularyChapterTest(chapterId, request.signal)
      .then((data) => {
        if (!request.signal.aborted) setTest(data);
      })
      .catch((failure) => {
        if (request.signal.aborted) return;
        setTest(null);
        setError(
          isAxiosError(failure) && failure.response?.status === 404
            ? "Bài test chương chưa được xuất bản hoặc không còn khả dụng."
            : "Không thể tải bài test chương. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (!request.signal.aborted) setLoading(false);
      });
    return () => request.abort();
  }, [chapterId, retry]);

  if (loading) {
    return (
      <div className="admin-loading-state" role="status">
        Đang tải test từ vựng chương...
      </div>
    );
  }
  if (error || !test?.questions.length) {
    return (
      <div className="admin-empty-state" role="alert">
        <p>{error || "Bài test chương hiện không có câu hỏi."}</p>
        {error && !error.startsWith("Bài test chương chưa") && (
          <button className="mod-btn-back" onClick={() => setRetry((value) => value + 1)}>
            Thử lại
          </button>
        )}
        <button className="mod-btn-back" onClick={onBack}>
          ← Quay lại chương
        </button>
      </div>
    );
  }

  return (
    <VocabularyExercisePreview
      test={test}
      student
      backLabel="Về chương"
      onBack={onBack}
      grade={(_id, answers) => submitStudentVocabularyChapterTest(chapterId, test, answers)}
    />
  );
}
