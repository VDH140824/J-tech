import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getStudentVocabularyExercise,
  miniTestError,
  submitStudentVocabularyExercise,
  type StudentVocabularyExercise,
} from "../../api/vocabularyMiniTestApi";
import { VocabularyMiniTestPreview } from "../moderator/VocabularyMiniTestPreview";
import "../moderator/VocabularyMiniTests.css";

export function StudentVocabularyExerciseTab({ lessonId, onBack }: {
  lessonId: number;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [exercise, setExercise] = useState<StudentVocabularyExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    setLoading(true);
    setError("");
    getStudentVocabularyExercise(lessonId, request.signal)
      .then(setExercise)
      .catch((failure) => {
        if (request.signal.aborted) return;
        setExercise(null);
        if (!isAxiosError(failure) || failure.response?.status !== 404) {
          setError(miniTestError(failure));
        }
      })
      .finally(() => {
        if (!request.signal.aborted) setLoading(false);
      });
    return () => request.abort();
  }, [lessonId, reload]);

  if (loading) return <div className="admin-loading-state" role="status">Đang tải exercise...</div>;
  if (error) return (
    <div className="admin-empty-state" role="alert">
      <p>{error}</p>
      <button className="mod-btn-back" onClick={() => setReload((value) => value + 1)}>Thử lại</button>
    </div>
  );
  if (!exercise?.questions.length) return (
    <div className="admin-empty-state">Bài học này chưa có exercise được xuất bản.</div>
  );
  return (
    <VocabularyMiniTestPreview
      test={exercise}
      student
      onBack={onBack}
      grade={async (_id, answers) => {
        const result = await submitStudentVocabularyExercise(exercise, answers);
        void queryClient.invalidateQueries({ queryKey: ["streak"] });
        return result;
      }}
    />
  );
}
