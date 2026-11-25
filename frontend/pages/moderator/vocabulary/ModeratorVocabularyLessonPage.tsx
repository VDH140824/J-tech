import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { getLessonById, type LessonSummary } from "../../../api/lessonApi";
import { parseLessonDocuments } from "../../../utils/lessonDocuments";
import { deleteVocabularyDocument, renameVocabularyDocument, uploadVocabularyDocument } from "../../../api/vocabularyDocumentApi";
import { ModeratorVocabularyListPage } from "./ModeratorVocabularyListPage";
import { VocabularyExerciseTab } from "./VocabularyExerciseTab";
import { StudentVocabularyExerciseTab } from "../../home/StudentVocabularyExerciseTab";
import { StudentVocabularyList } from "../../home/StudentVocabularyList";
import { getPdfPreviewUrl } from "../../../utils/lessonDocuments";
import "../ModeratorContent.css";

interface Props {
  lessonId: number;
  chapterId: number;
  courseName: string;
  chapterNo: number;
  chapterTitle: string;
  onBack: () => void;
  readOnly?: boolean;
  publishedLesson?: LessonSummary;
}

export function ModeratorVocabularyLessonPage({
  lessonId,
  chapterId,
  courseName,
  chapterNo,
  chapterTitle,
  onBack,
  readOnly = false,
  publishedLesson,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lesson, setLesson] = useState<LessonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [documentFile, setDocumentFile] = useState<File>();
  const [documentName, setDocumentName] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [documentNotice, setDocumentNotice] = useState("");
  const [documentBusy, setDocumentBusy] = useState(false);
  const [renamingUrl, setRenamingUrl] = useState("");
  const [renamedName, setRenamedName] = useState("");
  const documentInputRef = useRef<HTMLInputElement>(null);
  const selectedTab = searchParams.get("vocabTab");
  const tab = readOnly
    ? selectedTab === "questions" || selectedTab === "exercise"
      ? "questions"
      : "document"
    : selectedTab === "questions" || selectedTab === "exercise"
      ? "questions"
      : selectedTab === "words" ? "words" : "document";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setLesson(null);
    setDocumentIndex(0);
    if (!Number.isSafeInteger(lessonId) || lessonId < 1) {
      setError("Đường dẫn bài học không hợp lệ.");
      setLoading(false);
      return;
    }
    const request = readOnly
      ? publishedLesson?.id === lessonId &&
        publishedLesson.chapterId === chapterId &&
        publishedLesson.status === "PUBLISHED"
        ? Promise.resolve(publishedLesson)
        : Promise.reject(new Error("Lesson unavailable"))
      : getLessonById(lessonId);
    request
      .then((data) => {
        if (!active) return;
        if (data.chapterId !== chapterId || data.skillType !== "VOCABULARY") {
          setError("Bài học không thuộc phần từ vựng của chương này.");
        } else setLesson(data);
      })
      .catch(() => {
        if (active) setError("Không thể tải bài học. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lessonId, chapterId, retry, readOnly, publishedLesson]);

  const selectTab = (value: "document" | "questions" | "words") => {
    if (value !== "document") setShowUploadForm(false);
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === "document") next.delete("vocabTab");
        else next.set("vocabTab", value);
        return next;
      },
      { replace: true },
    );
  };

  const refreshLesson = async () => setLesson(await getLessonById(lessonId));
  const uploadDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!documentFile || !documentName.trim() || documentBusy) return;
    setDocumentBusy(true); setDocumentError(""); setDocumentNotice("");
    try {
      setLesson(await uploadVocabularyDocument(lessonId, documentFile, documentName.trim()));
      setDocumentFile(undefined); setDocumentName("");
      if (documentInputRef.current) documentInputRef.current.value = "";
      setShowUploadForm(false); setDocumentNotice("Đã tải tài liệu PDF lên."); setDocumentIndex(0);
    } catch (failure) {
      setDocumentError(failure instanceof Error ? failure.message : "Không tải được tài liệu PDF.");
    } finally { setDocumentBusy(false); }
  };
  const renameDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!renamingUrl || !renamedName.trim() || documentBusy) return;
    setDocumentBusy(true); setDocumentError(""); setDocumentNotice("");
    try {
      setLesson(await renameVocabularyDocument(lessonId, renamingUrl, renamedName.trim()));
      setRenamingUrl(""); setRenamedName(""); setDocumentNotice("Đã đổi tên tài liệu PDF.");
    } catch (failure) {
      setDocumentError(failure instanceof Error ? failure.message : "Không đổi được tên tài liệu.");
    } finally { setDocumentBusy(false); }
  };
  const removeDocument = async (url: string, name: string) => {
    if (documentBusy || !window.confirm(`Xóa tài liệu “${name}” khỏi bài học và Cloudinary?`)) return;
    setDocumentBusy(true); setDocumentError(""); setDocumentNotice("");
    try {
      setLesson(await deleteVocabularyDocument(lessonId, url));
      setDocumentIndex(0); setRenamingUrl(""); setDocumentNotice("Đã xóa tài liệu khỏi bài học và Cloudinary.");
    } catch (failure) {
      setDocumentError(failure instanceof Error ? failure.message : "Không xóa được tài liệu PDF.");
      await refreshLesson().catch(() => undefined);
    } finally { setDocumentBusy(false); }
  };

  if (loading)
    return (
      <div
        className="admin-loading-state"
        role="status"
      >
        <div className="admin-loading-spinner" />
        <p>Đang tải bài học từ vựng...</p>
      </div>
    );
  if (error || !lesson)
    return (
      <div className="admin-page-container">
        <button
          className="mod-btn-back mod-vocab-button mod-vocab-button--back"
          onClick={onBack}
        >
          ← Danh sách bài học
        </button>
        <div
          className="admin-empty-state"
          role="alert"
        >
          <h3>Không thể mở bài học</h3>
          <p>{error}</p>
          <button
            className="mod-btn-add"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      </div>
    );

  if (tab === "words" && !readOnly)
    return (
      <ModeratorVocabularyListPage
        lesson={lesson}
        courseName={courseName}
        chapterNo={chapterNo}
        chapterTitle={chapterTitle}
        skillLabel="Từ vựng"
        skillIcon="📕"
        skillColor="#0d9488"
        backLabel="danh sách bài học"
        onBack={onBack}
        readOnly={readOnly}
      />
    );

  const documents = parseLessonDocuments(lesson.documents);
  const document = documents[documentIndex];

  return (
    <div className="admin-page-container mod-vocab-lesson">
      <div className="mod-chapter-back-row">
        <button
          type="button"
          className="mod-btn-back mod-vocab-button mod-vocab-button--back"
          onClick={onBack}
        >
          ← Quay lại danh sách bài học
        </button>
        <span className="mod-chapter-breadcrumb-pill">
          {courseName} / Chương {chapterNo} / Từ vựng / Bài {lesson.lessonNo}
        </span>
      </div>
      <div className="admin-page-header">
        <div className="mod-header-action-row">
          <div className="admin-header-titles">
            <h2 className="admin-main-title">📕 {lesson.title}</h2>
            <p className="admin-main-subtitle">
              {lesson.description || `Bài học từ vựng ${lesson.lessonNo}`}
            </p>
          </div>
          {!readOnly && tab !== "questions" && (
            <div className="mod-vocab-lesson-header-actions">
              <button
                type="button"
                className="mod-btn-add mod-question-btn--primary"
                style={{ backgroundColor: "#0d9488" }}
                onClick={() => { selectTab("document"); setShowUploadForm((value) => !value); setDocumentError(""); }}
              >
                + Thêm tài liệu PDF
              </button>
              <button
                type="button"
                className="mod-btn-add mod-question-btn--primary"
                onClick={() => selectTab("words")}
              >
                Quản lý từ vựng
              </button>
              <button
                type="button"
                className="mod-btn-add mod-question-btn--primary"
                onClick={() => selectTab("questions")}
              >
                Danh sách câu hỏi
              </button>
            </div>
          )}
        </div>
      </div>
      {readOnly && <div
        className="mod-vocab-lesson-tabs"
        role="tablist"
        aria-label="Nội dung bài học"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const tabOrder = ["document", "questions"] as const;
          const tabIndex = tabOrder.indexOf(tab as typeof tabOrder[number]);
          const next = event.key === "Home"
            ? tabOrder[0]
            : event.key === "End"
              ? tabOrder[1]
              : tabOrder[(tabIndex + (event.key === "ArrowRight" ? 1 : tabOrder.length - 1)) % tabOrder.length];
          selectTab(next);
          window.document.getElementById(`vocab-${next}-tab`)?.focus();
        }}
      >
        <button
          id="vocab-document-tab"
          type="button"
          role="tab"
          tabIndex={tab === "document" ? 0 : -1}
          aria-selected={tab === "document"}
          aria-controls="vocab-lesson-panel"
          className={tab === "document" ? "active" : ""}
          onClick={() => selectTab("document")}
        >
          📄 Tài liệu
        </button>
        <button
          id="vocab-questions-tab"
          type="button"
          role="tab"
          tabIndex={tab === "questions" ? 0 : -1}
          aria-selected={tab === "questions"}
          aria-controls="vocab-lesson-panel"
          className={tab === "questions" ? "active" : ""}
          onClick={() => selectTab("questions")}
        >
          ✎ Bài tập
        </button>
      </div>}
      <section
        id="vocab-lesson-panel"
        role={readOnly ? "tabpanel" : undefined}
        aria-labelledby={readOnly ? `vocab-${tab === "questions" ? "questions" : tab}-tab` : undefined}
        className="admin-table-card mod-vocab-document-card"
      >
        {!readOnly && documentError && <p className="mod-assessment-error" role="alert">{documentError}</p>}
        {!readOnly && documentNotice && <p className="mod-assessment-success" role="status">{documentNotice}</p>}
        {!readOnly && showUploadForm && (
          <form className="mod-vocab-document-upload" onSubmit={uploadDocument}>
            <label htmlFor="vocab-document-name">Tên tài liệu</label>
            <input id="vocab-document-name" className="modal-input" required maxLength={200} value={documentName}
              disabled={documentBusy} onChange={(event) => setDocumentName(event.target.value)} />
            <label htmlFor="vocab-document-file">Tải PDF lên · tối đa 10 MB</label>
            <div className="mod-vocab-document-upload-actions">
              <input id="vocab-document-file" ref={documentInputRef} type="file" accept=".pdf,application/pdf" disabled={documentBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0]; setDocumentError(""); setDocumentNotice("");
                  if (file && (!file.size || file.size > 10 * 1024 * 1024 || !/\.pdf$/i.test(file.name))) {
                    setDocumentError("Chọn tệp PDF có dữ liệu và không quá 10 MB."); setDocumentFile(undefined); event.target.value = ""; return;
                  }
                  setDocumentFile(file); setDocumentName(file?.name.slice(0, 200) ?? "");
                }} />
              <button type="submit" className="mod-btn-add mod-vocab-upload-submit" disabled={!documentFile || documentBusy}>
                {documentBusy ? "Đang tải lên…" : "Tải tài liệu lên"}
              </button>
              <button type="button" className="mod-btn-back" disabled={documentBusy} onClick={() => setShowUploadForm(false)}>Hủy</button>
            </div>
          </form>
        )}
        {tab === "document" ? (
          <>
            <StudentVocabularyList lessonId={lesson.id} />
            {document ? (
              <>
              {!readOnly && documents.length > 0 && (
                <div className="mod-vocab-document-admin-list">
                  <strong>Tài liệu của bài học</strong>
                  <ul>
                    {documents.map((item, index) => (
                      <li key={item.url}>
                        <button type="button" className="mod-vocab-document-select" onClick={() => setDocumentIndex(index)}>
                          {item.name}{index === documentIndex ? " · Đang xem" : ""}
                        </button>
                        <button type="button" className="mod-btn-back" disabled={documentBusy}
                          onClick={() => { setRenamingUrl(item.url); setRenamedName(item.name); setDocumentError(""); }}>
                          Sửa tên
                        </button>
                        <button type="button" className="btn-modal-delete" disabled={documentBusy}
                          onClick={() => void removeDocument(item.url, item.name)}>Xóa</button>
                      </li>
                    ))}
                  </ul>
                  {renamingUrl && (
                    <form className="mod-vocab-document-rename" onSubmit={renameDocument}>
                      <label htmlFor="vocab-document-rename">Tên tài liệu mới</label>
                      <input id="vocab-document-rename" className="modal-input" required maxLength={200} value={renamedName}
                        disabled={documentBusy} onChange={(event) => setRenamedName(event.target.value)} />
                      <button type="submit" className="mod-btn-add" disabled={documentBusy}>Lưu tên</button>
                      <button type="button" className="mod-btn-back" disabled={documentBusy}
                        onClick={() => { setRenamingUrl(""); setRenamedName(""); }}>Hủy</button>
                    </form>
                  )}
                </div>
              )}
              <div className="mod-vocab-pdf-viewer">
                <div className="mod-vocab-document-toolbar">
                  {documents.length > 1 ? (
                    <select
                      aria-label="Chọn tài liệu PDF"
                      className="mod-toolbar-select"
                      value={documentIndex}
                      onChange={(event) => setDocumentIndex(Number(event.target.value))}
                    >
                      {documents.map((item, index) => (
                        <option key={item.url} value={index}>{item.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  <strong>{document.name}</strong>
                </div>
                <iframe
                  key={document.url}
                  title={`Tài liệu ${lesson.title}`}
                  className="mod-vocab-pdf-frame"
                  src={getPdfPreviewUrl(document.url)}
                  referrerPolicy="no-referrer"
                />
                <p className="mod-vocab-pdf-hint">
                  Nếu PDF không hiển thị, hãy mở trong tab mới và kiểm tra quyền truy cập file trên
                  Cloudinary.
                </p>
              </div>
              </>
            ) : (
              <div className="admin-empty-state">
                <h3 className="admin-empty-title">Chưa có tài liệu PDF</h3>
                <p className="admin-empty-desc">
                  {readOnly
                    ? "Bài học này chưa có tài liệu PDF được cung cấp."
                    : "Bấm “Thêm tài liệu PDF” để tải tài liệu lên bài học này."}
                </p>
              </div>
            )}
          </>
        ) : readOnly ? (
          <StudentVocabularyExerciseTab
            key={lesson.id}
            lessonId={lesson.id}
            onBack={() => selectTab("document")}
          />
        ) : (
          <VocabularyExerciseTab
            key={lesson.id}
            lessonId={lesson.id}
            onBack={() => selectTab("document")}
          />
        )}
      </section>
    </div>
  );
}
