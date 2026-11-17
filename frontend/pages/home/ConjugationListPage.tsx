import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getConjugationForm, listConjugationForms } from "../../api/studentConjugationApi";
import { ConjugationMaterialPanel } from "./ConjugationMaterialPanel";
import { ConjugationPracticeSetup, type PracticeSetup } from "./ConjugationPracticeSetup";
import "./Conjugation.css";

/**
 * 3.6.25 Conjugation List (UC-21, UC-22). URL: ?q=&form= (xem cách chia) &practice= (mở hộp thoại luyện tập).
 * Xem cách chia không lọc theo nhóm / độ khó; nhóm, độ khó và hình thức chỉ chọn khi bấm "Luyện tập" (UC-23).
 */
export function ConjugationListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get("form")) || null;
  const practiceId = Number(params.get("practice")) || null;
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [keyword, setKeyword] = useState(search);

  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const update = (values: Record<string, string | null>) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(values)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  useEffect(() => update({ q: keyword || null }), [keyword]); // eslint-disable-line react-hooks/exhaustive-deps

  const forms = useQuery({
    queryKey: ["conjugation-forms", keyword, 0, "ALL"],
    queryFn: ({ signal }) => listConjugationForms(keyword, 0, "ALL", signal),
  });
  const detail = useQuery({
    queryKey: ["conjugation-form", selectedId, 0, "ALL"],
    queryFn: ({ signal }) => getConjugationForm(selectedId!, 0, "ALL", signal),
    enabled: !!selectedId,
  });

  // "Luyện tập" → hộp thoại chọn nhóm, độ khó, hình thức → "Bắt đầu" mới sang màn luyện tập
  const openPractice = (formId: number) => update({ practice: String(formId) });
  const startPractice = (formId: number, setup: PracticeSetup) =>
    navigate(
      `/conjugations/${formId}/practice?group=${setup.group}&difficulty=${setup.difficulty}&mode=${setup.mode}`,
    );
  const progressText = (attempts: number, best: number | null, passed: boolean) =>
    attempts === 0
      ? "Chưa luyện tập"
      : `${attempts} lượt, cao nhất ${Math.round(Number(best ?? 0))}%${passed ? " ✓" : ""}`;

  return (
    <div className="sg-page cj-page">
      <header className="sg-header">
        <h1>Danh sách thể chia</h1>
        <p className="sg-breadcrumb">Chọn thể chia để xem cách chia hoặc luyện tập.</p>
      </header>

      <div className="cj-toolbar">
        <input
          type="search"
          aria-label="Tìm thể chia"
          placeholder="Tìm thể chia…"
          maxLength={100}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className={`cj-layout${selectedId ? " has-detail" : ""}`}>
        <div>
          {forms.isLoading ? (
            <div
              className="admin-loading-state"
              role="status"
            >
              Đang tải thể chia...
            </div>
          ) : forms.isError ? (
            <div
              className="admin-empty-state"
              role="alert"
            >
              <p>Không tải được dữ liệu, hãy thử lại sau.</p>
              <button
                type="button"
                className="mod-btn-back"
                onClick={() => forms.refetch()}
              >
                Thử lại
              </button>
            </div>
          ) : !forms.data?.length ? (
            <div className="admin-empty-state">
              {keyword ? "Không tìm thấy thể chia phù hợp." : "Chưa có dữ liệu được tạo."}
            </div>
          ) : (
            <ul className="cj-cards">
              {forms.data.map((form) => (
                <li
                  key={form.id}
                  className={`cj-card${form.id === selectedId ? " is-selected" : ""}`}
                >
                  <div className="cj-card-head">
                    <h2>
                      {form.nameVi}{" "}
                      <span
                        lang="ja"
                        className="cj-card-jp"
                      >
                        {form.nameJp}
                      </span>
                    </h2>
                    <span className={`cj-badge${form.passed ? " is-done" : ""}`}>
                      {progressText(form.attemptCount, form.bestScore, form.passed)}
                    </span>
                  </div>
                  {form.description && <p className="cj-card-desc">{form.description}</p>}
                  <p className="cj-card-meta">
                    {form.questionCount > 0
                      ? `${form.questionCount} câu luyện tập, mỗi lượt ${Math.min(form.questionsPerPractice, form.questionCount)} câu ngẫu nhiên`
                      : "Chưa có câu luyện tập"}
                  </p>
                  <div className="cj-card-actions">
                    <button
                      type="button"
                      className="sg-btn sg-btn-secondary"
                      aria-expanded={form.id === selectedId}
                      onClick={() => update({ form: form.id === selectedId ? null : String(form.id) })}
                    >
                      Xem cách chia
                    </button>
                    <button
                      type="button"
                      className="sg-btn sg-btn-primary"
                      disabled={form.questionCount === 0}
                      onClick={() => openPractice(form.id)}
                    >
                      Luyện tập
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedId && (
          <aside className="cj-detail">
            {detail.isLoading ? (
              <p role="status">Đang tải cách chia...</p>
            ) : detail.isError || !detail.data ? (
              <div role="alert">
                <p>Không tải được dữ liệu, hãy thử lại sau.</p>
                <button
                  type="button"
                  className="mod-btn-back"
                  onClick={() => detail.refetch()}
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <ConjugationMaterialPanel
                  key={detail.data.id}
                  title={`Cách chia ${detail.data.nameVi} (${detail.data.nameJp})`}
                  materialContent={detail.data.materialContent}
                />
                <section
                  className="cj-summary"
                  aria-label="Luyện tập"
                >
                  <p>
                    {detail.data.questionCountByGroup["0"] ?? 0} câu luyện tập, mỗi lượt lấy ngẫu nhiên{" "}
                    {Math.min(detail.data.questionsPerPractice, detail.data.questionCountByGroup["0"] ?? 0)} câu. Chọn
                    nhóm động từ, độ khó và hình thức khi bấm "Luyện tập".
                  </p>
                  <p>{progressText(detail.data.attemptCount, detail.data.bestScore, detail.data.passed)}</p>
                  <button
                    type="button"
                    className="sg-btn sg-btn-primary"
                    disabled={!detail.data.questionCountByGroup["0"]}
                    onClick={() => openPractice(detail.data!.id)}
                  >
                    Luyện tập
                  </button>
                </section>
                <button
                  type="button"
                  className="mod-btn-back"
                  onClick={() => update({ form: null })}
                >
                  Đóng
                </button>
              </>
            )}
          </aside>
        )}
      </div>

      {practiceId && (
        <ConjugationPracticeSetup
          formId={practiceId}
          onCancel={() => update({ practice: null })}
          onStart={(setup) => startPractice(practiceId, setup)}
        />
      )}
    </div>
  );
}
