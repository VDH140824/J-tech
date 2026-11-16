import { useEffect, useState, type FormEvent } from "react";
import { getVocabularies, type VocabularyItem } from "../../../api/vocabularyApi";
import {
  saveExercise,
  getExercise,
  getExercises,
  exerciseError,
  type ExerciseInput,
  type ExerciseQuestionInput,
  type VocabularyExercise,
} from "../../../api/vocabularyExerciseApi";
import { VocabularyExercisePreview } from "./VocabularyExercisePreview";
import "./VocabularyExercises.css";

type Settings = Omit<ExerciseInput, "questions">;
const statusNames = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", ARCHIVED: "Đã lưu trữ" };
const templateUrl = "/Form_question.xlsx";

function createQuestions(words: VocabularyItem[]): ExerciseQuestionInput[] {
  const definitions = [...new Set(words.map((word) => String(word.meaningVi).trim()).filter(Boolean))];
  const shuffle = <T,>(items: T[]): T[] => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }
    return result;
  };
  return words.map((word) => {
    const answer = String(word.meaningVi).trim();
    const distractors = shuffle(definitions.filter((meaning) => meaning !== answer)).slice(0, 3);
    const options = shuffle([answer, ...distractors]);
    const exampleJp = typeof word.exampleJp === "string" ? word.exampleJp.trim() : "";
    const exampleVi = typeof word.exampleVi === "string" ? word.exampleVi.trim() : "";
    return {
      sourceVocabularyId: word.id,
      questionType: "MCQ",
      content: `Chọn nghĩa đúng của từ: ${word.word}${word.reading ? ` (${word.reading})` : ""}`,
      explanation: [
        `${word.word}: ${answer}`,
        exampleJp ? `Ví dụ tiếng Nhật: ${exampleJp}` : "",
        exampleVi ? `Ví dụ tiếng Việt: ${exampleVi}` : "",
      ].filter(Boolean).join("\n"),
      difficulty: "EASY",
      options,
      correctAnswer: answer,
      matches: {},
    };
  });
}

