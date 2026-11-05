import { useEffect, useState, type FormEvent } from "react";
import { getVocabularies, type VocabularyItem } from "../../api/vocabularyApi";
import {
  generateMiniTest,
  getMiniTest,
  getMiniTests,
  miniTestError,
  type MiniTestInput,
  type VocabularyMiniTest,
} from "../../api/vocabularyMiniTestApi";
import { VocabularyMiniTestPreview } from "./VocabularyMiniTestPreview";
import "./VocabularyMiniTests.css";

type Settings = Omit<MiniTestInput, "questions">;
const statusNames = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", ARCHIVED: "Đã lưu trữ" };
export function VocabularyMiniTestsTab({ lessonId }: { lessonId: number }) {
  const [test, setTest] = useState<VocabularyMiniTest | null>(null);
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState<VocabularyMiniTest | null>(null);
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
      getMiniTests(lessonId, controller.signal),
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
        const existing = tests[0] ? await getMiniTest(tests[0].id) : null;
        if (!active) return;
        const available = vocabulary.filter(
          (word) => word.status === "PUBLISHED" || word.status === "DRAFT",
        );
        const previousIds = new Set(existing?.questions.map((question) => question.sourceVocabularyId));
        setTest(existing);
        setWords(available);
        setSelectedIds(available.filter((word) => previousIds.has(word.id)).map((word) => word.id));
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
        if (active) setError(miniTestError(failure));
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
      const saved = await generateMiniTest(lessonId, { ...settings, vocabularyIds: selectedIds });
      setTest(saved);
      setNotice(
        saved.status === "PUBLISHED"
          ? `Đã xuất bản exercise với ${saved.questionCount} câu.`
          : `Đã lưu exercise với ${saved.questionCount} câu ở trạng thái ${statusNames[saved.status].toLowerCase()}.`,
      );
    } catch (failure) {
      setError(miniTestError(failure));
    } finally {
      setBusy(false);
    }
  };
  const openPreview = async () => {
    if (!test || busy) return;
    setBusy(true);
    setError("");
    try {
      setPreview(await getMiniTest(test.id));
    } catch (failure) {
      setError(miniTestError(failure));
    } finally {
      setBusy(false);
    }
  };
  if (preview)
    return (
      <VocabularyMiniTestPreview
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
  const canGenerate = selectedWords.length >= 2 && !hasHistory;
  return (
    <div className="mod-mini-tab">
      <div className="mod-mini-heading">
        <div>
          <h3>Exercise của bài học</h3>
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
      {error && (
        <div
          className="mod-mini-error"
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
          className="mod-mini-success"
          role="status"
        >
          ✓ {notice}
        </div>
      )}
      {test && (
        <div className="mod-mini-info">
          <span>{statusNames[test.status]}</span>
          <span>{test.questionCount} câu</span>
          <span>{test.attemptCount} lượt làm</span>
        </div>
      )}
      <details className="mod-mini-source" open>
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
                        setSelectedIds((current) => checked
                          ? [...current, word.id]
                          : current.filter((id) => id !== word.id));
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
      {!canGenerate && (
        <p className="mod-mini-error">
          {hasHistory
            ? "Exercise đã có lượt làm nên không thể tạo lại câu hỏi, để giữ nguyên kết quả cũ."
            : "Chọn ít nhất hai từ có nghĩa khác nhau để tạo đáp án trắc nghiệm."}
        </p>
      )}
      <form
        onSubmit={save}
        className="mod-mini-form mod-mini-generated-form"
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
        <p className="mod-mini-list-note">
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
