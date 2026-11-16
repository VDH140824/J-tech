import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  archiveVocabulary,
  getChapterVocabularyCards,
  getChapterVocabularies,
  getStudentChapterVocabularyCards,
  saveVocabulary,
  type ChapterVocabularyCard,
  type VocabularyInput,
  type VocabularyItem,
} from "../../../api/vocabularyApi";
import { exerciseError } from "../../../api/vocabularyExerciseApi";
import { getLessonsByChapter, type LessonSummary } from "../../../api/lessonApi";
import { VocabularyPronunciation } from "./VocabularyPronunciation";
import "./VocabularyExercises.css";

interface Props {
  chapterId: number;
  chapterNo: number;
  courseName: string;
  onBack: () => void;
  student?: boolean;
}
const STATUS_LABELS = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  HIDDEN: "Đã ẩn",
  ARCHIVED: "Đã lưu trữ",
} as const;

function emptyVocabularyForm(): VocabularyInput {
  return {
    word: "",
    reading: "",
    meaningVi: "",
    wordType: "",
    exampleJp: "",
    exampleVi: "",
    displayOrder: 0,
    status: "DRAFT",
  };
}

function vocabularyToForm(item: VocabularyItem): VocabularyInput {
  return {
    word: String(item.word ?? ""),
    reading: String(item.reading ?? ""),
    meaningVi: String(item.meaningVi ?? ""),
    wordType: String(item.wordType ?? ""),
    exampleJp: String(item.exampleJp ?? ""),
    exampleVi: String(item.exampleVi ?? ""),
    displayOrder: item.displayOrder,
    status: item.status,
  };
}

function nextDisplayOrder(items: VocabularyItem[], lessonId?: number) {
  return items
    .filter((item) => lessonId === undefined || item.lessonId === lessonId)
    .reduce((next, item) => Math.max(next, item.displayOrder + 1), 0);
}

