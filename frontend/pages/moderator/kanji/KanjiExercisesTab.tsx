import { KanjiExerciseImportModal, useKanjiDialog } from "./KanjiExerciseImportModal";
import { deleteChapterKanjiExercise, getChapterKanjiExercise, listChapterKanjiExercises, saveChapterKanjiExercise,
  downloadKanjiExcel, prepareKanjiDocument, assignKanjiExercise, type KanjiDocument } from "../../../api/kanjiChapterApi";
import { useEffect, useState, type FormEvent } from "react";
import {
  kanjiExerciseError,
  type KanjiDifficulty,
  type KanjiExercise,
  type KanjiExerciseInput,
  type KanjiExercisePage,
  type KanjiQuestionType,
} from "../../../api/kanjiExerciseApi";

const typeNames = {
  MCQ: "Trắc nghiệm",
  FILL_IN: "Điền đáp án",
  MATCHING: "Nối cặp",
};
const difficultyNames = { EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó" };
const blank = (): KanjiExerciseInput => ({
  questionType: "MCQ",
  content: "",
  explanation: "",
  difficulty: "EASY",
  displayOrder: 0,
  options: ["", "", "", ""],
  correctAnswer: "",
  matches: {},
});
const normalize = (s: string) => s.trim().normalize("NFKC").toLowerCase();
type Pair = { left: string; right: string };

export function KanjiExercisesTab({
  chapterId,
  documentLessonId,
  documentName = "",
  unassigned = false,
  documents = [],
  onChanged,
  readOnly = false,
}: {
  chapterId: number;
  documentLessonId?: number;
  documentName?: string;
  unassigned?: boolean;
  documents?: KanjiDocument[];
  onChanged?: () => Promise<void>;
  readOnly?: boolean;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState<KanjiExercise>();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("ACTIVE");
  const [data, setData] = useState<KanjiExercisePage>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [listError, setListError] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<KanjiExerciseInput>();
  const [editingId, setEditingId] = useState<number>();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [preview, setPreview] = useState<KanjiExercise>();
  const [answer, setAnswer] = useState("");
  const [matchingAnswers, setMatchingAnswers] = useState<
    Record<string, string>
  >({});
  const [checked, setChecked] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState("");
  const editorDialog = useKanjiDialog(!!draft, () => setDraft(undefined), busy);
  const deleteDialog = useKanjiDialog(!!deleting, () => setDeleting(undefined), busy);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setListError(false);
    listChapterKanjiExercises(chapterId, page, status, controller.signal, documentLessonId, unassigned)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (page > 0 && page >= result.totalPages) {
          setPage(Math.max(0, result.totalPages - 1));
          return;
        }
        setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(kanjiExerciseError(e));
          setListError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [chapterId, documentLessonId, unassigned, page, status, reload]);

  function edit(item?: KanjiExercise) {
    setEditingId(item?.id);
    setPreview(undefined);
    setError("");
    setNotice("");
    setDraft(
      item
        ? {
            ...item,
            options: [...(item.options ?? [])],
            matches: { ...item.matches },
          }
        : blank(),
    );
    setPairs(
      item?.questionType === "MATCHING"
        ? Object.entries(item.matches).map(([left, right]) => ({ left, right }))
        : [
            { left: "", right: "" },
            { left: "", right: "" },
          ],
    );
  }
  async function open(id: number) {
    setBusy(true);
    setError("");
    setChecked(false);
    setAnswer("");
    setMatchingAnswers({});
    try {
      setPreview(await getChapterKanjiExercise(chapterId, id, documentLessonId));
      setDraft(undefined);
    } catch (e) {
      setError(kanjiExerciseError(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    const input = {
      ...draft,
      content: draft.content.trim(),
      explanation: draft.explanation.trim(),
      options: draft.options.map((x) => x.trim()),
      correctAnswer: draft.correctAnswer.trim(),
      matches: {} as Record<string, string>,
    };
    if (input.questionType !== "MCQ") input.options = [];
    if (input.questionType === "MATCHING") input.correctAnswer = "";
    if (!input.content) {
      setError("Vui lòng nhập nội dung câu hỏi.");
      return;
    }
    if (
      input.questionType === "MCQ" &&
      (input.options.length < 2 ||
        input.options.some((x) => !x) ||
        new Set(input.options.map(normalize)).size !== input.options.length ||
        !input.options.includes(input.correctAnswer))
    ) {
      setError("Nhập 2–6 lựa chọn khác nhau và chọn đáp án đúng.");
      return;
    }
    if (input.questionType === "FILL_IN" && !input.correctAnswer) {
      setError("Vui lòng nhập đáp án đúng.");
      return;
    }
    if (input.questionType === "MATCHING") {
      if (
        pairs.some((p) => !p.left.trim() || !p.right.trim()) ||
        new Set(pairs.map((p) => normalize(p.left))).size !== pairs.length ||
        new Set(pairs.map((p) => normalize(p.right))).size !== pairs.length
      ) {
        setError("Nhập 2–10 cặp, mỗi vế không trống và không trùng nhau.");
        return;
      }
      input.matches = Object.fromEntries(
        pairs.map((p) => [p.left.trim(), p.right.trim()]),
      );
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveChapterKanjiExercise(chapterId, editingId, input, documentLessonId);
      setDraft(undefined);
      setReload((n) => n + 1);
      setNotice(
        editingId && saved.id !== editingId
          ? "Đã lưu bản thay thế. Câu hỏi cũ được lưu trữ để giữ lịch sử."
          : "Đã lưu bài tập Kanji.",
      );
      await onChanged?.();
    } catch (e) {
      setError(kanjiExerciseError(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: KanjiExercise) {
    if (busy || readOnly) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteChapterKanjiExercise(chapterId, item.id, documentLessonId);
      setPreview(undefined);
      setReload((n) => n + 1);
      setDeleting(undefined);
      setNotice(
        result === "ARCHIVED"
          ? "Đã lưu trữ câu hỏi và giữ lịch sử."
          : "Đã xóa câu hỏi.",
      );
      await onChanged?.();
    } catch (e) {
      setError(kanjiExerciseError(e));
    } finally {
      setBusy(false);
    }
  }

  async function assign(item: KanjiExercise) {
    const target = assignmentTarget === "" ? undefined : documents[Number(assignmentTarget)];
    if (!target || busy || readOnly || item.status !== "ACTIVE") return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const prepared = await prepareKanjiDocument(chapterId, target);
      await assignKanjiExercise(chapterId, item.id, prepared.lessonId);
      setAssignmentTarget("");
      setPreview(undefined);
      setDraft(undefined);
      setReload(value => value + 1);
      setNotice(`Đã gán câu hỏi vào tài liệu “${target.name}”.`);
      await onChanged?.();
    } catch (error) {
      setError(kanjiExerciseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function excel(template: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try { await downloadKanjiExcel(chapterId, template ? undefined : documentLessonId, status); }
    catch { setError("Không tải được file Excel. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return (
    <section className="kanji-exercises" aria-label="Quản lý bài tập Kanji">
      <div className="mod-section-toolbar">
        <h3 className="admin-main-title">{unassigned ? "Câu hỏi chưa gán tài liệu" : "Danh sách câu hỏi Kanji"}</h3>
        {!unassigned && documentLessonId !== undefined && <div className="kanji-exercise-actions">
          <button type="button" className="mod-btn-add mod-question-btn--secondary" disabled={busy} onClick={() => void excel(true)}>Tải mẫu Excel</button>
          <button type="button" className="mod-btn-add mod-question-btn--secondary" disabled={busy || readOnly} onClick={() => setImportOpen(true)}>Nhập từ Excel</button>
          <button type="button" className="mod-btn-add mod-question-btn--secondary" disabled={busy || loading || listError} onClick={() => void excel(false)}>Xuất Excel</button>
        </div>}
        {!unassigned && <button
          type="button"
          className="mod-btn-add mod-question-btn--primary"
          disabled={busy || readOnly || documentLessonId === undefined}
          onClick={() => edit()}
        >
          + Thêm câu hỏi
        </button>}
        <label>
          Trạng thái{" "}
          <select
            disabled={busy}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="ACTIVE">Đang sử dụng</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
            <option value="">Tất cả</option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => setReload((n) => n + 1)}
        >
          Tải lại
        </button>
      </div>
      {unassigned && <label className="kanji-document-toolbar">Tài liệu nhận câu hỏi{" "}
        <select aria-label="Tài liệu nhận câu hỏi" value={assignmentTarget} disabled={busy || readOnly}
          onChange={event => setAssignmentTarget(event.target.value)}>
          <option value="">Chọn tài liệu</option>
          {documents.map((document, index) => <option key={`${document.lessonId}-${index}`} value={index}>{document.name}</option>)}
        </select>
        {!documents.length && <span>Upload tài liệu để gán các câu hỏi này.</span>}
      </label>}
      {error && !draft && !deleting && (
        <p role="alert" className="kanji-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {draft && (
        <div className="modal-overlay"><section ref={editorDialog} className="modal-card kanji-exercise-modal" role="dialog" aria-modal="true" aria-label="Nhập câu hỏi Kanji">
        <form className="modal-form-body kanji-exercise-editor" onSubmit={save}>
          <button type="button" className="modal-btn-close" aria-label="Đóng" disabled={busy} onClick={() => setDraft(undefined)}>×</button>
          <h3 className="modal-title">{editingId ? "Chỉnh sửa câu hỏi Kanji" : "Thêm câu hỏi Kanji"}</h3>
          <p><strong>Tài liệu: {documentName || "Câu hỏi chưa gán tài liệu"}</strong></p>
          {error && <p role="alert" className="kanji-error">{error}</p>}
          <fieldset disabled={busy || readOnly}>
            <label>
              Dạng câu hỏi
              <select
                value={draft.questionType}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    questionType: e.target.value as KanjiQuestionType,
                    options: e.target.value === "MCQ" ? ["", "", "", ""] : [],
                    correctAnswer: "",
                    matches: {},
                  })
                }
              >
                {Object.entries(typeNames).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nội dung *
              <textarea
                required
                maxLength={10000}
                value={draft.content}
                onChange={(e) =>
                  setDraft({ ...draft, content: e.target.value })
                }
              />
            </label>
            <label>
              Độ khó
              <select
                value={draft.difficulty}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    difficulty: e.target.value as KanjiDifficulty,
                  })
                }
              >
                {Object.entries(difficultyNames).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Thứ tự hiển thị
              <input
                type="number"
                required
                min={0}
                max={65535}
                step={1}
                value={draft.displayOrder}
                onChange={(e) =>
                  setDraft({ ...draft, displayOrder: Number(e.target.value) })
                }
              />
            </label>
            {draft.questionType === "MCQ" && (
              <fieldset>
                <legend>Lựa chọn và đáp án đúng</legend>
                {draft.options.map((option, index) => (
                  <div className="kanji-exercise-option" key={index}>
                    <input
                      type="radio"
                      aria-label={`Chọn đáp án ${index + 1} là đúng`}
                      name="correctOption"
                      checked={!!option && draft.correctAnswer === option}
                      onChange={() =>
                        setDraft({ ...draft, correctAnswer: option })
                      }
                    />
                    <input
                      aria-label={`Lựa chọn ${index + 1}`}
                      required
                      maxLength={1000}
                      value={option}
                      onChange={(e) => {
                        const options = [...draft.options];
                        options[index] = e.target.value;
                        setDraft({
                          ...draft,
                          options,
                          correctAnswer:
                            option === draft.correctAnswer
                              ? e.target.value
                              : draft.correctAnswer,
                        });
                      }}
                    />
                    <button
                      type="button"
                      disabled={draft.options.length <= 2}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          options: draft.options.filter((_, i) => i !== index),
                          correctAnswer:
                            draft.correctAnswer === option
                              ? ""
                              : draft.correctAnswer,
                        })
                      }
                    >
                      Bỏ
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={draft.options.length >= 6}
                  onClick={() =>
                    setDraft({ ...draft, options: [...draft.options, ""] })
                  }
                >
                  Thêm lựa chọn
                </button>
              </fieldset>
            )}
            {draft.questionType === "FILL_IN" && (
              <label>
                Đáp án đúng *
                <input
                  required
                  maxLength={1000}
                  value={draft.correctAnswer}
                  onChange={(e) =>
                    setDraft({ ...draft, correctAnswer: e.target.value })
                  }
                />
              </label>
            )}
            {draft.questionType === "MATCHING" && (
              <fieldset>
                <legend>Cặp nối đúng</legend>
                {pairs.map((pair, index) => (
                  <div className="kanji-exercise-option" key={index}>
                    <input
                      aria-label={`Vế trái cặp ${index + 1}`}
                      required
                      maxLength={1000}
                      value={pair.left}
                      onChange={(e) =>
                        setPairs(
                          pairs.map((p, i) =>
                            i === index ? { ...p, left: e.target.value } : p,
                          ),
                        )
                      }
                    />
                    <span>↔</span>
                    <input
                      aria-label={`Vế phải cặp ${index + 1}`}
                      required
                      maxLength={1000}
                      value={pair.right}
                      onChange={(e) =>
                        setPairs(
                          pairs.map((p, i) =>
                            i === index ? { ...p, right: e.target.value } : p,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      disabled={pairs.length <= 2}
                      onClick={() =>
                        setPairs(pairs.filter((_, i) => i !== index))
                      }
                    >
                      Bỏ cặp
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={pairs.length >= 10}
                  onClick={() => setPairs([...pairs, { left: "", right: "" }])}
                >
                  Thêm cặp
                </button>
              </fieldset>
            )}
            <label>
              Giải thích
              <textarea
                maxLength={10000}
                value={draft.explanation}
                onChange={(e) =>
                  setDraft({ ...draft, explanation: e.target.value })
                }
              />
            </label>
            <div className="kanji-exercise-actions">
              <button type="submit" className="mod-btn-add">
                {busy ? "Đang lưu…" : "Lưu câu hỏi"}
              </button>
              <button type="button" onClick={() => setDraft(undefined)}>
                Hủy
              </button>
            </div>
          </fieldset>
        </form></section></div>
      )}
      {preview && (
        <section
          className="kanji-exercise-preview"
          aria-label="Xem trước câu hỏi"
        >
          <h3>Xem trước · {typeNames[preview.questionType]}</h3>
          <p className="kanji-exercise-text">{preview.content}</p>
          {preview.questionType === "MCQ" &&
            (preview.options ?? []).map((option, index) => (
              <label className="kanji-exercise-option" key={index}>
                <input
                  type="radio"
                  name="previewAnswer"
                  value={option}
                  checked={answer === option}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    setChecked(false);
                  }}
                />
                {option}
              </label>
            ))}
          {preview.questionType === "FILL_IN" && (
            <label>
              Đáp án thử
              <input
                maxLength={1000}
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setChecked(false);
                }}
              />
            </label>
          )}
          {preview.questionType === "MATCHING" &&
            Object.keys(preview.matches).map((left) => (
              <label key={left}>
                {left}
                <select
                  value={matchingAnswers[left] ?? ""}
                  onChange={(e) => {
                    setMatchingAnswers({
                      ...matchingAnswers,
                      [left]: e.target.value,
                    });
                    setChecked(false);
                  }}
                >
                  <option value="">Chọn vế phải</option>
                  {Object.values(preview.matches)
                    .sort((a, b) => a.localeCompare(b))
                    .map((right) => (
                      <option key={right} value={right}>
                        {right}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          <div className="kanji-exercise-actions">
            <button type="button" onClick={() => setChecked(true)}>
              Kiểm tra đáp án
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(undefined)}
            >
              Đóng xem trước
            </button>
          </div>
          {checked && (
            <div role="status">
              <p>
                {(
                  preview.questionType === "MATCHING"
                    ? Object.entries(preview.matches).every(
                        ([left, right]) =>
                          normalize(matchingAnswers[left] ?? "") ===
                          normalize(right),
                      )
                    : normalize(answer) === normalize(preview.correctAnswer)
                )
                  ? "Chính xác!"
                  : "Chưa chính xác."}
              </p>
              <p>
                Đáp án:{" "}
                {preview.questionType === "MATCHING"
                  ? Object.entries(preview.matches)
                      .map(([l, r]) => `${l} ↔ ${r}`)
                      .join("; ")
                  : preview.correctAnswer}
              </p>
              <p className="kanji-exercise-text">{preview.explanation}</p>
            </div>
          )}
        </section>
      )}
      {loading ? (
        <p role="status">Đang tải bài tập…</p>
      ) : (
        !listError && (
          <>
            <p>{data?.totalElements ?? 0} câu hỏi</p>
            {data?.content.length ? (
              <div className="admin-table-card admin-table-responsive kanji-exercise-table">
                <table className="admin-dekiru-table">
                  <thead>
                    <tr>
                      <th>Dạng</th>
                      <th>Độ khó</th>
                      <th>Nội dung</th>
                      <th>Giải thích</th>
                      <th>Đáp án</th>
                      <th>Thứ tự hiển thị</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((q) => (
                      <tr key={q.id}>
                        <td>{typeNames[q.questionType]}</td>
                        <td>{difficultyNames[q.difficulty]}</td>
                        <td className="kanji-exercise-summary">{q.content}</td>
                        <td className="kanji-exercise-text">{q.explanation || "—"}</td>
                        <td className="kanji-exercise-text">{q.questionType === "MCQ"
                          ? q.options.map((option, index) => String.fromCharCode(65 + index) + ". " + option + (option === q.correctAnswer ? " (Đúng)" : "")).join("\n")
                          : q.questionType === "MATCHING" ? Object.entries(q.matches).map(([left, right]) => left + " ↔ " + right).join("\n") : q.correctAnswer}</td>
                        <td>{q.displayOrder}</td>
                        <td>
                          {q.status === "ACTIVE"
                            ? "Đang sử dụng"
                            : "Đã lưu trữ"}
                        </td>
                        <td>
                          <div className="kanji-exercise-actions">
                            {unassigned && <button disabled={busy || readOnly || assignmentTarget === "" || q.status !== "ACTIVE"}
                              onClick={() => assign(q)}>Gán tài liệu</button>}
                            <button className="mod-btn-add mod-question-btn--secondary" disabled={busy} onClick={() => open(q.id)}>
                              Xem trước
                            </button>
                            <button
                              className="mod-btn-add mod-question-btn--secondary"
                              disabled={
                                busy || readOnly || q.status === "ARCHIVED"
                              }
                              onClick={() => edit(q)}
                            >
                              Sửa
                            </button>
                            <button
                              className="btn-modal-delete"
                              disabled={
                                busy || readOnly || q.status === "ARCHIVED"
                              }
                              onClick={() => { setError(""); setDeleting(q); }}
                            >
                              Xóa / Lưu trữ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Chưa có câu hỏi phù hợp.</p>
            )}
            <div className="kanji-pagination">
              <button
                disabled={busy || page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>
              <span>
                Trang {page + 1} / {Math.max(1, data?.totalPages ?? 0)}
              </span>
              <button
                disabled={busy || page + 1 >= (data?.totalPages ?? 0)}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </>
        )
      )}
      {importOpen && documentLessonId !== undefined && <KanjiExerciseImportModal chapterId={chapterId}
        documentLessonId={documentLessonId} documentName={documentName} onClose={() => setImportOpen(false)}
        onImported={async count => {
          setImportOpen(false); setPage(0); setReload(n => n + 1); setNotice("Đã nhập thành công " + count + " câu hỏi.");
          try { await onChanged?.(); } catch { setError("Đã nhập câu hỏi nhưng chưa cập nhật được thông tin tài liệu. Hãy tải lại trang, không cần nhập lại file."); }
        }} />}
      {deleting && <div className="modal-overlay"><section ref={deleteDialog} className="modal-card kanji-excel-dialog" role="dialog" aria-modal="true" aria-labelledby="kanji-delete-title">
        <div className="modal-header"><h3 className="modal-title" id="kanji-delete-title">Xác nhận xóa câu hỏi</h3></div>
        <div className="modal-form-body"><p>Bạn có chắc muốn xóa câu hỏi này? Câu đã sử dụng sẽ được lưu trữ để giữ lịch sử.</p>
          <p className="kanji-exercise-text">{deleting.content}</p>
          {error && <p role="alert" className="kanji-error">{error}</p>}
          <div className="modal-actions-row"><button className="btn-modal-cancel" disabled={busy} onClick={() => setDeleting(undefined)}>Hủy</button>
            <button className="btn-modal-delete" disabled={busy} onClick={() => void remove(deleting)}>{busy ? "Đang xóa…" : "Xác nhận xóa"}</button></div>
        </div></section></div>}
    </section>
  );
}
