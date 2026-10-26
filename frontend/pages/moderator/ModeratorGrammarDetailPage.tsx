import { useEffect, useState } from "react";
import { getGrammarById, getGrammarsByLesson, type GrammarItem } from "../../api/grammarApi";
import type { LessonSummary } from "../../api/lessonApi";
import { GrammarCreateModal } from "./GrammarCreateModal";

interface ModeratorGrammarDetailPageProps {
  grammarId: number | null;
  courseName: string;
  chapterNo: number;
  lesson: LessonSummary;
  onBack: () => void;
  onSelectGrammar: (grammarId: number) => void;
}

export function ModeratorGrammarDetailPage({
  grammarId,
  courseName,
  chapterNo,
  lesson,
  onBack,
  onSelectGrammar,
}: ModeratorGrammarDetailPageProps) {
  const [grammarOptions, setGrammarOptions] = useState<GrammarItem[]>([]);
  const [grammar, setGrammar] = useState<GrammarItem | null>(null);
  const [selectedGrammarId, setSelectedGrammarId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const options = await getGrammarsByLesson(lesson.id);
        if (!active) return;
        setGrammarOptions(options);
        const selected = options.find((item) => item.id === grammarId) ?? options[0];
        if (!selected) {
          setSelectedGrammarId(null);
          setGrammar(null);
          return;
        }
        setSelectedGrammarId(selected.id);
        const detail = await getGrammarById(selected.id);
        if (active) setGrammar(detail);
      } catch {
        if (active) {
          setGrammar(null);
          setError("Không thể tải chi tiết ngữ pháp. Vui lòng thử lại.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [lesson.id, grammarId, reloadKey]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  return (
    <div className="admin-page-container">
      <div className="mod-chapter-back-row">
        <button type="button" className="mod-btn-back" onClick={onBack}>
          <span>←</span> Quay lại danh sách bài học
        </button>
        <span className="mod-chapter-breadcrumb-pill">
          {courseName} / Chương {chapterNo} / Ngữ pháp / Bài {lesson.lessonNo}: {lesson.title}
        </span>
      </div>

      <div className="admin-page-header">
        <div className="mod-header-action-row" style={{ width: "100%" }}>
          <div className="admin-header-titles">
            <h2 className="admin-main-title">Chi tiết ngữ pháp</h2>
            <p className="admin-main-subtitle">Thông tin mẫu ngữ pháp thuộc bài học này.</p>
          </div>
          {!loading && !error && (grammar ? (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" className="mod-btn-add" style={{ backgroundColor: "#2563eb" }} disabled title="Chức năng chỉnh sửa sẽ được triển khai sau">Chỉnh sửa</button>
              <button type="button" className="mod-btn-add" style={{ backgroundColor: "#dc2626" }} disabled title="Chức năng xóa sẽ được triển khai sau">Xóa</button>
            </div>
          ) : (
            <button type="button" className="mod-btn-add" style={{ backgroundColor: "#2563eb" }} onClick={() => setIsCreateOpen(true)}>
              Thêm ngữ pháp
            </button>
          ))}
        </div>
      </div>

      {success && <p role="status" style={{ color: "#166534", fontWeight: 600 }}>{success}</p>}
      {grammarOptions.length > 1 && (
        <div className="mod-section-toolbar">
          <label htmlFor="grammar-select" style={{ fontWeight: 600 }}>Mẫu ngữ pháp:</label>
          <select
            id="grammar-select"
            className="mod-toolbar-select"
            value={selectedGrammarId ?? ""}
            onChange={(event) => onSelectGrammar(Number(event.target.value))}
          >
            {grammarOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.structureName}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-state">
          <div className="admin-loading-spinner" />
          <p className="admin-loading-text">Đang tải chi tiết ngữ pháp...</p>
        </div>
      ) : error ? (
        <div className="admin-empty-state">
          <span style={{ fontSize: "2rem" }}>⚠️</span>
          <h3 className="admin-empty-title">Không thể hiển thị ngữ pháp</h3>
          <p className="admin-empty-desc">{error}</p>
          <button type="button" className="mod-btn-add" style={{ backgroundColor: "#2563eb" }} onClick={() => setReloadKey((key) => key + 1)}>
            Thử lại
          </button>
        </div>
      ) : grammar ? (
        <section className="admin-table-card" style={{ padding: "28px", maxWidth: "1000px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <p style={{ color: "#64748b", margin: "0 0 8px", fontWeight: 600 }}>CẤU TRÚC NGỮ PHÁP</p>
              <h1 style={{ color: "#1d4ed8", margin: 0 }}>{grammar.structureName}</h1>
              <p style={{ color: "#0f172a", fontSize: "1.15rem", fontWeight: 600, marginBottom: 0 }}>{grammar.meaningVi}</p>
            </div>
            <span className={`status-badge ${grammar.status === "PUBLISHED" ? "active" : grammar.status === "DRAFT" ? "pending" : "rejected"}`}>
              {grammar.status}
            </span>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "24px", paddingTop: "22px" }}>
            <h3>Giải thích cách dùng</h3>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#334155" }}>{grammar.usageExplanation || "Chưa có giải thích."}</p>
          </div>

          <div style={{ background: "#f8fafc", borderLeft: "4px solid #2563eb", borderRadius: "8px", padding: "16px 20px", marginTop: "20px" }}>
            <h3 style={{ marginTop: 0 }}>Ví dụ</h3>
            <p lang="ja" style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>{grammar.exampleJp || "Chưa có ví dụ tiếng Nhật."}</p>
            <p style={{ color: "#64748b", margin: 0 }}>{grammar.exampleVi || "Chưa có bản dịch tiếng Việt."}</p>
          </div>

          <div style={{ marginTop: "24px" }}>
            <h3>Video bài giảng</h3>
            {grammar.videoUrl ? (
              <div>
                <video controls preload="metadata" src={grammar.videoUrl} style={{ display: "block", width: "100%", maxHeight: "520px", background: "#0f172a", borderRadius: "10px" }}>
                  Trình duyệt không hỗ trợ phát video.
                </video>
                {grammar.videoDurationSec != null && <p style={{ color: "#64748b" }}>Thời lượng: {Math.floor(grammar.videoDurationSec / 60)}:{String(grammar.videoDurationSec % 60).padStart(2, "0")}</p>}
              </div>
            ) : (
              <p style={{ color: "#64748b" }}>Mẫu ngữ pháp này chưa có video.</p>
            )}
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "24px", paddingTop: "16px", color: "#64748b", display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <span>Thứ tự hiển thị: <strong>{grammar.displayOrder}</strong></span>
            {grammar.createdAt && <span>Ngày tạo: {new Date(grammar.createdAt).toLocaleString("vi-VN")}</span>}
            {grammar.updatedAt && <span>Cập nhật: {new Date(grammar.updatedAt).toLocaleString("vi-VN")}</span>}
          </div>
        </section>
      ) : (
        <div className="admin-empty-state">
          <h3 className="admin-empty-title">Bài học chưa có mẫu ngữ pháp</h3>
          <p className="admin-empty-desc">Bấm Thêm ngữ pháp để tạo mẫu đầu tiên.</p>
        </div>
      )}
      {isCreateOpen && (
        <GrammarCreateModal
          lessonId={lesson.id}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(created) => {
            setIsCreateOpen(false);
            setGrammar(created);
            setGrammarOptions((items) => [...items, created]);
            setSuccess(`Đã thêm mẫu ngữ pháp "${created.structureName}" thành công!`);
            onSelectGrammar(created.id);
            setReloadKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
}
