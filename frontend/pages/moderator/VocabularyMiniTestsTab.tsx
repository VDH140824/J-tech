import { useEffect, useState, type FormEvent } from "react";
import { getVocabularies, type VocabularyItem } from "../../api/vocabularyApi";
import { generateMiniTest, getMiniTest, getMiniTests, miniTestError, type MiniTestInput, type VocabularyMiniTest } from "../../api/vocabularyMiniTestApi";
import { VocabularyMiniTestPreview } from "./VocabularyMiniTestPreview";
import "./VocabularyMiniTests.css";

type Settings = Omit<MiniTestInput, "questions">;
const statusNames = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", ARCHIVED: "Đã lưu trữ" };
export function VocabularyMiniTestsTab({ lessonId }: { lessonId: number }) {
  const [test, setTest] = useState<VocabularyMiniTest | null>(null);
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState<VocabularyMiniTest | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<Settings>({ title: "Mini-test từ vựng", description: "Chọn định nghĩa đúng cho mỗi từ vựng.", durationMinutes: 10, passingScore: 70, status: "DRAFT" });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError("");
    Promise.all([getMiniTests(lessonId, controller.signal), getVocabularies(`/lessons/${lessonId}/vocabularies`, controller.signal)])
      .then(([tests, vocabulary]) => {
        if (!active) return;
        if (tests.length > 1) { setError("Bài này có nhiều mini-test cũ. Cần xử lý dữ liệu cũ trước khi áp dụng một mini-test mỗi bài."); setTest(null); return; }
        const existing = tests[0] ?? null;
        setTest(existing);
        setWords(vocabulary.filter(word => word.status === "PUBLISHED" || word.status === "DRAFT"));
        if (existing) setSettings({ title: existing.title, description: existing.description || "", durationMinutes: existing.durationMinutes, passingScore: existing.passingScore, status: existing.status });
      }).catch(failure => { if (active) setError(miniTestError(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [lessonId, reload]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await generateMiniTest(lessonId, settings);
      setTest(saved); setNotice(`Đã lưu mini-test với ${saved.questionCount} câu từ đúng danh sách từ vựng của bài.`);
    } catch (failure) { setError(miniTestError(failure)); }
    finally { setBusy(false); }
  };
  const openPreview = async () => {
    if (!test || busy) return; setBusy(true); setError("");
    try { setPreview(await getMiniTest(test.id)); }
    catch (failure) { setError(miniTestError(failure)); }
    finally { setBusy(false); }
  };
  if (preview) return <VocabularyMiniTestPreview test={preview} onBack={() => setPreview(null)} />;
  if (loading) return <div className="admin-loading-state" role="status"><div className="admin-loading-spinner" /><p>Đang tải mini-test và từ vựng của bài...</p></div>;
  const hasHistory = !!test && test.attemptCount > 0;
  const canGenerate = words.length >= 2 && !hasHistory;
  return <div className="mod-mini-tab">
    <div className="mod-mini-heading"><div><h3>Mini-test của bài học</h3><p>Mỗi bài có một mini-test. Mỗi từ được gán cho bài tạo thành một câu; đáp án là các định nghĩa được trộn ngẫu nhiên.</p></div>{test && <button className="mod-btn-back" disabled={busy} onClick={() => void openPreview()}>Làm thử</button>}</div>
    {error && <div className="mod-mini-error" role="alert">{error}<button type="button" className="btn-modal-cancel" disabled={busy} onClick={() => setReload(value => value + 1)}>Tải lại</button></div>}
    {notice && <div className="mod-mini-success" role="status">✓ {notice}</div>}
    {test && <div className="mod-mini-info"><span>{statusNames[test.status]}</span><span>{test.questionCount} câu</span><span>{test.attemptCount} lượt làm</span></div>}
    <details className="mod-mini-source"><summary>{words.length} từ vựng được gán cho bài này</summary><div className="table-responsive"><table className="admin-users-table"><thead><tr><th>Thứ tự</th><th>Thuật ngữ</th><th>Cách đọc</th><th>Định nghĩa</th></tr></thead><tbody>{words.map((word, index) => <tr key={word.id}><td>{index + 1}</td><td>{word.word}</td><td>{word.reading}</td><td>{word.meaningVi}</td></tr>)}</tbody></table></div></details>
    {!canGenerate && <p className="mod-mini-error">{hasHistory ? "Mini-test đã có lượt làm nên không thể tạo lại câu hỏi, để giữ nguyên kết quả cũ." : "Cần ít nhất hai từ có định nghĩa khác nhau để tạo đáp án trắc nghiệm. Số câu luôn bằng số từ được gán cho bài."}</p>}
    <form onSubmit={save} className="mod-mini-form mod-mini-generated-form">
      <fieldset className="mod-content-fieldset" disabled={busy || hasHistory}>
        <div className="modal-grid-2">
          <div className="modal-field-group mod-content-wide"><label className="modal-label" htmlFor="generated-mini-title">Tên mini-test *</label><input id="generated-mini-title" className="modal-input" required maxLength={200} value={settings.title} onChange={event => setSettings({ ...settings, title: event.target.value })} /></div>
          <div className="modal-field-group"><label className="modal-label" htmlFor="generated-mini-duration">Thời gian (phút)</label><input id="generated-mini-duration" className="modal-input" type="number" min={5} max={30} required value={settings.durationMinutes} onChange={event => setSettings({ ...settings, durationMinutes: Number(event.target.value) })} /></div>
          <div className="modal-field-group"><label className="modal-label" htmlFor="generated-mini-score">Điểm đạt / 100</label><input id="generated-mini-score" className="modal-input" type="number" min={0} max={100} step="0.01" required value={settings.passingScore} onChange={event => setSettings({ ...settings, passingScore: Number(event.target.value) })} /></div>
          <div className="modal-field-group"><label className="modal-label" htmlFor="generated-mini-status">Trạng thái</label><select id="generated-mini-status" className="modal-input" value={settings.status} onChange={event => setSettings({ ...settings, status: event.target.value as Settings["status"] })}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="modal-field-group"><label className="modal-label" htmlFor="generated-mini-instructions">Hướng dẫn</label><textarea id="generated-mini-instructions" className="modal-textarea" maxLength={10000} rows={2} value={settings.description} onChange={event => setSettings({ ...settings, description: event.target.value })} /></div>
        </div>
      </fieldset>
      <p className="mod-mini-list-note">Câu hỏi và đáp án lấy từ DB, không nhập tay. Sau khi thay đổi từ vựng của bài, hãy cập nhật lại mini-test trước khi cho học sinh làm.</p>
      <div className="modal-actions-row"><button type="submit" className="btn-modal-submit" disabled={busy || !canGenerate}>{busy ? "Đang lưu..." : test ? "Cập nhật từ danh sách từ vựng" : `Tạo mini-test từ ${words.length} từ`}</button></div>
    </form>
  </div>;
}