function csvValue(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function VocabularyExerciseTab({ lessonId }: { lessonId: number }) {
  const [test, setTest] = useState<VocabularyExercise | null>(null);
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [questions, setQuestions] = useState<ExerciseQuestionInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState<VocabularyExercise | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    title: "Exercise từ vựng",
    description: "Chọn định nghĩa đúng cho mỗi từ vựng.",
    durationMinutes: 10,
    passingScore: 70,
    status: "DRAFT",
  });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      getExercises(lessonId, controller.signal),
      getVocabularies(`/lessons/${lessonId}/vocabularies`, controller.signal),
    ])
      .then(async ([tests, vocabulary]) => {
        if (!active) return;
        if (tests.length > 1) {
          setError(
            "Bài này có nhiều exercise cũ. Cần xử lý dữ liệu cũ trước khi áp dụng một exercise mỗi bài.",
          );
          setTest(null);
          return;
        }
        const existing = tests[0] ? await getExercise(tests[0].id) : null;
        if (!active) return;
        const available = vocabulary.filter(
          (word) => word.status === "PUBLISHED" || word.status === "DRAFT",
        );
        const previousIds = new Set(existing?.questions.map((question) => question.sourceVocabularyId));
        setTest(existing);
        setWords(available);
        setSelectedIds(available.filter((word) => previousIds.has(word.id)).map((word) => word.id));
        setQuestions(existing?.questions ?? []);
        if (existing)
          setSettings({
            title: existing.title,
            description: existing.description || "",
            durationMinutes: existing.durationMinutes,
            passingScore: existing.passingScore,
            status: existing.status,
          });
      })
      .catch((failure) => {
        if (active) setError(exerciseError(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [lessonId, reload]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveExercise(lessonId, { ...settings, questions });
      setTest(saved);
      setNotice(
        saved.status === "PUBLISHED"
          ? `Đã xuất bản exercise với ${saved.questionCount} câu.`
          : `Đã lưu exercise với ${saved.questionCount} câu ở trạng thái ${statusNames[saved.status].toLowerCase()}.`,
      );
    } catch (failure) {
      setError(exerciseError(failure));
    } finally {
      setBusy(false);
    }
  };
  const openPreview = async () => {
    if (!test || busy) return;
    setBusy(true);
    setError("");
    try {
      setPreview(await getExercise(test.id));
    } catch (failure) {
      setError(exerciseError(failure));
    } finally {
      setBusy(false);
    }
  };
  if (preview)
    return (
      <VocabularyExercisePreview
        test={preview}
        onBack={() => setPreview(null)}
      />
    );
  if (loading)
    return (
      <div
        className="admin-loading-state"
        role="status"
      >
        <div className="admin-loading-spinner" />
        <p>Đang tải exercise và từ vựng của bài...</p>
      </div>
    );
  const hasHistory = !!test && test.attemptCount > 0;
  const selectedWords = words.filter((word) => selectedIds.includes(word.id));
  const canGenerate = selectedWords.length >= 2 && questions.length === selectedWords.length && !hasHistory;
  const updateSelection = (ids: number[]) => {
    const nextWords = words.filter((word) => ids.includes(word.id));
    const previousBySource = new Map(questions.map((question) => [question.sourceVocabularyId, question]));
    const generatedBySource = new Map(
      createQuestions(nextWords).map((question) => [question.sourceVocabularyId, question]),
    );
    setSelectedIds(ids);
    setQuestions(nextWords.map((word) => {
      const generated = generatedBySource.get(word.id)!;
      const previous = previousBySource.get(word.id);
      return previous
        ? {
            ...previous,
            options: generated.options,
            correctAnswer: generated.correctAnswer,
            explanation: generated.explanation,
          }
        : generated;
    }));
  };
  const exportQuestions = () => {
    const rows = [
      ["Question #", "Question Text", "A", "B", "C", "D", "Correct Answer(s)", "Explaination detail"],
      ...questions.map((question, index) => [
        index + 1,
        question.content,
        ...[0, 1, 2, 3].map((optionIndex) => question.options[optionIndex] ?? ""),
        question.correctAnswer,
        question.explanation,
      ]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Vocabulary_Exercise.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mod-assessment-tab">
      <div className="mod-assessment-heading">
        <div>
          <h3>Vocabulary Exercise của bài học</h3>
          <p>
            Chọn từ vựng để tạo câu hỏi. Mỗi từ được chọn tạo thành một câu.
          </p>
        </div>
        {test && (
          <button
            className="mod-btn-back"
            disabled={busy}
            onClick={() => void openPreview()}
          >
            Làm thử
          </button>
        )}
      </div>
      <div className="modal-actions-row">
        <a className="btn-modal-cancel" href={templateUrl} download="Form_question.xlsx">
          Tải form Excel
        </a>
        <button type="button" className="btn-modal-cancel" disabled={!questions.length} onClick={exportQuestions}>
          Xuất câu hỏi
        </button>
      </div>
      {error && (
        <div
          className="mod-assessment-error"
          role="alert"
        >
          {error}
          <button
            type="button"
            className="btn-modal-cancel"
            disabled={busy}
            onClick={() => setReload((value) => value + 1)}
          >
            Tải lại
          </button>
        </div>
      )}
      {notice && (
        <div
          className="mod-assessment-success"
          role="status"
        >
          ✓ {notice}
        </div>
      )}
      {test && (
        <div className="mod-assessment-info">
          <span>{statusNames[test.status]}</span>
          <span>{test.questionCount} câu</span>
          <span>{test.attemptCount} lượt làm</span>
        </div>
      )}
      <details className="mod-assessment-source" open>
        <summary>Chọn từ cho exercise · Đã chọn {selectedWords.length}/{words.length} từ</summary>
        <div className="table-responsive">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Chọn</th>
                <th>Thứ tự</th>
                <th>Thuật ngữ</th>
                <th>Cách đọc</th>
                <th>Định nghĩa</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, index) => (
                <tr key={word.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Chọn từ ${word.word}`}
                      checked={selectedIds.includes(word.id)}
                      disabled={busy || hasHistory}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        updateSelection(checked
                          ? [...selectedIds, word.id]
                          : selectedIds.filter((id) => id !== word.id));
                      }}
                    />
                  </td>
                  <td>{index + 1}</td>
                  <td>{word.word}</td>
                  <td>{word.reading}</td>
                  <td>{word.meaningVi}</td>
                  <td>{word.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {questions.map((question, questionIndex) => (
        <section className="mod-assessment-question" key={question.sourceVocabularyId ?? questionIndex}>
          <h4>Thêm câu hỏi {questionIndex + 1}</h4>
          <label className="modal-field-group">
            Dạng câu hỏi
            <select className="modal-input" value="MCQ" disabled>
              <option value="MCQ">Trắc nghiệm</option>
            </select>
          </label>
          <label className="modal-field-group">
            Nội dung *
            <textarea className="modal-textarea" required value={question.content}
              onChange={(event) => setQuestions((current) => current.map((item, index) =>
                index === questionIndex ? { ...item, content: event.target.value } : item
              ))} />
          </label>
          <label className="modal-field-group">
            Độ khó
            <select className="modal-input" value={question.difficulty}
              onChange={(event) => setQuestions((current) => current.map((item, index) =>
                index === questionIndex ? { ...item, difficulty: event.target.value as ExerciseQuestionInput["difficulty"] } : item
              ))}>
              <option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option>
            </select>
          </label>
          <label className="modal-field-group">
            Lựa chọn và đáp án đúng
            {question.options.map((option, optionIndex) => (
              <div className="mod-assessment-option" key={optionIndex}>
                <input type="radio" name={`correct-${questionIndex}`} checked={question.correctAnswer === option}
                  onChange={() => setQuestions((current) => current.map((item, index) =>
                    index === questionIndex ? { ...item, correctAnswer: option } : item
                  ))} />
                <input className="modal-input" required value={option}
                  onChange={(event) => setQuestions((current) => current.map((item, index) => {
                    if (index !== questionIndex) return item;
                    return { ...item, options: item.options.map((value, i) => i === optionIndex ? event.target.value : value),
                      correctAnswer: item.correctAnswer === option ? event.target.value : item.correctAnswer };
                  }))} />
              </div>
            ))}
          </label>
          <label className="modal-field-group">
            Giải thích
            <textarea className="modal-textarea" value={question.explanation}
              onChange={(event) => setQuestions((current) => current.map((item, index) =>
                index === questionIndex ? { ...item, explanation: event.target.value } : item
              ))} />
          </label>
        </section>
      ))}
      {!canGenerate && (
        <p className="mod-assessment-error">
          {hasHistory
            ? "Exercise đã có lượt làm nên không thể tạo lại câu hỏi, để giữ nguyên kết quả cũ."
            : "Chọn ít nhất hai từ có nghĩa khác nhau để tạo đáp án trắc nghiệm."}
        </p>
      )}
      <form
        onSubmit={save}
        className="mod-assessment-form mod-assessment-generated-form"
      >
        <fieldset
          className="mod-content-fieldset"
          disabled={busy || hasHistory}
        >
          <div className="modal-grid-2">
            <div className="modal-field-group mod-content-wide">
              <label
                className="modal-label"
                htmlFor="generated-mini-title"
              >
                Tên exercise *
              </label>
              <input
                id="generated-mini-title"
                className="modal-input"
                required
                maxLength={200}
                value={settings.title}
                onChange={(event) => setSettings({ ...settings, title: event.target.value })}
              />
            </div>
            <div className="modal-field-group">
              <label
                className="modal-label"
                htmlFor="generated-mini-duration"
              >
                Thời gian (phút)
              </label>
              <input
                id="generated-mini-duration"
                className="modal-input"
                type="number"
                min={5}
                max={30}
                required
                value={settings.durationMinutes}
                onChange={(event) =>
                  setSettings({ ...settings, durationMinutes: Number(event.target.value) })
                }
              />
            </div>
            <div className="modal-field-group">
              <label
                className="modal-label"
                htmlFor="generated-mini-score"
              >
                Điểm đạt / 100
              </label>
              <input
                id="generated-mini-score"
                className="modal-input"
                type="number"
                min={0}
                max={100}
                step="0.01"
                required
                value={settings.passingScore}
                onChange={(event) =>
                  setSettings({ ...settings, passingScore: Number(event.target.value) })
                }
              />
            </div>
            <div className="modal-field-group">
              <label
                className="modal-label"
                htmlFor="generated-mini-status"
              >
                Trạng thái
              </label>
              <select
                id="generated-mini-status"
                className="modal-input"
                value={settings.status}
                onChange={(event) =>
                  setSettings({ ...settings, status: event.target.value as Settings["status"] })
                }
              >
                {Object.entries(statusNames).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field-group">
              <label
                className="modal-label"
                htmlFor="generated-mini-instructions"
              >
                Hướng dẫn
              </label>
              <textarea
                id="generated-mini-instructions"
                className="modal-textarea"
                maxLength={10000}
                rows={2}
                value={settings.description}
                onChange={(event) => setSettings({ ...settings, description: event.target.value })}
              />
            </div>
          </div>
        </fieldset>
        <p className="mod-assessment-list-note">
          Chọn trạng thái Đã xuất bản rồi bấm Xuất bản exercise để học sinh làm bài.
        </p>
        <div className="modal-actions-row">
          <button
            type="submit"
            className="btn-modal-submit"
            disabled={busy || !canGenerate}
          >
            {busy
              ? "Đang lưu..."
              : settings.status === "PUBLISHED"
                ? "Xuất bản exercise"
                : test
                ? "Cập nhật exercise"
                : `Tạo exercise từ ${selectedWords.length} từ`}
          </button>
        </div>
      </form>
    </div>
  );
}
