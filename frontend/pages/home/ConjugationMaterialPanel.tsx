import { useState } from "react";
import {
  parseGroupMaterial,
  parseMaterialContent,
  VERB_GROUP_INFO,
  VERB_GROUPS,
  type VerbGroupKey,
} from "../../utils/conjugationMaterial";

const KEY_BY_NUMBER: Record<number, VerbGroupKey> = { 1: "group1", 2: "group2", 3: "group3" };

/** “Cách chia thể …” (3.6.25 / panel “Cách chia” của 3.6.26): tab Nhóm 1/2/3 + bảng Quy tắc / Ví dụ / Kết quả. */
export function ConjugationMaterialPanel({
  title,
  materialContent,
  initialGroup = 0,
  compact = false,
}: {
  title: string;
  materialContent: string;
  initialGroup?: number;
  compact?: boolean;
}) {
  const [active, setActive] = useState<VerbGroupKey>(KEY_BY_NUMBER[initialGroup] ?? "group1");
  const groups = parseMaterialContent(materialContent);
  const hasAny = VERB_GROUPS.some(({ key }) => groups[key].trim());
  // Dữ liệu cũ không theo mẫu 【Nhóm …】: hiển thị nguyên văn.
  const legacy = !hasAny && materialContent.trim();
  const material = parseGroupMaterial(groups[active]);
  // Quy tắc không kèm ví dụ (hoặc ghi chú ngoại lệ) vẫn được hiển thị dưới bảng.
  const usedRules = new Set(material.rows.map((row) => row.rule));
  const leftover = material.notes.filter((note) => !usedRules.has(note.replace(/[:：]$/, "")));

  return (
    <section
      className={`cj-material${compact ? " is-compact" : ""}`}
      aria-label={title}
    >
      <h2>{title}</h2>
      {!hasAny && !legacy ? (
        <p className="cj-muted">Chưa có tài liệu cho thể chia này.</p>
      ) : legacy ? (
        <p
          className="cj-pre"
          lang="ja"
        >
          {materialContent}
        </p>
      ) : (
        <>
          <div
            className="cj-group-tabs"
            role="tablist"
            aria-label="Nhóm động từ"
          >
            {VERB_GROUPS.map(({ key }, index) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active === key}
                className={active === key ? "is-active" : undefined}
                onClick={() => setActive(key)}
              >
                Nhóm {index + 1}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            <p className="cj-group-info">{VERB_GROUP_INFO[active]}</p>
            {!groups[active].trim() ? (
              <p className="cj-muted">Chưa có quy tắc cho nhóm này.</p>
            ) : (
              <>
                {material.rows.length > 0 ? (
                  <div className="cj-table-wrap">
                    <table className="cj-table">
                      <thead>
                        <tr>
                          <th scope="col">Quy tắc</th>
                          <th scope="col">Ví dụ</th>
                          <th scope="col">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {material.rows.map((row, i) => (
                          <tr key={`${row.example}-${i}`}>
                            <td>{row.rule}</td>
                            <td lang="ja">{row.example}</td>
                            <td lang="ja">{row.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {leftover.length > 0 && (
                  <ul className="cj-notes">
                    {leftover.map((note, i) => (
                      <li
                        key={i}
                        lang="ja"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
