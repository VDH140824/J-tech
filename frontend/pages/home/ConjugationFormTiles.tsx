import { useQuery } from "@tanstack/react-query";
import { listConjugationForms, type ConjugationFormCard } from "../../api/studentConjugationApi";

/** Biểu tượng theo tên thể (thứ tự quan trọng: ません/ました trước ます, 使役受身 trước 使役/受身). */
const ICONS: ReadonlyArray<[RegExp, string]> = [
  [/使役受身/, "🔄"],
  [/使役/, "👥"],
  [/受身/, "👤"],
  [/可能/, "⭐"],
  [/命令/, "📢"],
  [/禁止/, "🚫"],
  [/意向/, "💭"],
  [/ません/, "❌"],
  [/ました/, "📅"],
  [/ます/, "📄"],
  [/辞書/, "📖"],
  [/ない/, "✖️"],
  [/ば/, "🌿"],
  [/て/, "🔗"],
  [/た/, "🕒"],
];

export function formIcon(form: Pick<ConjugationFormCard, "nameJp" | "nameVi">) {
  const text = `${form.nameJp} ${form.nameVi}`;
  return ICONS.find(([pattern]) => pattern.test(text))?.[1] ?? "📝";
}

/** Lưới các thể chia (giống thanh chọn thể ở đầu màn luyện tập). */
export function ConjugationFormTiles({
  activeId,
  onSelect,
}: {
  activeId: number | null;
  onSelect: (form: ConjugationFormCard) => void;
}) {
  const forms = useQuery({
    queryKey: ["conjugation-forms", "", 0, "ALL"],
    queryFn: ({ signal }) => listConjugationForms("", 0, "ALL", signal),
  });

  if (forms.isLoading)
    return (
      <p className="cj2-muted" role="status">
        Đang tải thể chia...
      </p>
    );
  if (forms.isError)
    return (
      <div className="cj2-empty" role="alert">
        <p>Không tải được dữ liệu, hãy thử lại sau.</p>
        <button type="button" className="cj2-btn cj2-btn-light" onClick={() => forms.refetch()}>
          Thử lại
        </button>
      </div>
    );
  if (!forms.data?.length) return <div className="cj2-empty">Chưa có thể chia nào.</div>;

  return (
    <ul className="cj2-tiles" aria-label="Chọn thể chia">
      {forms.data.map((form) => {
        const active = form.id === activeId;
        const empty = form.questionCount === 0;
        return (
          <li key={form.id}>
            <button
              type="button"
              className={`cj2-tile${active ? " is-active" : ""}`}
              aria-pressed={active}
              disabled={empty}
              title={empty ? "Chưa có câu luyện tập" : form.description ?? undefined}
              onClick={() => onSelect(form)}
            >
              <span className="cj2-tile-icon" aria-hidden="true">
                {formIcon(form)}
              </span>
              <span className="cj2-tile-text">
                <strong>{form.nameVi}</strong>
                <small lang="ja">({form.nameJp})</small>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
