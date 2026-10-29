import { useEffect, useState, type FormEvent } from "react";
import { archiveChapterTest, getChapterTest, gradeChapterTestPreview, saveChapterTest, type ChapterBankQuestion, type ChapterTestInput } from "../../api/vocabularyChapterTestApi";
import { miniTestError, type VocabularyMiniTest } from "../../api/vocabularyMiniTestApi";
import { VocabularyMiniTestPreview } from "./VocabularyMiniTestPreview";
import "./VocabularyMiniTests.css";

interface Props { chapterId: number; chapterNo: number; courseName: string; onBack: () => void; }
type Settings = Omit<ChapterTestInput, "questionIds">;
const difficultyNames = { EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó" };
export function VocabularyChapterTestPage({ chapterId, chapterNo, courseName, onBack }: Props) {
  const [bank, setBank] = useState<ChapterBankQuestion[]>([]);
  const [test, setTest] = useState<VocabularyMiniTest | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [settings, setSettings] = useState<Settings>({ title: `Bài test Vocab chương ${chapterNo}`, description: "", durationMinutes: 20, passingScore: 70, status: "DRAFT" });
  const [search, setSearch] = useState("");
  const [lessonFilter, setLessonFilter] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    getChapterTest(chapterId, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setBank(data.bank); setTest(data.test); setSelected(new Set(data.test?.questions.map(question => question.id) || []));
      if (data.test) setSettings({ title: data.test.title, description: data.test.description || "", durationMinutes: data.test.durationMinutes, passingScore: data.test.passingScore, status: data.test.status });
    }).catch(failure => { if (!controller.signal.aborted) setError(miniTestError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [chapterId, reload]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (!selected.size) { setError("Hãy chọn ít nhất một câu hỏi từ ngân hàng đề."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await saveChapterTest(chapterId, { ...settings, questionIds: [...selected] });
      setTest(saved); setNotice("Đã lưu bài test chương từ các câu hỏi đã chọn.");
    } catch (failure) { setError(miniTestError(failure)); }
    finally { setBusy(false); }
  };
  const archive = async () => {
    if (busy) return; setBusy(true); setError("");
    try { await archiveChapterTest(chapterId); setConfirmArchive(false); setNotice("Đã lưu trữ bài test chương."); setReload(value => value + 1); }
    catch (failure) { setError(miniTestError(failure)); }
    finally { setBusy(false); }
  };
  const choose = (ids: number[], checked: boolean) => {
    const next = new Set(selected);
    ids.forEach(id => checked ? next.add(id) : next.delete(id));
    if (next.size > 200) { setError("Một bài test chương tối đa 200 câu hỏi."); return; }
    setSelected(next);
  };
  if (preview && test) return <div className="admin-page-container admin-table-card"><VocabularyMiniTestPreview test={test} onBack={() => setPreview(false)} grade={(_id, answers) => gradeChapterTestPreview(chapterId, answers)} /></div>;
  const locked = busy || !!test?.attemptCount;
  const lessons = [...new Map(bank.map(question => [question.lessonId, { id: question.lessonId, no: question.lessonNo, title: question.lessonTitle }])).values()].sort((left, right) => left.no - right.no);
  const availableIds = new Set(bank.map(question => question.id));
  const missingIds = [...selected].filter(id => !availableIds.has(id));
  const filtered = bank.filter(question => (lessonFilter === "ALL" || String(question.lessonId) === lessonFilter) && (difficulty === "ALL" || question.difficulty === difficulty) && question.content.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  return <div className="admin-page-container">
    <div className="mod-chapter-back-row"><button type="button" className="mod-btn-back" disabled={busy} onClick={onBack}>← Danh sách bài Vocab</button><span className="mod-chapter-breadcrumb-pill">{courseName} / Chương {chapterNo} / Test chương Vocab</span></div>
    <div className="admin-page-header"><div className="admin-header-titles"><h2 className="admin-main-title">Bài test Vocab chương {chapterNo}</h2><p className="admin-main-subtitle">Chọn câu trắc nghiệm từ ngân hàng đề thuộc các bài Vocab trong chương này.</p></div></div>
    {loading ? <div className="admin-loading-state" role="status"><div className="admin-loading-spinner" /><p>Đang tải ngân hàng câu hỏi...</p></div> : <div className="admin-table-card mod-mini-tab">
      {error && <div className="mod-mini-error" role="alert">{error}<button type="button" className="mod-btn-back" disabled={busy} onClick={() => setReload(value => value + 1)}>Tải lại</button></div>}
      {notice && <div className="mod-mini-success" role="status">✓ {notice}</div>}
      {test && <div className="mod-mini-heading"><div className="mod-mini-info"><span>{test.status === "PUBLISHED" ? "Đã xuất bản" : test.status === "ARCHIVED" ? "Đã lưu trữ" : "Bản nháp"}</span><span>{test.questionCount} câu đã lưu</span><span>{test.attemptCount} lượt làm</span></div><button type="button" className="mod-btn-back" disabled={busy} onClick={() => setPreview(true)}>Làm thử bản đã lưu</button></div>}
      {!!test?.attemptCount && <p className="mod-mini-error">Bài đã có lượt làm nên không thể thay đổi câu hỏi hoặc cấu hình. Bạn vẫn có thể xem thử hoặc lưu trữ bài.</p>}
      <form onSubmit={save}>
        <fieldset className="mod-content-fieldset" disabled={locked}>
          <div className="modal-grid-2 mod-mini-settings">
            <div className="modal-field-group mod-content-wide"><label className="modal-label" htmlFor="chapter-test-title">Tên bài test *</label><input id="chapter-test-title" className="modal-input" maxLength={200} required value={settings.title} onChange={event => setSettings({ ...settings, title: event.target.value })} /></div>
            <div className="modal-field-group"><label className="modal-label" htmlFor="chapter-test-duration">Thời gian (phút)</label><input id="chapter-test-duration" className="modal-input" type="number" required min={1} max={180} value={settings.durationMinutes} onChange={event => setSettings({ ...settings, durationMinutes: Number(event.target.value) })} /></div>
            <div className="modal-field-group"><label className="modal-label" htmlFor="chapter-test-score">Điểm đạt / 100</label><input id="chapter-test-score" className="modal-input" type="number" required min={0} max={100} step="0.01" value={settings.passingScore} onChange={event => setSettings({ ...settings, passingScore: Number(event.target.value) })} /></div>
            <div className="modal-field-group"><label className="modal-label" htmlFor="chapter-test-status">Trạng thái</label><select id="chapter-test-status" className="modal-input" value={settings.status} onChange={event => setSettings({ ...settings, status: event.target.value as Settings["status"] })}><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã xuất bản</option><option value="ARCHIVED">Đã lưu trữ</option></select></div>
            <div className="modal-field-group"><label className="modal-label" htmlFor="chapter-test-description">Hướng dẫn</label><textarea id="chapter-test-description" className="modal-textarea" rows={2} maxLength={10000} value={settings.description} onChange={event => setSettings({ ...settings, description: event.target.value })} /></div>
          </div>
          <div className="mod-mini-heading"><div><h3>Ngân hàng đề Vocab</h3><p>Đã chọn {selected.size} câu · Tổng điểm 100, chia đều theo số câu.</p></div><div className="row-actions-group"><button type="button" className="mod-btn-back" onClick={() => choose(filtered.map(question => question.id), true)}>Chọn các câu đang lọc</button><button type="button" className="mod-btn-back" onClick={() => choose(filtered.map(question => question.id), false)}>Bỏ các câu đang lọc</button></div></div>
          <div className="mod-section-toolbar"><div className="mod-toolbar-search"><input aria-label="Tìm câu hỏi Vocab" placeholder="Tìm nội dung câu hỏi..." value={search} onChange={event => setSearch(event.target.value)} /></div><select aria-label="Lọc câu hỏi theo bài" className="mod-toolbar-select" value={lessonFilter} onChange={event => setLessonFilter(event.target.value)}><option value="ALL">Tất cả bài trong chương</option>{lessons.map(lesson => <option value={lesson.id} key={lesson.id}>Bài {lesson.no}: {lesson.title}</option>)}</select><select aria-label="Lọc độ khó" className="mod-toolbar-select" value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="ALL">Tất cả độ khó</option>{Object.entries(difficultyNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {missingIds.length > 0 && <div className="mod-mini-error">Có {missingIds.length} câu đã lưu không còn trong ngân hàng đang hoạt động.<button type="button" className="mod-btn-back" onClick={() => choose(missingIds, false)}>Bỏ các câu không còn khả dụng</button></div>}
          {!filtered.length ? <div className="admin-empty-state"><h3>{bank.length ? "Không có câu hỏi phù hợp bộ lọc" : "Chưa có câu hỏi Vocab trong ngân hàng của chương"}</h3><p>Cần có câu trắc nghiệm đang hoạt động, gắn với bài Vocab của chương để chọn vào bài test.</p></div> : <div className="table-responsive"><table className="admin-users-table"><thead><tr><th>Chọn</th><th>Câu hỏi</th><th>Bài học</th><th>Độ khó</th></tr></thead><tbody>{filtered.map(question => <tr key={question.id}><td><input type="checkbox" aria-label={`Chọn câu ${question.id}`} checked={selected.has(question.id)} onChange={event => choose([question.id], event.target.checked)} /></td><td><p className="mod-mini-prompt">{question.content}</p><details><summary>Xem lựa chọn và đáp án</summary><ul>{question.options.map((option, index) => <li key={index}>{option}{option === question.correctAnswer ? " ✓" : ""}</li>)}</ul></details></td><td>Bài {question.lessonNo}: {question.lessonTitle}</td><td>{difficultyNames[question.difficulty]}</td></tr>)}</tbody></table></div>}
        </fieldset>
        <div className="modal-actions-row"><button type="submit" className="btn-modal-submit" disabled={locked || !selected.size || !!missingIds.length}>{busy ? "Đang lưu..." : "Lưu bài test chương"}</button>{test && <button type="button" className="btn-modal-delete" disabled={busy || test.status === "ARCHIVED"} onClick={() => setConfirmArchive(true)}>Lưu trữ</button>}</div>
      </form>
      {confirmArchive && <div className="mod-mini-confirm" role="region" aria-live="polite"><h4>Lưu trữ bài test chương?</h4><p>Câu hỏi trong ngân hàng và lịch sử làm bài sẽ được giữ lại.</p><div className="modal-actions-row"><button type="button" className="btn-modal-cancel" disabled={busy} onClick={() => setConfirmArchive(false)}>Hủy</button><button type="button" className="btn-modal-delete" disabled={busy} onClick={() => void archive()}>Xác nhận lưu trữ</button></div></div>}
    </div>}
  </div>;
}
