import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getLessonById, type LessonSummary } from "../../api/lessonApi";
import { parseLessonDocuments } from "../../utils/lessonDocuments";
import { ModeratorVocabularyListPage } from "./ModeratorVocabularyListPage";
import { VocabularyMiniTestsTab } from "./VocabularyMiniTestsTab";
import "./ModeratorContent.css";

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

export function ModeratorVocabularyLessonPage({ lessonId, chapterId, courseName, chapterNo, chapterTitle, onBack, readOnly = false, publishedLesson }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lesson, setLesson] = useState<LessonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [documentIndex, setDocumentIndex] = useState(0);
  const selectedTab = searchParams.get("vocabTab");
  const tab = selectedTab === "words" || (!readOnly && selectedTab === "exercise") ? selectedTab : "document";

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setLesson(null); setDocumentIndex(0);
    if (!Number.isSafeInteger(lessonId) || lessonId < 1) {
      setError("Đường dẫn bài học không hợp lệ."); setLoading(false);
      return;
    }
    const request = readOnly
      ? publishedLesson?.id === lessonId && publishedLesson.chapterId === chapterId && publishedLesson.status === "PUBLISHED"
        ? Promise.resolve(publishedLesson) : Promise.reject(new Error("Lesson unavailable"))
      : getLessonById(lessonId);
    request.then(data => {
      if (!active) return;
      if (data.chapterId !== chapterId || data.skillType !== "VOCABULARY") {
        setError("Bài học không thuộc phần từ vựng của chương này.");
      } else setLesson(data);
    }).catch(() => { if (active) setError("Không thể tải bài học. Vui lòng thử lại."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId, chapterId, retry, readOnly, publishedLesson]);

  const selectTab = (value: "document" | "exercise" | "words") => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (value === "document") next.delete("vocabTab");
      else next.set("vocabTab", value);
      return next;
    }, { replace: true });
  };

  if (loading) return <div className="admin-loading-state" role="status"><div className="admin-loading-spinner" /><p>Đang tải bài học từ vựng...</p></div>;
  if (error || !lesson) return <div className="admin-page-container"><button className="mod-btn-back" onClick={onBack}>← Danh sách bài học</button><div className="admin-empty-state" role="alert"><h3>Không thể mở bài học</h3><p>{error}</p><button className="mod-btn-add" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div></div>;

  if (tab === "words") return <ModeratorVocabularyListPage
    lesson={lesson} courseName={courseName} chapterNo={chapterNo} chapterTitle={chapterTitle}
    skillLabel="Từ vựng" skillIcon="📕" skillColor="#0d9488" backLabel="bài học"
    onBack={() => selectTab("document")}
    readOnly={readOnly}
  />;

  const documents = parseLessonDocuments(lesson.documents);
  const document = documents[documentIndex];

  return <div className="admin-page-container mod-vocab-lesson">
    <div className="mod-chapter-back-row">
      <button type="button" className="mod-btn-back" onClick={onBack}>← Quay lại danh sách bài học</button>
      <span className="mod-chapter-breadcrumb-pill">{courseName} / Chương {chapterNo} / Từ vựng / Bài {lesson.lessonNo}</span>
    </div>
    <div className="admin-page-header"><div className="mod-header-action-row">
      <div className="admin-header-titles">
        <h2 className="admin-main-title">📕 {lesson.title}</h2>
        <p className="admin-main-subtitle">{lesson.description || `Bài học từ vựng ${lesson.lessonNo}`}</p>
      </div>
      <button type="button" className="mod-btn-back" onClick={() => selectTab("words")}>{readOnly ? "Danh sách từ vựng" : "Quản lý từ vựng"}</button>
    </div></div>
    <div className="mod-vocab-lesson-tabs" role="tablist" aria-label="Nội dung bài học" onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? "document" : event.key === "End" ? "exercise" : tab === "document" ? "exercise" : "document";
      selectTab(next);
      window.document.getElementById(`vocab-${next}-tab`)?.focus();
    }}>
      <button id="vocab-document-tab" type="button" role="tab" tabIndex={tab === "document" ? 0 : -1} aria-selected={tab === "document"} aria-controls="vocab-lesson-panel" className={tab === "document" ? "active" : ""} onClick={() => selectTab("document")}>📄 Tài liệu PDF</button>
      {!readOnly && <button id="vocab-exercise-tab" type="button" role="tab" tabIndex={tab === "exercise" ? 0 : -1} aria-selected={tab === "exercise"} aria-controls="vocab-lesson-panel" className={tab === "exercise" ? "active" : ""} onClick={() => selectTab("exercise")}>✎ Mini-test / Bài tập</button>}
    </div>
    <section id="vocab-lesson-panel" role="tabpanel" aria-labelledby={tab === "document" ? "vocab-document-tab" : "vocab-exercise-tab"} className="admin-table-card mod-vocab-document-card">
      {tab === "document" ? document ? <>
        <div className="mod-vocab-document-toolbar">
          {documents.length > 1 ? <select aria-label="Chọn tài liệu PDF" className="mod-toolbar-select" value={documentIndex} onChange={event => setDocumentIndex(Number(event.target.value))}>{documents.map((item, index) => <option key={item.url} value={index}>{item.name}</option>)}</select> : <strong>{document.name}</strong>}
          <a href={document.url} target="_blank" rel="noopener noreferrer" className="mod-btn-back">Mở PDF trong tab mới ↗</a>
        </div>
        <iframe key={document.url} title={`Tài liệu ${lesson.title}`} className="mod-vocab-pdf-frame" src={document.url} referrerPolicy="no-referrer" />
        <p className="mod-vocab-pdf-hint">Nếu PDF không hiển thị, hãy mở trong tab mới và kiểm tra quyền truy cập file trên Cloudinary.</p>
      </> : <div className="admin-empty-state"><h3 className="admin-empty-title">Chưa có tài liệu PDF</h3><p className="admin-empty-desc">{readOnly ? "Bài học này chưa có tài liệu PDF được cung cấp." : "Quay lại danh sách bài học, chọn “Sửa” và nhập URL tài liệu PDF cho bài này."}</p><button className="mod-btn-back" onClick={onBack}>Về danh sách bài học</button></div>
        : <VocabularyMiniTestsTab key={lesson.id} lessonId={lesson.id} />}
    </section>
  </div>;
}