function validateVocabularyForm(form: VocabularyInput): VocabularyInput | null {
  const input = { ...form };
  for (const field of ["word", "reading", "meaningVi"] as const) {
    input[field] = String(input[field] ?? "").trim();
    if (!input[field]) return null;
  }
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0) return null;
  for (const field of ["wordType", "exampleJp", "exampleVi"] as const) {
    input[field] = String(input[field] ?? "").trim();
  }
  return input;
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function VocabularyChapterFlashcards({
  chapterId,
  chapterNo,
  courseName,
  onBack,
  student = false,
}: Props) {
  const [cards, setCards] = useState<ChapterVocabularyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [lessonFilter, setLessonFilter] = useState("ALL");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [vocabularyLessons, setVocabularyLessons] = useState<LessonSummary[]>([]);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<VocabularyItem | null>(null);
  const [forms, setForms] = useState<Record<number, VocabularyInput>>({});
  const [newForm, setNewForm] = useState<VocabularyInput>({ displayOrder: 0, status: "DRAFT" });
  const [newLessonId, setNewLessonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const locked = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      student
        ? getStudentChapterVocabularyCards(chapterId, controller.signal)
        : getChapterVocabularyCards(chapterId, controller.signal),
      student
        ? Promise.resolve([] as VocabularyItem[])
        : getChapterVocabularies(chapterId, controller.signal),
      student ? Promise.resolve([] as LessonSummary[]) : getLessonsByChapter(chapterId, "VOCABULARY"),
    ])
      .then(([data, vocabulary, lessons]) => {
        if (!controller.signal.aborted) {
          setCards(data);
          setVocabularyItems(vocabulary);
          setVocabularyLessons(lessons);
          setIndex(0);
          setFlipped(false);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(exerciseError(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [chapterId, retry, student]);
  const visible = cards.filter(
    (card) => lessonFilter === "ALL" || String(card.lessonId) === lessonFilter,
  );
  const card = visible[index];
  const lessons = [
    ...new Map(
      cards.map((item) => [
        item.lessonId,
        { id: item.lessonId, no: item.lessonNo, title: item.lessonTitle },
      ]),
    ).values(),
  ].sort((left, right) => left.no - right.no);
  const move = (value: number) => {
    setIndex(value);
    setFlipped(false);
  };
  const shuffle = () => {
    const next = [...cards];
    for (let position = next.length - 1; position > 0; position--) {
      const selected = Math.floor(Math.random() * (position + 1));
      [next[position], next[selected]] = [next[selected], next[position]];
    }
    setCards(next);
    move(0);
  };
  const exportCards = () => {
    const rows = [
      ["Bài", "Tên bài", "STT", "Thuật ngữ", "Cách đọc", "Nghĩa tiếng Việt", "Ví dụ tiếng Nhật", "Dịch nghĩa ví dụ"],
      ...visible.map((item, position) => [
        item.lessonNo,
        item.lessonTitle,
        position + 1,
        item.word,
        item.reading,
        item.meaningVi,
        item.exampleJp,
        item.exampleVi,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvValue).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Vocabulary_Chapter_${chapterNo}_Flashcards.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const openEdit = (cardId?: number) => {
    if (cardId !== undefined && !vocabularyItems.some((candidate) => candidate.id === cardId)) {
      setActionError("Không tìm thấy dữ liệu từ vựng để chỉnh sửa. Vui lòng tải lại.");
      return;
    }
    setActionError("");
    setForms(Object.fromEntries(vocabularyItems.map((item) => [item.id, vocabularyToForm(item)])));
    setNewLessonId(String(vocabularyLessons[0]?.id ?? ""));
    setNewForm({ ...emptyVocabularyForm(), displayOrder: nextDisplayOrder(vocabularyItems, vocabularyLessons[0]?.id) });
    setEditing(true);
  };
  const saveEdit = async (event: FormEvent, item: VocabularyItem) => {
    event.preventDefault();
    if (!item.lessonId || locked.current) return;
    const input = validateVocabularyForm(forms[item.id] ?? vocabularyToForm(item));
    if (!input) {
      setActionError("Vui lòng nhập đủ thuật ngữ, cách đọc, nghĩa tiếng Việt và thứ tự hợp lệ.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setActionError("");
    try {
      await saveVocabulary(
        `/lessons/${item.lessonId}/vocabularies`,
        item.lessonId,
        input,
        item.id,
      );
      setRetry((value) => value + 1);
    } catch (failure) {
      setActionError(exerciseError(failure));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const saveNewVocabulary = async (event: FormEvent) => {
    event.preventDefault();
    const lessonId = Number(newLessonId);
    if (!Number.isInteger(lessonId) || lessonId <= 0 || locked.current) {
      setActionError("Vui lòng chọn bài học để thêm từ vựng.");
      return;
    }
    const input = validateVocabularyForm(newForm);
    if (!input) {
      setActionError("Vui lòng nhập đủ thuật ngữ, cách đọc, nghĩa tiếng Việt và thứ tự hợp lệ.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setActionError("");
    try {
      await saveVocabulary(`/lessons/${lessonId}/vocabularies`, lessonId, input);
      setNewForm({ ...emptyVocabularyForm(), displayOrder: nextDisplayOrder(vocabularyItems, lessonId) });
      setRetry((value) => value + 1);
    } catch (failure) {
      setActionError(exerciseError(failure));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const archiveCard = async () => {
    if (!deleting?.lessonId || locked.current) return;
    locked.current = true;
    setBusy(true);
    setActionError("");
    try {
      await archiveVocabulary(deleting.lessonId, deleting.id);
      setDeleting(null);
      setRetry((value) => value + 1);
    } catch (failure) {
      setActionError(exerciseError(failure));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const closeActionDialog = () => {
    if (busy) return;
    setEditing(false);
    setDeleting(null);
    setActionError("");
  };
  const selectedItem = deleting;
  const dialogOpen = editing || Boolean(deleting);
  const updateForm = (id: number, field: string, value: string | number) => {
    setForms((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  };
  const renderFields = (
    form: VocabularyInput,
    onChange: (field: string, value: string | number) => void,
    disabled: boolean,
    idPrefix: string,
  ) => (
    <>
      <label>
        Thuật ngữ *
        <input value={String(form.word ?? "")} maxLength={100} disabled={disabled}
          onChange={(event) => onChange("word", event.target.value)} />
      </label>
      <label>
        Cách đọc *
        <input value={String(form.reading ?? "")} maxLength={100} disabled={disabled}
          onChange={(event) => onChange("reading", event.target.value)} />
      </label>
      <label>
        Nghĩa tiếng Việt *
        <input value={String(form.meaningVi ?? "")} maxLength={255} disabled={disabled}
          onChange={(event) => onChange("meaningVi", event.target.value)} />
      </label>
      <label>
        Từ loại
        <input value={String(form.wordType ?? "")} maxLength={50} disabled={disabled}
          onChange={(event) => onChange("wordType", event.target.value)} />
      </label>
      <label>
        Ví dụ tiếng Nhật
        <textarea value={String(form.exampleJp ?? "")} maxLength={500} disabled={disabled}
          onChange={(event) => onChange("exampleJp", event.target.value)} />
      </label>
      <label>
        Dịch nghĩa ví dụ
        <textarea value={String(form.exampleVi ?? "")} maxLength={500} disabled={disabled}
          onChange={(event) => onChange("exampleVi", event.target.value)} />
      </label>
      <div className="mod-vocab-card-edit-grid">
        <label>
          Thứ tự
          <input type="number" min={0} value={form.displayOrder} disabled={disabled}
            onChange={(event) => onChange("displayOrder", Number(event.target.value))} />
        </label>
        <label>
          Trạng thái
          <select value={form.status} disabled={disabled}
            onChange={(event) => onChange("status", event.target.value)}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={`${idPrefix}-${value}`} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
  return (
    <div className="admin-page-container">
      <div className="mod-chapter-back-row">
        <button
          className="mod-btn-back mod-vocab-button mod-vocab-button--back"
          onClick={onBack}
        >
          ← {student ? "Danh sách bài học" : "Danh sách bài Vocab"}
        </button>
        <span className="mod-chapter-breadcrumb-pill">
          {courseName} / Chương {chapterNo} / Flashcard
        </span>
      </div>
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">Flashcard từ vựng chương {chapterNo}</h2>
          <p className="admin-main-subtitle">
            Tổng hợp từ vựng từ tất cả bài Vocab của chương, không cần tạo bộ thẻ riêng cho từng
            bài.
          </p>
        </div>
      </div>
      {loading ? (
        <div
          className="admin-loading-state"
          role="status"
        >
          <div className="admin-loading-spinner" />
          <p>Đang tải flashcard...</p>
        </div>
      ) : error ? (
        <div
          className="mod-assessment-error"
          role="alert"
        >
          {error}
          <button
            className="mod-btn-back"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="mod-section-toolbar">
            <select
              className="mod-toolbar-select"
              aria-label="Lọc flashcard theo bài"
              value={lessonFilter}
              onChange={(event) => {
                setLessonFilter(event.target.value);
                move(0);
              }}
            >
              <option value="ALL">Tất cả bài trong chương ({cards.length} từ)</option>
              {lessons.map((lesson) => (
                <option
                  key={lesson.id}
                  value={lesson.id}
                >
                  Bài {lesson.no}: {lesson.title}
                </option>
              ))}
            </select>
            {!student && (
              <button className="mod-btn-back mod-vocab-button mod-vocab-button--primary" onClick={() => openEdit()}>
                Sửa / thêm từ vựng
              </button>
            )}
            <button
              className="mod-btn-back"
              data-vocab-action="export"
              disabled={!visible.length}
              onClick={exportCards}
            >
              Xuất file CSV
            </button>
            <button
              className="mod-btn-back"
              disabled={!visible.length}
              onClick={shuffle}
            >
              Trộn thẻ
            </button>
          </div>
          {!card ? (
            <div className="admin-table-card admin-empty-state">
              <h3>Chưa có từ vựng</h3>
              <p>Gán từ vựng cho các bài trong chương để hiển thị flashcard.</p>
            </div>
          ) : (
            <div className="mod-chapter-flashcards">
              <p>
                Bài {card.lessonNo}: {card.lessonTitle} · Thẻ {index + 1}/{visible.length}
              </p>
              <button
                className={`mod-chapter-flashcard ${flipped ? "flipped" : ""}`}
                aria-label={
                  flipped ? "Mặt sau, nhấn để xem từ vựng" : "Mặt trước, nhấn để xem định nghĩa"
                }
                onClick={() => setFlipped((value) => !value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" && index < visible.length - 1) {
                    event.preventDefault();
                    move(index + 1);
                  }
                  if (event.key === "ArrowLeft" && index > 0) {
                    event.preventDefault();
                    move(index - 1);
                  }
                }}
              >
                <span className="mod-chapter-flashcard-caption">
                  {flipped ? "ĐỊNH NGHĨA" : "THUẬT NGỮ"}
                </span>
                <strong
                  className={
                    flipped
                      ? "mod-chapter-flashcard-meaning"
                      : "mod-chapter-flashcard-term"
                  }
                >
                  {flipped ? card.meaningVi : card.word}
                </strong>
                {!flipped && <span>{card.reading}</span>}
                {flipped && (card.exampleJp || card.exampleVi) && (
                  <span className="mod-chapter-flashcard-examples">
                    {card.exampleJp && <span>{card.exampleJp}</span>}
                    {card.exampleVi && <span>{card.exampleVi}</span>}
                  </span>
                )}
                <small>Nhấn để lật thẻ</small>
              </button>
              <VocabularyPronunciation
                key={card.id}
                word={card.word}
                reading={card.reading}
              />
              <div className="mod-chapter-flashcard-actions">
                <button
                  className="mod-btn-back"
                  disabled={index === 0}
                  onClick={() => move(index - 1)}
                >
                  ← Thẻ trước
                </button>
                <button
                  className="mod-btn-back"
                  onClick={() => setFlipped((value) => !value)}
                >
                  Lật thẻ
                </button>
                <button
                  className="mod-btn-back"
                  disabled={index >= visible.length - 1}
                  onClick={() => move(index + 1)}
                >
                  Thẻ sau →
                </button>
                {!student && (
                  <>
                    <button
                      className="mod-btn-back"
                      data-vocab-action="edit"
                      onClick={() => openEdit(card.id)}
                    >
                      Sửa từ
                    </button>
                    <button
                      className="mod-btn-back"
                      data-vocab-action="delete"
                      disabled={vocabularyItems.find((item) => item.id === card.id)?.status === "ARCHIVED"}
                      onClick={() => {
                        const item = vocabularyItems.find((candidate) => candidate.id === card.id);
                        if (item) {
                          setActionError("");
                          setDeleting(item);
                        }
                      }}
                    >
                      Xóa từ
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {dialogOpen && (
        <div className="mod-vocab-card-dialog-overlay" onClick={closeActionDialog}>
          <div
            ref={dialog}
            className={`mod-vocab-card-dialog ${editing ? "mod-vocab-manager-dialog" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mod-vocab-card-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mod-vocab-card-dialog-header">
              <h3 id="mod-vocab-card-dialog-title">
                {editing ? "Quản lý từ vựng chương" : "Lưu trữ từ vựng"}
              </h3>
              <button type="button" aria-label="Đóng" disabled={busy} onClick={closeActionDialog}>
                ×
              </button>
            </div>
            {actionError && <p className="mod-vocab-card-dialog-error" role="alert">{actionError}</p>}
            {editing ? (
              <div className="mod-vocab-manager-content">
                <section className="mod-vocab-manager-add">
                  <h4>Thêm từ vựng</h4>
                  <form onSubmit={saveNewVocabulary} className="mod-vocab-card-edit-form">
                    <label className="mod-vocab-manager-lesson">
                      Bài học *
                      <select
                        value={newLessonId}
                        disabled={busy || !vocabularyLessons.length}
                        onChange={(event) => {
                          const id = Number(event.target.value);
                          setNewLessonId(event.target.value);
                          setNewForm((current) => ({ ...current, displayOrder: nextDisplayOrder(vocabularyItems, id) }));
                        }}
                      >
                        {vocabularyLessons.map((lesson) => (
                          <option key={lesson.id} value={lesson.id}>Bài {lesson.lessonNo}: {lesson.title}</option>
                        ))}
                      </select>
                    </label>
                    {renderFields(newForm, (field, value) => setNewForm((current) => ({ ...current, [field]: value })), busy, "new")}
                    {vocabularyLessons.length === 0 && <p className="mod-vocab-card-dialog-error">Chương này chưa có bài từ vựng để gắn từ mới.</p>}
                    <div className="mod-vocab-card-dialog-actions">
                      <button type="submit" disabled={busy || !vocabularyLessons.length}>
                        {busy ? "Đang lưu..." : "Thêm từ vào cơ sở dữ liệu"}
                      </button>
                    </div>
                  </form>
                </section>
                <section className="mod-vocab-manager-list">
                  <h4>Các từ trong chương ({vocabularyItems.length})</h4>
                  {vocabularyItems.length === 0 ? (
                    <p>Chưa có từ vựng trong chương này.</p>
                  ) : vocabularyItems.map((item, position) => (
                    <form key={item.id} onSubmit={(event) => void saveEdit(event, item)} className="mod-vocab-manager-item">
                      <div className="mod-vocab-manager-item-heading">
                        <h5>Từ {position + 1}: {String(item.word ?? "")}</h5>
                        <span>{vocabularyLessons.find((lesson) => lesson.id === item.lessonId)?.title ?? `Bài học ${item.lessonId ?? "-"}`}</span>
                      </div>
                      {renderFields(forms[item.id] ?? vocabularyToForm(item), (field, value) => updateForm(item.id, field, value), busy, String(item.id))}
                      <div className="mod-vocab-card-dialog-actions">
                        <button type="submit" disabled={busy || !item.lessonId}>
                          {busy ? "Đang lưu..." : "Lưu từ này vào cơ sở dữ liệu"}
                        </button>
                      </div>
                    </form>
                  ))}
                </section>
              </div>
            ) : (
              <div className="mod-vocab-card-archive-confirm">
                <p>
                  Lưu trữ <strong>{String(selectedItem?.word ?? "từ vựng này")}</strong>?
                </p>
                <p>Từ sẽ được đánh dấu “Đã lưu trữ”, không bị xóa khỏi database.</p>
                <div className="mod-vocab-card-dialog-actions">
                  <button type="button" disabled={busy} onClick={closeActionDialog}>
                    Hủy
                  </button>
                  <button type="button" disabled={busy} onClick={() => void archiveCard()}>
                    {busy ? "Đang lưu trữ..." : "Xác nhận lưu trữ"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
